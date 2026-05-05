const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sistema_emprestimos'
});

db.connect((erro) => {
    if (erro) {
        console.error(erro);
    } else {
        console.log('Conectado ao MySQL com sucesso!');
    }
});

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

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000! (http://localhost:3000)');
});