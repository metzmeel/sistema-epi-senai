const API_URL = 'http://localhost:3000';

const STATUS_CADASTRO = ['Emprestado', 'Fornecido'];
const STATUS_EDICAO = ['Emprestado', 'Fornecido', 'Devolvido', 'Danificado', 'Perdido'];
const STATUS_FINALIZADO = ['Devolvido', 'Danificado', 'Perdido'];
const STATUS_FORNECIDO = 'Fornecido';
const DATA_INDEFINIDA = '9999-12-31';
const TEXTO_DATA_INDEFINIDA = 'Indefinido';

const formEmprestimo = document.getElementById('formEmprestimo');
const idEmprestimo = document.getElementById('idEmprestimo');
const tituloEmprestimo = document.getElementById('tituloEmprestimo');
const emprestimoAlerta = document.getElementById('emprestimoAlerta');
const emprestimoEquipamento = document.getElementById('emprestimoEquipamento');
const emprestimoColaborador = document.getElementById('emprestimoColaborador');
const dataEmprestimo = document.getElementById('dataEmprestimo');
const dataPrevistaDevolucao = document.getElementById('dataPrevistaDevolucao');
const statusEmprestimo = document.getElementById('statusEmprestimo');
const condicoesEmprestimo = document.getElementById('condicoesEmprestimo');
const camposFinalizacao = document.getElementById('camposFinalizacao');
const dataDevolucao = document.getElementById('dataDevolucao');
const observacaoDevolucao = document.getElementById('observacaoDevolucao');
const btnCancelarEmprestimo = document.getElementById('btnCancelarEmprestimo');
const btnSalvarEmprestimo = document.getElementById('btnSalvarEmprestimo');
const btnNovoEmprestimo = document.getElementById('btnNovoEmprestimo');
const tabelaEmprestimos = document.getElementById('tabelaEmprestimos');
const emprestimoVazio = document.getElementById('emprestimoVazio');
const pesquisaEmprestimo = document.getElementById('pesquisaEmprestimo');
const btnPesquisarEmprestimo = document.getElementById('btnPesquisarEmprestimo');
let dataPrevistaOriginal = '';

function escaparHtml(valor) {
    return String(valor ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function dataParaInput(valor) {
    if (dataIndefinida(valor)) {
        return DATA_INDEFINIDA;
    }

    return normalizarDataComparacao(valor);
}

function dataAtualInput() {
    return new Date().toISOString().slice(0, 10);
}

function alternarCamposTravados(travado) {
    emprestimoEquipamento.disabled = travado;
    emprestimoColaborador.disabled = travado;
    dataEmprestimo.disabled = travado;
    dataPrevistaDevolucao.disabled = travado;
    condicoesEmprestimo.disabled = travado;
}

function formatarData(valor) {
    if (dataIndefinida(valor)) {
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

function dataIndefinida(valor) {
    return String(valor || '').slice(0, 10) === DATA_INDEFINIDA;
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
    return `<span class="status-badge ${classeStatus(status)}">${escaparHtml(status || '-')}</span>`;
}

function mostrarAlerta(tipo, mensagem) {
    emprestimoAlerta.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            <i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2"></i>
            ${escaparHtml(mensagem)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

function renderizarStatus(editando = false) {
    const opcoes = editando ? STATUS_EDICAO : STATUS_CADASTRO;
    statusEmprestimo.innerHTML = opcoes
        .map((status) => `<option value="${status}">${status}</option>`)
        .join('');
    statusEmprestimo.value = opcoes[0];
    alternarCamposFinalizacao();
}

function alternarCamposFinalizacao() {
    const finalizado = STATUS_FINALIZADO.includes(statusEmprestimo.value);
    const fornecido = statusEmprestimo.value === STATUS_FORNECIDO;

    if (fornecido) {
        dataPrevistaDevolucao.type = 'text';
        dataPrevistaDevolucao.value = TEXTO_DATA_INDEFINIDA;
        dataPrevistaDevolucao.required = false;
        dataPrevistaDevolucao.disabled = true;
    } else {
        dataPrevistaDevolucao.type = 'date';
        dataPrevistaDevolucao.required = true;

        if (!idEmprestimo.value) {
            dataPrevistaDevolucao.disabled = false;
        }

        if (dataPrevistaDevolucao.value === TEXTO_DATA_INDEFINIDA || dataIndefinida(dataPrevistaDevolucao.value)) {
            dataPrevistaDevolucao.value = idEmprestimo.value && dataIndefinida(dataPrevistaOriginal)
                ? DATA_INDEFINIDA
                : '';
        }
    }

    camposFinalizacao.classList.toggle('d-none', !finalizado);
    dataDevolucao.required = finalizado;
    observacaoDevolucao.required = finalizado;

    if (finalizado && !dataDevolucao.value) {
        dataDevolucao.value = dataAtualInput();
    }

    if (finalizado && dataEmprestimo.value) {
        dataDevolucao.min = dataEmprestimo.value;
    } else {
        dataDevolucao.removeAttribute('min');
    }

    if (!finalizado) {
        dataDevolucao.value = '';
        observacaoDevolucao.value = '';
    }
}

function preencherSelect(select, itens, placeholder, montarOption) {
    select.innerHTML = `<option value="">${placeholder}</option>`;
    itens.forEach((item) => {
        select.insertAdjacentHTML('beforeend', montarOption(item));
    });
}

async function carregarCombos(emprestimoAtualId = '') {
    const paramsEquipamentos = new URLSearchParams({ disponiveis: 'true' });

    if (emprestimoAtualId) {
        paramsEquipamentos.append('emprestimoId', emprestimoAtualId);
    }

    const [equipamentosResponse, colaboradoresResponse] = await Promise.all([
        fetch(`${API_URL}/equipamentos?${paramsEquipamentos.toString()}`),
        fetch(`${API_URL}/colaboradores`)
    ]);

    const equipamentos = await equipamentosResponse.json();
    const colaboradores = await colaboradoresResponse.json();

    if (!equipamentosResponse.ok) {
        throw new Error(equipamentos.error || 'Erro ao carregar equipamentos.');
    }

    if (!colaboradoresResponse.ok) {
        throw new Error(colaboradores.error || 'Erro ao carregar colaboradores.');
    }

    preencherSelect(
        emprestimoEquipamento,
        equipamentos,
        'Selecione um equipamento',
        (equipamento) => `
            <option value="${equipamento.id}">
                ${escaparHtml(equipamento.tipo)} - ${escaparHtml(equipamento.modelo)} (${escaparHtml(equipamento.status || 'Sem status')})
            </option>
        `
    );

    preencherSelect(
        emprestimoColaborador,
        colaboradores,
        'Selecione um colaborador',
        (colaborador) => `
            <option value="${colaborador.id}">
                ${escaparHtml(colaborador.nome)} - ${escaparHtml(colaborador.setor || 'Sem setor')}
            </option>
        `
    );
}

async function carregarResumo() {
    try {
        const response = await fetch(`${API_URL}/emprestimos/resumo`);
        const resumo = await response.json();

        if (!response.ok) {
            throw new Error(resumo.error || 'Erro ao carregar resumo.');
        }

        document.getElementById('totalDisponiveis').textContent = resumo.disponiveis ?? 0;
        document.getElementById('totalEmprestados').textContent = resumo.emprestados ?? 0;
        document.getElementById('totalVencidos').textContent = resumo.vencidos ?? 0;
    } catch (error) {
        document.getElementById('totalDisponiveis').textContent = '0';
        document.getElementById('totalEmprestados').textContent = '0';
        document.getElementById('totalVencidos').textContent = '0';
    }
}

function renderizarEmprestimos(emprestimos) {
    tabelaEmprestimos.innerHTML = '';

    if (emprestimos.length === 0) {
        emprestimoVazio.classList.remove('d-none');
        return;
    }

    emprestimoVazio.classList.add('d-none');

    emprestimos.forEach((emprestimo) => {
        const fornecido = emprestimo.status === STATUS_FORNECIDO;
        const acao = fornecido
            ? `<button class="btn btn-sm btn-outline-secondary" type="button" disabled title="Item fornecido não pode ser editado">
                    <i class="bi bi-lock"></i> Bloqueado
               </button>`
            : `<button class="btn btn-sm btn-outline-primary btn-editar-emprestimo" type="button" data-id="${emprestimo.id}">
                    <i class="bi bi-pencil-square"></i> Editar
               </button>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4">${formatarData(emprestimo.data)}</td>
            <td>
                <span class="emprestimo-equipment">
                    <strong>${escaparHtml(emprestimo.equipamento_tipo || 'Equipamento')}</strong>
                    <span>${escaparHtml(emprestimo.equipamento_modelo || 'Sem modelo informado')}</span>
                </span>
            </td>
            <td class="fw-semibold">${escaparHtml(emprestimo.colaborador_nome || 'Colaborador não encontrado')}</td>
            <td>${badgeStatus(emprestimo.status)}</td>
            <td class="text-end pe-4">
                ${acao}
            </td>
        `;
        tabelaEmprestimos.appendChild(tr);
    });
}

async function carregarEmprestimos(busca = '') {
    const params = new URLSearchParams();

    if (busca) {
        params.append('busca', busca);
    }

    try {
        const response = await fetch(`${API_URL}/emprestimos?${params.toString()}`);
        const emprestimos = await response.json();

        if (!response.ok) {
            throw new Error(emprestimos.error || 'Erro ao carregar empréstimos.');
        }

        renderizarEmprestimos(emprestimos);
    } catch (error) {
        tabelaEmprestimos.innerHTML = '';
        emprestimoVazio.classList.remove('d-none');
        mostrarAlerta('danger', error.message);
    }
}

function resetarFormulario() {
    formEmprestimo.reset();
    idEmprestimo.value = '';
    dataPrevistaOriginal = '';
    tituloEmprestimo.textContent = 'Cadastro';
    renderizarStatus(false);
    alternarCamposTravados(false);
    btnSalvarEmprestimo.innerHTML = '<i class="bi bi-check2-circle"></i> Salvar';
    btnSalvarEmprestimo.classList.remove('btn-warning');
    btnSalvarEmprestimo.classList.add('btn-primary');
    btnCancelarEmprestimo.classList.add('d-none');
    dataEmprestimo.value = dataAtualInput();
    alternarCamposFinalizacao();
}

async function prepararEdicao(id) {
    try {
        const response = await fetch(`${API_URL}/emprestimos/${id}`);
        const emprestimo = await response.json();

        if (!response.ok) {
            throw new Error(emprestimo.error || 'Erro ao buscar empréstimo.');
        }

        await carregarCombos(id);
        renderizarStatus(true);
        idEmprestimo.value = emprestimo.id;
        emprestimoEquipamento.value = emprestimo.id_equipamento || '';
        emprestimoColaborador.value = emprestimo.id_colaborador || '';
        dataEmprestimo.value = dataParaInput(emprestimo.data);
        dataPrevistaOriginal = dataParaInput(emprestimo.data_prevista_devolucao);
        dataPrevistaDevolucao.value = dataPrevistaOriginal;
        statusEmprestimo.value = emprestimo.status;
        condicoesEmprestimo.value = emprestimo.condicoes || '';
        dataDevolucao.value = dataParaInput(emprestimo.data_devolucao);
        observacaoDevolucao.value = emprestimo.observacao_devolucao || '';

        tituloEmprestimo.textContent = 'Atualizar';
        alternarCamposTravados(true);
        btnSalvarEmprestimo.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Salvar';
        btnSalvarEmprestimo.classList.remove('btn-primary');
        btnSalvarEmprestimo.classList.add('btn-warning');
        btnCancelarEmprestimo.classList.remove('d-none');
        alternarCamposFinalizacao();

        document.getElementById('areaFormularioEmprestimo').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        mostrarAlerta('danger', error.message);
    }
}

function montarPayload() {
    const status = statusEmprestimo.value;
    const finalizado = STATUS_FINALIZADO.includes(status);
    const fornecido = status === STATUS_FORNECIDO;
    const previsaoIndefinidaOriginal = idEmprestimo.value && dataIndefinida(dataPrevistaOriginal);

    return {
        id_equipamento: emprestimoEquipamento.value,
        id_colaborador: emprestimoColaborador.value,
        data: dataEmprestimo.value,
        data_prevista_devolucao: fornecido || previsaoIndefinidaOriginal ? DATA_INDEFINIDA : dataPrevistaDevolucao.value,
        status,
        condicoes: condicoesEmprestimo.value.trim(),
        data_devolucao: finalizado ? dataDevolucao.value : null,
        observacao_devolucao: finalizado ? observacaoDevolucao.value.trim() : null
    };
}

function dataPosterior(dataFinal, dataInicial) {
    const finalNormalizada = normalizarDataComparacao(dataFinal);
    const inicialNormalizada = normalizarDataComparacao(dataInicial);

    if (!finalNormalizada || !inicialNormalizada) {
        return false;
    }

    return new Date(`${finalNormalizada}T00:00:00`) > new Date(`${inicialNormalizada}T00:00:00`);
}

function normalizarDataComparacao(data) {
    if (!data) {
        return '';
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

formEmprestimo.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fornecido = statusEmprestimo.value === STATUS_FORNECIDO;

    if (!fornecido && !dataPosterior(dataPrevistaDevolucao.value, dataEmprestimo.value)) {
        mostrarAlerta('danger', 'A data prevista de devolução deve ser posterior à data do empréstimo.');
        dataPrevistaDevolucao.focus();
        return;
    }

    if (!fornecido && !idEmprestimo.value && !dataPosterior(dataPrevistaDevolucao.value, dataAtualInput())) {
        mostrarAlerta('danger', 'A data prevista de devolução deve ser posterior à data atual.');
        dataPrevistaDevolucao.focus();
        return;
    }

    if (STATUS_FINALIZADO.includes(statusEmprestimo.value) && !dataPosterior(dataDevolucao.value, dataEmprestimo.value)) {
        mostrarAlerta('danger', 'A data da devolução deve ser posterior à data do empréstimo.');
        dataDevolucao.focus();
        return;
    }

    const id = idEmprestimo.value;
    const responseUrl = id ? `${API_URL}/emprestimos/${id}` : `${API_URL}/emprestimos`;
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(responseUrl, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(montarPayload())
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao salvar empréstimo.');
        }

        mostrarAlerta('success', result.message);
        resetarFormulario();
        await carregarCombos();
        await carregarResumo();
        await carregarEmprestimos(pesquisaEmprestimo.value.trim());
    } catch (error) {
        mostrarAlerta('danger', error.message);
    }
});

statusEmprestimo.addEventListener('change', alternarCamposFinalizacao);

dataEmprestimo.addEventListener('change', alternarCamposFinalizacao);

btnCancelarEmprestimo.addEventListener('click', () => {
    resetarFormulario();
});

btnNovoEmprestimo.addEventListener('click', () => {
    resetarFormulario();
    carregarCombos();
    document.getElementById('areaFormularioEmprestimo').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

btnPesquisarEmprestimo.addEventListener('click', () => {
    carregarEmprestimos(pesquisaEmprestimo.value.trim());
});

pesquisaEmprestimo.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        carregarEmprestimos(pesquisaEmprestimo.value.trim());
    }
});

tabelaEmprestimos.addEventListener('click', (event) => {
    const botaoEditar = event.target.closest('.btn-editar-emprestimo');

    if (botaoEditar) {
        prepararEdicao(botaoEditar.dataset.id);
    }
});

async function inicializar() {
    try {
        renderizarStatus(false);
        dataEmprestimo.value = dataAtualInput();
        alternarCamposFinalizacao();
        await carregarCombos();
        await carregarResumo();
        await carregarEmprestimos();

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');

        if (id) {
            await prepararEdicao(id);
        }
    } catch (error) {
        mostrarAlerta('danger', error.message);
    }
}

inicializar();
