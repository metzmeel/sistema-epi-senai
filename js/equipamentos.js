const API_URL = 'http://localhost:3000';

const formEquipamento = document.getElementById('formEquipamento');
const idEquipamento = document.getElementById('idEquipamento');
const tipoEquipamento = document.getElementById('tipoEquipamento');
const modeloEquipamento = document.getElementById('modeloEquipamento');
const statusEquipamento = document.getElementById('statusEquipamento');
const grupoStatusEquipamento = document.getElementById('grupoStatusEquipamento');
const tituloFormularioEquipamento = document.getElementById('tituloFormularioEquipamento');
const mensagemEquipamento = document.getElementById('mensagemEquipamento');
const btnSalvarEquipamento = document.getElementById('btnSalvarEquipamento');
const btnCancelarEquipamento = document.getElementById('btnCancelarEquipamento');
const btnPesquisarEquipamento = document.getElementById('btnPesquisarEquipamento');
const inputPesquisaEquipamento = document.getElementById('inputPesquisaEquipamento');
const tabelaEquipamentos = document.getElementById('tabelaEquipamentos');

function textoLoja(texto) {
    return window.TextosLoja?.traduzirTexto(texto) || texto;
}

function labelStatusProduto(status) {
    return window.TextosLoja?.statusProduto(status) || status || '-';
}

function obterUsuarioLogado() {
    return window.SisEPIAuth?.obterUsuario() || null;
}

function escaparHtml(valor) {
    return String(valor ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function classeStatus(status) {
    const normalizado = String(status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const classes = {
        disponivel: 'status-disponivel',
        emprestado: 'status-emprestado',
        danificado: 'status-danificado',
        perdido: 'status-perdido'
    };

    return classes[normalizado] || 'status-disponivel';
}

function badgeStatus(status) {
    return `<span class="status-badge ${classeStatus(status)}">${escaparHtml(labelStatusProduto(status))}</span>`;
}

function equipamentoBloqueado(status) {
    return status === 'Emprestado' || status === 'Fornecido';
}

function mostrarMensagem(tipo, texto) {
    mensagemEquipamento.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            <i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2"></i>
            ${escaparHtml(textoLoja(texto))}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

function resetarFormulario() {
    formEquipamento.reset();
    idEquipamento.value = '';
    statusEquipamento.value = 'Disponível';
    grupoStatusEquipamento.classList.add('d-none');
    tituloFormularioEquipamento.textContent = 'Cadastrar Novo Produto';
    btnSalvarEquipamento.innerHTML = '<i class="bi bi-check2-circle"></i> Salvar Produto';
    btnSalvarEquipamento.classList.remove('btn-warning');
    btnSalvarEquipamento.classList.add('btn-primary');
    btnCancelarEquipamento.classList.add('d-none');
}

async function carregarEquipamentos(busca = '') {
    const params = new URLSearchParams();

    if (busca) {
        params.append('busca', busca);
    }

    try {
        const response = await fetch(`${API_URL}/equipamentos?${params.toString()}`);
        const equipamentos = await response.json();

        if (!response.ok) {
            throw new Error(equipamentos.error || 'Erro ao carregar produtos.');
        }

        renderizarEquipamentos(equipamentos);
    } catch (error) {
        tabelaEquipamentos.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-danger">${escaparHtml(error.message)}</td>
            </tr>
        `;
    }
}

function renderizarEquipamentos(equipamentos) {
    tabelaEquipamentos.innerHTML = '';

    if (equipamentos.length === 0) {
        tabelaEquipamentos.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-muted">Nenhum produto encontrado.</td>
            </tr>
        `;
        return;
    }

    equipamentos.forEach((equipamento) => {
        const bloqueado = equipamentoBloqueado(equipamento.status);
        const botaoEditar = bloqueado
            ? `<button class="btn btn-sm btn-outline-secondary me-1" type="button" disabled title="Produto ${escaparHtml(labelStatusProduto(equipamento.status))} não pode ser alterado">
                    <i class="bi bi-lock"></i>
               </button>`
            : `<button
                    class="btn btn-sm btn-outline-primary me-1 btn-editar-equipamento"
                    type="button"
                    data-id="${equipamento.id}"
                    data-tipo="${escaparHtml(equipamento.tipo)}"
                    data-modelo="${escaparHtml(equipamento.modelo)}"
                    data-status="${escaparHtml(equipamento.status)}"
                    title="Editar">
                    <i class="bi bi-pencil-square"></i>
               </button>`;
        const botaoExcluir = bloqueado
            ? `<button class="btn btn-sm btn-outline-secondary" type="button" disabled title="Produto ${escaparHtml(labelStatusProduto(equipamento.status))} não pode ser excluído">
                    <i class="bi bi-lock"></i>
               </button>`
            : `<button class="btn btn-sm btn-outline-danger btn-excluir-equipamento" type="button" data-id="${equipamento.id}" title="Excluir">
                    <i class="bi bi-trash3"></i>
               </button>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4 fw-bold text-secondary">#${equipamento.id}</td>
            <td class="fw-semibold">${escaparHtml(equipamento.tipo)}</td>
            <td>${escaparHtml(equipamento.modelo)}</td>
            <td>${badgeStatus(equipamento.status)}</td>
            <td class="text-end pe-4">
                ${botaoEditar}
                ${botaoExcluir}
            </td>
        `;
        tabelaEquipamentos.appendChild(tr);
    });
}

function prepararEdicao(botao) {
    idEquipamento.value = botao.dataset.id;
    tipoEquipamento.value = botao.dataset.tipo;
    modeloEquipamento.value = botao.dataset.modelo;
    statusEquipamento.value = botao.dataset.status;
    grupoStatusEquipamento.classList.remove('d-none');

    tituloFormularioEquipamento.textContent = 'Atualizar Produto';
    btnSalvarEquipamento.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Atualizar Produto';
    btnSalvarEquipamento.classList.remove('btn-primary');
    btnSalvarEquipamento.classList.add('btn-warning');
    btnCancelarEquipamento.classList.remove('d-none');

    document.querySelector('.content-area').scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirEquipamento(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/equipamentos/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao excluir produto.');
        }

        mostrarMensagem('success', result.message);
        carregarEquipamentos(inputPesquisaEquipamento.value.trim());
    } catch (error) {
        mostrarMensagem('danger', error.message);
    }
}

formEquipamento.addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = idEquipamento.value;
    const url = id ? `${API_URL}/equipamentos/${id}` : `${API_URL}/equipamentos`;
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo: tipoEquipamento.value.trim(),
                modelo: modeloEquipamento.value.trim(),
                status: id ? statusEquipamento.value : 'Disponível',
                id_administrador: obterUsuarioLogado()?.id || null
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao salvar produto.');
        }

        mostrarMensagem('success', result.message);
        resetarFormulario();
        carregarEquipamentos(inputPesquisaEquipamento.value.trim());
    } catch (error) {
        mostrarMensagem('danger', error.message);
    }
});

btnCancelarEquipamento.addEventListener('click', resetarFormulario);

btnPesquisarEquipamento.addEventListener('click', () => {
    carregarEquipamentos(inputPesquisaEquipamento.value.trim());
});

inputPesquisaEquipamento.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        carregarEquipamentos(inputPesquisaEquipamento.value.trim());
    }
});

tabelaEquipamentos.addEventListener('click', (event) => {
    const botaoEditar = event.target.closest('.btn-editar-equipamento');
    const botaoExcluir = event.target.closest('.btn-excluir-equipamento');

    if (botaoEditar) {
        prepararEdicao(botaoEditar);
    }

    if (botaoExcluir) {
        excluirEquipamento(botaoExcluir.dataset.id);
    }
});

resetarFormulario();
carregarEquipamentos();
