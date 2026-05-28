const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sistema_emprestimos',
    waitForConnections: true,
    connectionLimit: 10
});

const STATUS_EMPRESTIMO_ATIVO = ['Emprestado', 'Fornecido'];
const STATUS_EMPRESTIMO_FINALIZADO = ['Devolvido', 'Danificado', 'Perdido'];
const STATUS_FORNECIDO = 'Fornecido';
const DATA_INDEFINIDA = '9999-12-31';
let colunasEmprestimoVerificadas = false;
let verificandoColunasEmprestimo = false;
let filaVerificacaoEmprestimo = [];

function normalizarCpf(cpf) {
    return String(cpf || '').replace(/\D/g, '');
}

function cpfTemOnzeDigitos(cpf) {
    return normalizarCpf(cpf).length === 11;
}

function hashSenha(senha) {
    return crypto.createHash('sha256').update(String(senha || '')).digest('hex');
}

function garantirTabelaLoginAdministrador() {
    const sqlTabela = `
        CREATE TABLE IF NOT EXISTS Login_Administrador (
            id INT AUTO_INCREMENT PRIMARY KEY,
            id_administrador INT NOT NULL,
            cpf VARCHAR(11) NOT NULL UNIQUE,
            senha_hash VARCHAR(64) NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_administrador) REFERENCES Administrador(id)
        )
    `;

    db.query(sqlTabela, (err) => {
        if (err) {
            console.error('Erro ao preparar tabela Login_Administrador:', err.message);
            return;
        }

        sincronizarLoginsAdministradores();
    });
}

function sincronizarLoginsAdministradores() {
    const sqlAdmins = `
        SELECT u.id, u.cpf, u.senha
        FROM Usuario_Sistema u
        INNER JOIN Administrador a ON a.id = u.id
        WHERE u.cpf IS NOT NULL AND u.senha IS NOT NULL
    `;

    db.query(sqlAdmins, (err, administradores) => {
        if (err) {
            console.error('Erro ao buscar administradores para login:', err.message);
            return;
        }

        if (administradores.length === 0) {
            criarAdministradorPadrao();
            return;
        }

        administradores.forEach((admin) => {
            const cpf = normalizarCpf(admin.cpf);

            if (!cpf) {
                return;
            }

            db.query(
                `
                    INSERT INTO Login_Administrador (id_administrador, cpf, senha_hash)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        id_administrador = VALUES(id_administrador),
                        senha_hash = VALUES(senha_hash)
                `,
                [admin.id, cpf, hashSenha(admin.senha)],
                (insertErr) => {
                    if (insertErr) {
                        console.error('Erro ao sincronizar login de administrador:', insertErr.message);
                    }
                }
            );
        });
    });
}

function criarAdministradorPadrao() {
    const cpfPadrao = '00000000000';
    const senhaPadrao = 'admin123';

    db.query(
        'INSERT INTO Usuario_Sistema (nome, funcao, senha, cpf) VALUES (?, ?, ?, ?)',
        ['Administrador SENAI', 'Administrador', senhaPadrao, cpfPadrao],
        (errUsuario, resultUsuario) => {
            if (errUsuario) {
                console.error('Erro ao criar administrador padrao:', errUsuario.message);
                return;
            }

            const idAdministrador = resultUsuario.insertId;

            db.query(
                'INSERT INTO Administrador (id, status) VALUES (?, ?)',
                [idAdministrador, 'Ativo'],
                (errAdmin) => {
                    if (errAdmin) {
                        console.error('Erro ao vincular administrador padrao:', errAdmin.message);
                        return;
                    }

                    db.query(
                        'INSERT INTO Login_Administrador (id_administrador, cpf, senha_hash) VALUES (?, ?, ?)',
                        [idAdministrador, cpfPadrao, hashSenha(senhaPadrao)],
                        (errLogin) => {
                            if (errLogin) {
                                console.error('Erro ao criar login do administrador padrao:', errLogin.message);
                            }
                        }
                    );
                }
            );
        }
    );
}

function garantirColunasEmprestimo(callback = () => {}) {
    if (colunasEmprestimoVerificadas) {
        callback();
        return;
    }

    filaVerificacaoEmprestimo.push(callback);

    if (verificandoColunasEmprestimo) {
        return;
    }

    verificandoColunasEmprestimo = true;

    const finalizarVerificacao = (err = null) => {
        verificandoColunasEmprestimo = false;
        colunasEmprestimoVerificadas = !err;

        const callbacksPendentes = filaVerificacaoEmprestimo;
        filaVerificacaoEmprestimo = [];
        callbacksPendentes.forEach((callbackPendente) => callbackPendente(err));
    };

    db.query('SHOW COLUMNS FROM Emprestimo', (err, columns) => {
        if (err) {
            console.error('Erro ao verificar colunas de Emprestimo:', err.message);
            finalizarVerificacao(err);
            return;
        }

        const existentes = columns.map((column) => column.Field);
        const colunasNecessarias = [
            { nome: 'data_prevista_devolucao', sql: 'ALTER TABLE Emprestimo ADD COLUMN data_prevista_devolucao DATE NULL AFTER data' },
            { nome: 'data_devolucao', sql: 'ALTER TABLE Emprestimo ADD COLUMN data_devolucao DATE NULL AFTER data_prevista_devolucao' },
            { nome: 'condicoes', sql: 'ALTER TABLE Emprestimo ADD COLUMN condicoes VARCHAR(255) NULL AFTER status' },
            { nome: 'observacao_devolucao', sql: 'ALTER TABLE Emprestimo ADD COLUMN observacao_devolucao VARCHAR(255) NULL AFTER condicoes' }
        ];

        const colunasPendentes = colunasNecessarias.filter((coluna) => !existentes.includes(coluna.nome));

        function criarProximaColuna(indice = 0) {
            if (indice >= colunasPendentes.length) {
                finalizarVerificacao();
                return;
            }

            const coluna = colunasPendentes[indice];
            db.query(coluna.sql, (alterErr) => {
                if (alterErr) {
                    console.error(`Erro ao criar coluna ${coluna.nome}:`, alterErr.message);
                    finalizarVerificacao(alterErr);
                    return;
                }

                criarProximaColuna(indice + 1);
            });
        }

        if (colunasPendentes.length === 0) {
            finalizarVerificacao();
            return;
        }

        criarProximaColuna();
    });
}

function prepararBancoEmprestimos(req, res, next) {
    garantirColunasEmprestimo((err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao preparar tabela de empréstimos. Verifique se o MySQL está rodando.' });
        }

        next();
    });
}

function normalizarStatusEquipamento(statusEmprestimo) {
    if (statusEmprestimo === 'Devolvido') {
        return 'Disponível';
    }

    if (statusEmprestimo === 'Danificado' || statusEmprestimo === 'Perdido') {
        return statusEmprestimo;
    }

    return 'Emprestado';
}

function atualizarStatusEquipamento(idEquipamento, statusEmprestimo, callback = () => {}) {
    if (!idEquipamento) {
        callback();
        return;
    }

    const statusEquipamento = normalizarStatusEquipamento(statusEmprestimo);
    db.query(
        'UPDATE Equipamento SET status = ? WHERE id = ?',
        [statusEquipamento, idEquipamento],
        callback
    );
}

function verificarEquipamentoLivre(idEquipamento, idEmprestimoIgnorado, callback) {
    let filtroEmprestimoAtual = '';
    const params = [...STATUS_EMPRESTIMO_ATIVO];

    if (idEmprestimoIgnorado) {
        filtroEmprestimoAtual = ' AND e.id <> ?';
        params.push(idEmprestimoIgnorado);
    }

    params.push(idEquipamento);

    const sql = `
        SELECT
            eq.id,
            eq.status,
            EXISTS (
                SELECT 1
                FROM Emprestimo e
                WHERE e.id_equipamento = eq.id
                  AND e.status IN (?, ?)
                  ${filtroEmprestimoAtual}
            ) AS tem_emprestimo_ativo
        FROM Equipamento eq
        WHERE eq.id = ?
    `;

    db.query(sql, params, (err, results) => {
        if (err) {
            callback(err);
            return;
        }

        if (results.length === 0) {
            callback(null, { encontrado: false, livre: false });
            return;
        }

        const equipamento = results[0];
        const statusNormalizado = String(equipamento.status || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        callback(null, {
            encontrado: true,
            livre: statusNormalizado === 'disponivel' && !equipamento.tem_emprestimo_ativo,
            equipamento
        });
    });
}

function dataPosterior(dataFinal, dataInicial) {
    const finalNormalizada = normalizarDataComparacao(dataFinal);
    const inicialNormalizada = normalizarDataComparacao(dataInicial);

    if (!finalNormalizada || !inicialNormalizada) {
        return false;
    }

    return new Date(`${finalNormalizada}T00:00:00`) > new Date(`${inicialNormalizada}T00:00:00`);
}

function dataAtualISO() {
    return new Date().toISOString().slice(0, 10);
}

function emprestimoFornecido(status) {
    return status === STATUS_FORNECIDO;
}

function mesmaData(dataA, dataB) {
    return normalizarDataComparacao(dataA) === normalizarDataComparacao(dataB);
}

function normalizarDataComparacao(data) {
    if (!data) {
        return '';
    }

    if (data instanceof Date) {
        return data.toISOString().slice(0, 10);
    }

    const texto = String(data).trim();
    const dataBrasil = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (dataBrasil) {
        return `${dataBrasil[3]}-${dataBrasil[2]}-${dataBrasil[1]}`;
    }

    const dataIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (dataIso) {
        return `${dataIso[1]}-${dataIso[2]}-${dataIso[3]}`;
    }

    return texto.slice(0, 10);
}

function normalizarTextoComparacao(texto) {
    return String(texto || '').trim();
}

function statusEquipamentoBloqueado(status) {
    return status === 'Emprestado' || status === STATUS_FORNECIDO;
}

function montarQueryEmprestimos(filtros = {}) {
    let sql = `
        SELECT
            e.id,
            e.id_usuario,
            e.id_equipamento,
            e.id_colaborador,
            e.data,
            e.data_prevista_devolucao,
            e.data_devolucao,
            e.status,
            e.condicoes,
            e.observacao_devolucao,
            eq.tipo AS equipamento_tipo,
            eq.modelo AS equipamento_modelo,
            eq.status AS equipamento_status,
            u.nome AS colaborador_nome,
            u.cpf AS colaborador_cpf,
            c.cargo AS colaborador_cargo,
            c.setor AS colaborador_setor
        FROM Emprestimo e
        LEFT JOIN Equipamento eq ON e.id_equipamento = eq.id
        LEFT JOIN Colaborador c ON e.id_colaborador = c.id
        LEFT JOIN Usuario_Sistema u ON c.id = u.id
        WHERE 1 = 1
    `;
    const params = [];

    if (filtros.status) {
        sql += ' AND e.status = ?';
        params.push(filtros.status);
    }

    if (filtros.equipamento) {
        sql += ' AND (eq.tipo LIKE ? OR eq.modelo LIKE ? OR CONCAT(eq.tipo, " ", eq.modelo) LIKE ?)';
        const termo = `%${filtros.equipamento}%`;
        params.push(termo, termo, termo);
    }

    if (filtros.colaborador || filtros.busca) {
        sql += ' AND u.nome LIKE ?';
        params.push(`%${filtros.colaborador || filtros.busca}%`);
    }

    sql += ' ORDER BY e.data DESC, e.id DESC';

    return { sql, params };
}

app.post('/login', (req, res) => {
    const cpf = normalizarCpf(req.body.cpf);
    const senha = String(req.body.senha || '');

    if (!cpfTemOnzeDigitos(cpf)) {
        return res.status(400).json({ erro: 'CPF deve ter 11 digitos.' });
    }

    if (!senha) {
        return res.status(400).json({ erro: 'Informe a senha.' });
    }

    const sql = `
        SELECT
            u.id,
            u.nome,
            u.funcao,
            u.cpf,
            a.status,
            la.senha_hash
        FROM Login_Administrador la
        INNER JOIN Administrador a ON a.id = la.id_administrador
        INNER JOIN Usuario_Sistema u ON u.id = a.id
        WHERE la.cpf = ?
        LIMIT 1
    `;

    db.query(sql, [cpf], (err, results) => {
        if (err) {
            return res.status(500).json({ erro: 'Erro ao validar login. Verifique se o MySQL esta rodando e se o banco foi importado.' });
        }

        if (results.length === 0 || results[0].senha_hash !== hashSenha(senha)) {
            return res.status(401).json({ erro: 'CPF ou senha invalidos.' });
        }

        if (results[0].status !== 'Ativo') {
            return res.status(403).json({ erro: 'Administrador inativo.' });
        }

        res.status(200).json({
            id: results[0].id,
            nome: results[0].nome,
            funcao: results[0].funcao || 'Administrador',
            cpf: results[0].cpf,
            status: results[0].status
        });
    });
});

app.post('/cadastro-conta', (req, res) => {
    const nome = String(req.body.nome || '').trim() || 'Administrador';
    const cpf = normalizarCpf(req.body.cpf);
    const senha = String(req.body.senha || '');

    if (!cpfTemOnzeDigitos(cpf)) {
        return res.status(400).json({ erro: 'CPF deve ter 11 digitos.' });
    }

    db.getConnection((errConexao, connection) => {
        if (errConexao) {
            return res.status(500).json({ erro: 'Erro ao conectar ao banco.' });
        }

        connection.beginTransaction((errTransacao) => {
            if (errTransacao) {
                connection.release();
                return res.status(500).json({ erro: 'Erro ao iniciar cadastro.' });
            }

            connection.query(
                'INSERT INTO Usuario_Sistema (nome, funcao, senha, cpf) VALUES (?, ?, ?, ?)',
                [nome, 'Administrador', senha, cpf],
                (errUsuario, resultUsuario) => {
                    if (errUsuario) {
                        return desfazerCadastro(connection, res, 'Erro ao criar usuario.');
                    }

                    const idAdministrador = resultUsuario.insertId;

                    connection.query(
                        'INSERT INTO Administrador (id, status) VALUES (?, ?)',
                        [idAdministrador, 'Ativo'],
                        (errAdmin) => {
                            if (errAdmin) {
                                return desfazerCadastro(connection, res, 'Erro ao criar administrador.');
                            }

                            connection.query(
                                'INSERT INTO Login_Administrador (id_administrador, cpf, senha_hash) VALUES (?, ?, ?)',
                                [idAdministrador, cpf, hashSenha(senha)],
                                (errLogin) => {
                                    if (errLogin) {
                                        const mensagem = errLogin.code === 'ER_DUP_ENTRY'
                                            ? 'CPF ja cadastrado.'
                                            : 'Erro ao criar login.';

                                        return desfazerCadastro(connection, res, mensagem, errLogin.code === 'ER_DUP_ENTRY' ? 400 : 500);
                                    }

                                    connection.commit((errCommit) => {
                                        connection.release();

                                        if (errCommit) {
                                            return res.status(500).json({ erro: 'Erro ao finalizar cadastro.' });
                                        }

                                        res.status(201).json({
                                            id: idAdministrador,
                                            nome,
                                            funcao: 'Administrador',
                                            cpf,
                                            status: 'Ativo'
                                        });
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    });
});

function desfazerCadastro(connection, res, mensagem, status = 500) {
    connection.rollback(() => {
        connection.release();
        res.status(status).json({ erro: mensagem });
    });
}

app.post('/colaboradores', (req, res) => {
    const { nome, cpf, cargo, setor, status } = req.body;
    const funcao = 'Colaborador';
    const senha = '123';

    const sqlUsuario = "INSERT INTO Usuario_Sistema (nome, funcao, senha, cpf) VALUES (?, ?, ?, ?)";
    
    db.query(sqlUsuario, [nome, funcao, senha, cpf], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao salvar usuário' });
        }

        const idUsuario = result.insertId;
        const sqlColaborador = "INSERT INTO Colaborador (id, cargo, setor, status) VALUES (?, ?, ?, ?)";
        
        db.query(sqlColaborador, [idUsuario, cargo, setor, status], (errColab) => {
            if (errColab) {
                return res.status(500).json({ error: 'Erro ao salvar colaborador' });
            }
            res.status(201).json({ message: 'Colaborador cadastrado com sucesso!' });
        });
    });
});

app.get('/colaboradores', (req, res) => {
    const { busca } = req.query;
    let sql = "SELECT u.id, u.nome, u.cpf, c.cargo, c.setor, c.status FROM Usuario_Sistema u INNER JOIN Colaborador c ON u.id = c.id";
    let params = [];

    if (busca) {
        sql += " WHERE u.nome LIKE ?";
        params.push(`%${busca}%`);
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar colaboradores' });
        }
        res.status(200).json(results);
    });
});

app.put('/colaboradores/:id', (req, res) => {
    const { id } = req.params;
    const { nome, cpf, cargo, setor, status } = req.body;

    const sqlUsuario = "UPDATE Usuario_Sistema SET nome = ?, cpf = ? WHERE id = ?";
    db.query(sqlUsuario, [nome, cpf, id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao atualizar usuário' });
        }

        const sqlColaborador = "UPDATE Colaborador SET cargo = ?, setor = ?, status = ? WHERE id = ?";
        db.query(sqlColaborador, [cargo, setor, status, id], (errColab) => {
            if (errColab) {
                return res.status(500).json({ error: 'Erro ao atualizar colaborador' });
            }
            res.status(200).json({ message: 'Colaborador atualizado com sucesso!' });
        });
    });
});

app.delete('/colaboradores/:id', (req, res) => {
    const { id } = req.params;

    const sqlColaborador = "DELETE FROM Colaborador WHERE id = ?";
    db.query(sqlColaborador, [id], (err) => {
        if (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({ error: 'Não é possível excluir colaborador vinculado a empréstimos.' });
            }

            return res.status(500).json({ error: 'Erro ao excluir colaborador' });
        }

        const sqlUsuario = "DELETE FROM Usuario_Sistema WHERE id = ?";
        db.query(sqlUsuario, [id], (errUsu) => {
            if (errUsu) {
                return res.status(500).json({ error: 'Erro ao excluir usuário' });
            }
            res.status(200).json({ message: 'Colaborador excluído com sucesso!' });
        });
    });
});

app.get('/equipamentos', (req, res) => {
    const { busca, status, disponiveis, emprestimoId } = req.query;
    let sql = `
        SELECT
            eq.id,
            eq.tipo,
            eq.modelo,
            COALESCE(
                (
                    SELECT e.status
                    FROM Emprestimo e
                    WHERE e.id_equipamento = eq.id
                    ORDER BY
                        CASE
                            WHEN e.status IN ('Emprestado', 'Fornecido') THEN 0
                            ELSE 1
                        END,
                        e.id DESC
                    LIMIT 1
                ),
                eq.status
            ) AS status,
            eq.id_administrador,
            CONCAT(eq.tipo, ' - ', eq.modelo) AS nome
        FROM Equipamento eq
        WHERE 1 = 1
    `;
    const params = [];

    if (busca) {
        sql += ' AND (eq.tipo LIKE ? OR eq.modelo LIKE ?)';
        params.push(`%${busca}%`, `%${busca}%`);
    }

    if (status) {
        sql += `
            AND COALESCE(
                (
                    SELECT e.status
                    FROM Emprestimo e
                    WHERE e.id_equipamento = eq.id
                    ORDER BY
                        CASE
                            WHEN e.status IN ('Emprestado', 'Fornecido') THEN 0
                            ELSE 1
                        END,
                        e.id DESC
                    LIMIT 1
                ),
                eq.status
            ) = ?
        `;
        params.push(status);
    }

    if (disponiveis === 'true') {
        sql += `
            AND (
                (
                    eq.status IN ('Disponível', 'Disponivel')
                    AND NOT EXISTS (
                        SELECT 1
                        FROM Emprestimo e
                        WHERE e.id_equipamento = eq.id
                          AND e.status IN (?, ?)
                    )
                )
        `;
        params.push(...STATUS_EMPRESTIMO_ATIVO);

        if (emprestimoId) {
            sql += ' OR eq.id = (SELECT id_equipamento FROM Emprestimo WHERE id = ?)';
            params.push(emprestimoId);
        }

        sql += ')';
    }

    sql += ' ORDER BY eq.tipo, eq.modelo';

    db.query(sql, params, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar equipamentos' });
        }
        res.status(200).json(results);
    });
});

app.post('/equipamentos', (req, res) => {
    const { tipo, id_administrador = null } = req.body;
    const { modelo } = req.body;
    const status = 'Disponível';

    if (!tipo || !modelo) {
        return res.status(400).json({ error: 'Preencha tipo e modelo do equipamento.' });
    }

    const sql = 'INSERT INTO Equipamento (tipo, modelo, status, id_administrador) VALUES (?, ?, ?, ?)';

    db.query(sql, [tipo, modelo, status, id_administrador || null], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao salvar equipamento' });
        }

        res.status(201).json({ message: 'Equipamento cadastrado com sucesso!' });
    });
});

app.put('/equipamentos/:id', (req, res) => {
    const { id } = req.params;
    const { tipo, modelo, status, id_administrador = null } = req.body;

    if (!tipo || !modelo || !status) {
        return res.status(400).json({ error: 'Preencha tipo, modelo e status do equipamento.' });
    }

    db.query(
        "SELECT status FROM Emprestimo WHERE id_equipamento = ? AND status IN ('Emprestado', 'Fornecido') ORDER BY id DESC LIMIT 1",
        [id],
        (errStatus, emprestimosAtivos) => {
            if (errStatus) {
                return res.status(500).json({ error: 'Erro ao verificar status do equipamento' });
            }

            if (emprestimosAtivos.length > 0 && statusEquipamentoBloqueado(emprestimosAtivos[0].status)) {
                return res.status(400).json({ error: 'Equipamentos emprestados ou fornecidos não podem ser alterados.' });
            }

            atualizarEquipamento();
        }
    );

    function atualizarEquipamento() {
    const sql = 'UPDATE Equipamento SET tipo = ?, modelo = ?, status = ?, id_administrador = ? WHERE id = ?';

    db.query(sql, [tipo, modelo, status, id_administrador || null, id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao atualizar equipamento' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Equipamento não encontrado' });
        }

        res.status(200).json({ message: 'Equipamento atualizado com sucesso!' });
    });
    }
});

app.delete('/equipamentos/:id', (req, res) => {
    const { id } = req.params;

    db.query(
        "SELECT status FROM Emprestimo WHERE id_equipamento = ? AND status IN ('Emprestado', 'Fornecido') ORDER BY id DESC LIMIT 1",
        [id],
        (errStatus, emprestimosAtivos) => {
            if (errStatus) {
                return res.status(500).json({ error: 'Erro ao verificar status do equipamento' });
            }

            if (emprestimosAtivos.length > 0 && statusEquipamentoBloqueado(emprestimosAtivos[0].status)) {
                return res.status(400).json({ error: 'Equipamentos emprestados ou fornecidos não podem ser excluídos.' });
            }

            excluirEquipamento();
        }
    );

    function excluirEquipamento() {
    db.query('DELETE FROM Equipamento WHERE id = ?', [id], (err, result) => {
        if (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({ error: 'Não é possível excluir equipamento vinculado a empréstimos.' });
            }

            return res.status(500).json({ error: 'Erro ao excluir equipamento' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Equipamento não encontrado' });
        }

        res.status(200).json({ message: 'Equipamento excluído com sucesso!' });
    });
    }
});

app.get('/emprestimos/resumo', prepararBancoEmprestimos, (req, res) => {
    const sqlDisponiveis = `
        SELECT COUNT(*) AS total
        FROM Equipamento eq
        WHERE eq.status IN ('Disponível', 'Disponivel')
          AND NOT EXISTS (
              SELECT 1
              FROM Emprestimo e
              WHERE e.id_equipamento = eq.id
                AND e.status IN ('Emprestado', 'Fornecido')
          )
    `;
    const sqlEmprestados = "SELECT COUNT(*) AS total FROM Emprestimo WHERE status = 'Emprestado'";
    const sqlVencidos = `
        SELECT COUNT(*) AS total
        FROM Emprestimo
        WHERE status IN ('Emprestado')
          AND data_prevista_devolucao IS NOT NULL
          AND data_prevista_devolucao < CURDATE()
    `;

    db.query(sqlDisponiveis, (errDisponiveis, disponiveisResult) => {
        if (errDisponiveis) {
            return res.status(500).json({ error: 'Erro ao buscar resumo de equipamentos' });
        }

        db.query(sqlEmprestados, (errEmprestados, emprestadosResult) => {
            if (errEmprestados) {
                return res.status(500).json({ error: 'Erro ao buscar resumo de empréstimos' });
            }

            db.query(sqlVencidos, (errVencidos, vencidosResult) => {
                if (errVencidos) {
                    return res.status(500).json({ error: 'Erro ao buscar empréstimos vencidos' });
                }

                res.status(200).json({
                    disponiveis: disponiveisResult[0].total,
                    emprestados: emprestadosResult[0].total,
                    vencidos: vencidosResult[0].total
                });
            });
        });
    });
});

app.get('/emprestimos', prepararBancoEmprestimos, (req, res) => {
    const { sql, params } = montarQueryEmprestimos(req.query);

    db.query(sql, params, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar empréstimos' });
        }
        res.status(200).json(results);
    });
});

app.get('/emprestimos/:id', prepararBancoEmprestimos, (req, res) => {
    const { id } = req.params;
    const { sql, params } = montarQueryEmprestimos({});

    db.query(`${sql.replace('ORDER BY e.data DESC, e.id DESC', '')} AND e.id = ?`, [...params, id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar empréstimo' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Empréstimo não encontrado' });
        }

        res.status(200).json(results[0]);
    });
});

app.post('/emprestimos', prepararBancoEmprestimos, (req, res, next) => {
    const { id_equipamento, status } = req.body;

    if (!id_equipamento || !STATUS_EMPRESTIMO_ATIVO.includes(status)) {
        next();
        return;
    }

    verificarEquipamentoLivre(id_equipamento, null, (errDisponibilidade, disponibilidade) => {
        if (errDisponibilidade) {
            return res.status(500).json({ error: 'Erro ao verificar disponibilidade do equipamento' });
        }

        if (!disponibilidade.encontrado) {
            return res.status(404).json({ error: 'Equipamento não encontrado.' });
        }

        if (!disponibilidade.livre) {
            return res.status(400).json({ error: 'Este equipamento já está emprestado ou indisponível.' });
        }

        next();
    });
});

app.post('/emprestimos', prepararBancoEmprestimos, (req, res) => {
    const {
        id_usuario = null,
        id_equipamento,
        id_colaborador,
        data,
        data_prevista_devolucao,
        status,
        condicoes
    } = req.body;

    if (!id_equipamento || !id_colaborador || !data || !data_prevista_devolucao || !status) {
        return res.status(400).json({ error: 'Item não foi cadastrado! Preencher os campos obrigatórios.' });
    }

    const dataPrevistaFinal = emprestimoFornecido(status) ? DATA_INDEFINIDA : data_prevista_devolucao;

    if (!emprestimoFornecido(status) && !dataPosterior(dataPrevistaFinal, data)) {
        return res.status(400).json({ error: 'A data prevista de devolução deve ser posterior à data do empréstimo.' });
    }

    if (!emprestimoFornecido(status) && !dataPosterior(dataPrevistaFinal, dataAtualISO())) {
        return res.status(400).json({ error: 'A data prevista de devolução deve ser posterior à data atual.' });
    }

    if (!STATUS_EMPRESTIMO_ATIVO.includes(status)) {
        return res.status(400).json({ error: 'No cadastro, o status deve ser Emprestado ou Fornecido.' });
    }

    const sql = `
        INSERT INTO Emprestimo
            (id_usuario, id_equipamento, id_colaborador, data, data_prevista_devolucao, status, condicoes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [id_usuario, id_equipamento, id_colaborador, data, dataPrevistaFinal, status, condicoes],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao salvar empréstimo' });
            }

            atualizarStatusEquipamento(id_equipamento, status, (errStatus) => {
                if (errStatus) {
                    return res.status(500).json({ error: 'Empréstimo salvo, mas houve erro ao atualizar o equipamento' });
                }

                res.status(201).json({ message: 'Item cadastrado com sucesso!' });
            });
        }
    );
});

app.put('/emprestimos/:id', prepararBancoEmprestimos, (req, res, next) => {
    next();
});

app.put('/emprestimos/:id', prepararBancoEmprestimos, (req, res) => {
    const { id } = req.params;
    const {
        id_equipamento,
        id_colaborador,
        data,
        data_prevista_devolucao,
        data_devolucao,
        status,
        condicoes,
        observacao_devolucao
    } = req.body;

    if (!id_equipamento || !id_colaborador || !data || !data_prevista_devolucao || !status) {
        return res.status(400).json({ error: 'Item não foi atualizado! Preencher os campos obrigatórios.' });
    }

    const dataPrevistaFinal = emprestimoFornecido(status) ? DATA_INDEFINIDA : data_prevista_devolucao;

    if (!emprestimoFornecido(status) && !dataPosterior(dataPrevistaFinal, data)) {
        return res.status(400).json({ error: 'A data prevista de devolução deve ser posterior à data do empréstimo.' });
    }

    const statusPermitidos = [...STATUS_EMPRESTIMO_ATIVO, ...STATUS_EMPRESTIMO_FINALIZADO];
    if (!statusPermitidos.includes(status)) {
        return res.status(400).json({ error: 'Status inválido para o empréstimo.' });
    }

    if (STATUS_EMPRESTIMO_FINALIZADO.includes(status) && (!data_devolucao || !observacao_devolucao)) {
        return res.status(400).json({ error: 'Preencha a data e a observação da devolução/perda.' });
    }

    if (STATUS_EMPRESTIMO_FINALIZADO.includes(status) && !dataPosterior(data_devolucao, data)) {
        return res.status(400).json({ error: 'A data da devolução deve ser posterior à data do empréstimo.' });
    }

    db.query('SELECT id_equipamento, id_colaborador, data, data_prevista_devolucao, condicoes, status FROM Emprestimo WHERE id = ?', [id], (errBusca, emprestimoAtual) => {
        if (errBusca) {
            return res.status(500).json({ error: 'Erro ao buscar empréstimo' });
        }

        if (emprestimoAtual.length === 0) {
            return res.status(404).json({ error: 'Empréstimo não encontrado' });
        }

        const emprestimoSalvo = emprestimoAtual[0];

        if (emprestimoSalvo.status === STATUS_FORNECIDO) {
            return res.status(400).json({
                error: 'Empréstimos fornecidos não podem ser editados.'
            });
        }

        const alterouCamposTravados =
            Number(emprestimoSalvo.id_equipamento) !== Number(id_equipamento) ||
            Number(emprestimoSalvo.id_colaborador) !== Number(id_colaborador) ||
            !mesmaData(emprestimoSalvo.data, data) ||
            (!emprestimoFornecido(status) && !mesmaData(emprestimoSalvo.data_prevista_devolucao, dataPrevistaFinal)) ||
            normalizarTextoComparacao(emprestimoSalvo.condicoes) !== normalizarTextoComparacao(condicoes);

        if (alterouCamposTravados) {
            return res.status(400).json({
                error: 'Na atualização, altere apenas o status e os campos de devolução.'
            });
        }

        const sql = `
            UPDATE Emprestimo
            SET
                id_equipamento = ?,
                id_colaborador = ?,
                data = ?,
                data_prevista_devolucao = ?,
                data_devolucao = ?,
                status = ?,
                condicoes = ?,
                observacao_devolucao = ?
            WHERE id = ?
        `;

        db.query(
            sql,
            [
                id_equipamento,
                id_colaborador,
                data,
                dataPrevistaFinal,
                data_devolucao || null,
                status,
                condicoes,
                observacao_devolucao || null,
                id
            ],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao atualizar empréstimo' });
                }

                const equipamentoAnterior = emprestimoAtual[0].id_equipamento;
                const equipamentoMudou = Number(equipamentoAnterior) !== Number(id_equipamento);

                const atualizarEquipamentoNovo = () => {
                    atualizarStatusEquipamento(id_equipamento, status, (errStatus) => {
                        if (errStatus) {
                            return res.status(500).json({ error: 'Empréstimo atualizado, mas houve erro ao atualizar o equipamento' });
                        }

                        res.status(200).json({ message: 'Empréstimo atualizado com sucesso!' });
                    });
                };

                if (equipamentoMudou) {
                    db.query(
                        "UPDATE Equipamento SET status = 'Disponível' WHERE id = ?",
                        [equipamentoAnterior],
                        (errEquipamentoAnterior) => {
                            if (errEquipamentoAnterior) {
                                return res.status(500).json({ error: 'Erro ao liberar equipamento anterior' });
                            }

                            atualizarEquipamentoNovo();
                        }
                    );
                    return;
                }

                atualizarEquipamentoNovo();
            }
        );
    });
});

const server = app.listen(3000, () => {
    garantirTabelaLoginAdministrador();
    console.log('Servidor rodando na porta 3000! (http://localhost:3000)');
});

server.on('error', (err) => {
    console.error('Erro ao iniciar servidor:', err.message);
});
