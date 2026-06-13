// js/colaborador.js

function textoLoja(texto) {
    return window.TextosLoja?.traduzirTexto(texto) || texto;
}

// Função executada quando o formulário é enviado (Cadastro ou Edição)
document.getElementById('formCadastro').addEventListener('submit', async function(event) {
    event.preventDefault();

    const id = document.getElementById('idColaborador').value;
    const nome = document.getElementById('nome').value;
    const cpf = document.getElementById('cpf').value;
    const cargo = document.getElementById('cargo').value;
    const setor = document.getElementById('setor').value;
    const status = document.getElementById('status').value;

    const alerta = document.getElementById('mensagem-alerta');
    alerta.innerHTML = '';

    const url = id ? `http://localhost:3000/colaboradores/${id}` : 'http://localhost:3000/colaboradores';
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nome, cpf, cargo, setor, status })
        });

        const result = await response.json();

        if (response.ok) {
            alerta.innerHTML = `<div class="alert alert-success alert-dismissible fade show" role="alert">
                                    <i class="bi bi-check-circle-fill me-2"></i> ${textoLoja(result.message)}
                                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                </div>`;
            cancelarEdicao();
            carregarColaboradores();
        } else {
            alerta.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">
                                    <i class="bi bi-exclamation-triangle-fill me-2"></i> ${textoLoja(result.error)}
                                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                </div>`;
        }
    } catch (error) {
        alerta.innerHTML = `<div class="alert alert-danger"><i class="bi bi-x-circle-fill me-2"></i> Erro de conexão com o servidor. Verifique se o Node.js está rodando.</div>`;
    }
});

// Função para buscar os dados na API e preencher a tabela
async function carregarColaboradores(busca = '') {
    try {
        const response = await fetch('http://localhost:3000/colaboradores?busca=' + busca);
        const colaboradores = await response.json();
        
        const tbody = document.getElementById('tabelaColaboradores');
        tbody.innerHTML = '';

        if(colaboradores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Nenhum cliente encontrado.</td></tr>`;
            return;
        }

        colaboradores.forEach(c => {
            // Estilização do status com badges do Bootstrap
            let badgeStatus = c.status === 'Ativo' ? '<span class="badge bg-success">Ativo</span>' : '<span class="badge bg-secondary">Inativo</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4 fw-bold text-secondary">#${c.id}</td>
                <td class="fw-semibold">${c.nome}</td>
                <td>${c.cpf}</td>
                <td>${c.cargo}</td>
                <td>${c.setor}</td>
                <td>${badgeStatus}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-primary me-1" title="Editar" onclick="prepararEdicao(${c.id}, '${c.nome}', '${c.cpf}', '${c.cargo}', '${c.setor}', '${c.status}')">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" title="Excluir" onclick="excluirColaborador(${c.id})">
                        <i class="bi bi-trash3"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Erro ao carregar colaboradores:", error);
    }
}

// Evento de pesquisa ao clicar no botão
document.getElementById('btnPesquisar').addEventListener('click', () => {
    const busca = document.getElementById('inputPesquisa').value;
    carregarColaboradores(busca);
});

// Evento de pesquisa ao apertar a tecla "Enter" no campo
document.getElementById('inputPesquisa').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const busca = document.getElementById('inputPesquisa').value;
        carregarColaboradores(busca);
    }
});

// Prepara o formulário para edição preenchendo os dados
function prepararEdicao(id, nome, cpf, cargo, setor, status) {
    document.getElementById('tituloFormulario').innerText = 'Atualizar Cliente';
    
    document.getElementById('idColaborador').value = id;
    document.getElementById('nome').value = nome;
    document.getElementById('cpf').value = cpf;
    document.getElementById('cargo').value = cargo;
    document.getElementById('setor').value = setor;
    document.getElementById('status').value = status;

    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Atualizar Dados';
    btnSalvar.classList.replace('btn-primary', 'btn-warning');
    
    document.getElementById('btnCancelar').classList.remove('d-none');
    
    // Rola a tela suavemente para o topo onde está o formulário
    document.querySelector('.content-area').scrollTo({ top: 0, behavior: 'smooth' });
}

// Reseta o formulário e volta para o modo "Cadastro"
function cancelarEdicao() {
    document.getElementById('tituloFormulario').innerText = 'Cadastrar Novo Cliente';
    document.getElementById('formCadastro').reset();
    document.getElementById('idColaborador').value = '';
    
    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.innerHTML = '<i class="bi bi-check2-circle"></i> Salvar Cliente';
    btnSalvar.classList.replace('btn-warning', 'btn-primary');
    
    document.getElementById('btnCancelar').classList.add('d-none');
}

// Exclui um registro após confirmação (Alerta)
async function excluirColaborador(id) {
    if (confirm('Tem certeza que deseja excluir permanentemente este cliente?')) {
        try {
            const response = await fetch('http://localhost:3000/colaboradores/' + id, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            const alerta = document.getElementById('mensagem-alerta');
            
            if (response.ok) {
                alerta.innerHTML = `<div class="alert alert-success alert-dismissible fade show" role="alert">
                                        <i class="bi bi-check-circle-fill me-2"></i> ${textoLoja(result.message)}
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </div>`;
                carregarColaboradores();
            } else {
                alerta.innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert">
                                        <i class="bi bi-exclamation-triangle-fill me-2"></i> ${textoLoja(result.error)}
                                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </div>`;
            }
            document.querySelector('.content-area').scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            alert('Erro de conexão com o servidor.');
        }
    }
}

// Inicializa a tabela assim que o arquivo é carregado
carregarColaboradores();
