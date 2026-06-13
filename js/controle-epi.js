const API_URL = 'http://localhost:3000';

const formFiltroControle = document.getElementById('formFiltroControle');
const btnLimparControle = document.getElementById('btnLimparControle');
const tabelaControle = document.getElementById('tabelaControle');
const controleVazio = document.getElementById('controleVazio');
const controleTotal = document.getElementById('controleTotal');
const controleAlerta = document.getElementById('controleAlerta');
const DATA_INDEFINIDA = '9999-12-31';
const TEXTO_DATA_INDEFINIDA = 'Indefinido';
const STATUS_FORNECIDO = 'Fornecido';

function textoLoja(texto) {
    return window.TextosLoja?.traduzirTexto(texto) || texto;
}

function labelStatusVenda(status) {
    return window.TextosLoja?.statusVenda(status) || status || '-';
}

function escaparHtml(valor) {
    return String(valor ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatarData(valor) {
    if (String(valor || '').slice(0, 10) === DATA_INDEFINIDA) {
        return TEXTO_DATA_INDEFINIDA;
    }

    if (!valor) {
        return '-';
    }

    const [ano, mes, dia] = String(valor).slice(0, 10).split('-');
    if (!ano || !mes || !dia) {
        return '-';
    }

    return `${dia}/${mes}/${ano}`;
}

function classeStatus(status) {
    const classes = {
        Emprestado: 'status-emprestado',
        Fornecido: 'status-fornecido',
        Devolvido: 'status-devolvido',
        Danificado: 'status-danificado',
        Perdido: 'status-perdido'
    };

    return classes[status] || 'status-emprestado';
}

function badgeStatus(status) {
    return `<span class="status-badge ${classeStatus(status)}">${escaparHtml(labelStatusVenda(status))}</span>`;
}

function montarParametrosFiltro() {
    const params = new URLSearchParams();
    const equipamento = document.getElementById('filtroEquipamento').value.trim();
    const colaborador = document.getElementById('filtroColaborador').value.trim();
    const status = document.getElementById('filtroStatus').value;

    if (equipamento) {
        params.append('equipamento', equipamento);
    }

    if (colaborador) {
        params.append('colaborador', colaborador);
    }

    if (status) {
        params.append('status', status);
    }

    return params;
}

function atualizarTotal(total) {
    controleTotal.textContent = `${total} ${total === 1 ? 'registro' : 'registros'}`;
}

function renderizarControle(emprestimos) {
    tabelaControle.innerHTML = '';
    atualizarTotal(emprestimos.length);

    if (emprestimos.length === 0) {
        controleVazio.classList.remove('d-none');
        return;
    }

    controleVazio.classList.add('d-none');

    emprestimos.forEach((emprestimo) => {
        const equipamento = emprestimo.equipamento_tipo || 'Produto';
        const modelo = emprestimo.equipamento_modelo || 'Sem descrição informada';
        const colaborador = emprestimo.colaborador_nome || 'Cliente não encontrado';
        const fornecido = emprestimo.status === STATUS_FORNECIDO;
        const acao = fornecido
            ? `<button class="btn btn-sm btn-outline-secondary" type="button" disabled title="Venda concluída não pode ser editada">
                    <i class="bi bi-lock"></i> Bloqueado
               </button>`
            : `<button class="btn btn-sm btn-outline-primary btn-editar-controle" type="button" data-id="${emprestimo.id}">
                    <i class="bi bi-pencil-square"></i> Editar
               </button>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4">${formatarData(emprestimo.data)}</td>
            <td>${formatarData(emprestimo.data_prevista_devolucao)}</td>
            <td>${badgeStatus(emprestimo.status)}</td>
            <td>
                <span class="controle-equipment">
                    <strong>${escaparHtml(equipamento)}</strong>
                    <span>${escaparHtml(modelo)}</span>
                </span>
            </td>
            <td class="fw-semibold">${escaparHtml(colaborador)}</td>
            <td class="text-end pe-4">
                ${acao}
            </td>
        `;
        tabelaControle.appendChild(tr);
    });
}

async function carregarControle() {
    const params = montarParametrosFiltro();
    controleAlerta.innerHTML = '';

    try {
        const response = await fetch(`${API_URL}/emprestimos?${params.toString()}`);
        const emprestimos = await response.json();

        if (!response.ok) {
            throw new Error(emprestimos.error || 'Erro ao buscar vendas.');
        }

        renderizarControle(emprestimos);
    } catch (error) {
        tabelaControle.innerHTML = '';
        controleVazio.classList.remove('d-none');
        atualizarTotal(0);
        controleAlerta.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-x-circle-fill me-2"></i>${escaparHtml(textoLoja(error.message))}
            </div>
        `;
    }
}

formFiltroControle.addEventListener('submit', (event) => {
    event.preventDefault();
    carregarControle();
});

btnLimparControle.addEventListener('click', () => {
    formFiltroControle.reset();
    carregarControle();
});

tabelaControle.addEventListener('click', (event) => {
    const botaoEditar = event.target.closest('.btn-editar-controle');

    if (botaoEditar) {
        window.location.href = `emprestimos.html?id=${botaoEditar.dataset.id}`;
    }
});

carregarControle();
