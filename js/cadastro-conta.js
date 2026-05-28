const API_URL = 'http://localhost:3000';

const formCadastroConta = document.getElementById('formCadastroConta');
const nomeInput = document.getElementById('nome');
const cpfInput = document.getElementById('cpf');
const senhaInput = document.getElementById('senha');
const mensagem = document.getElementById('mensagem');
const btnCadastrar = document.getElementById('btnCadastrar');

if (localStorage.getItem('usuarioLogado')) {
    window.location.href = 'index.html';
}

function somenteNumeros(valor) {
    return String(valor || '').replace(/\D/g, '').slice(0, 11);
}

function formatarCpf(valor) {
    const cpf = somenteNumeros(valor);

    return cpf
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function mostrarMensagem(tipo, texto) {
    mensagem.innerHTML = `
        <div class="alert alert-${tipo}" role="alert">
            ${texto}
        </div>
    `;
}

cpfInput.addEventListener('input', () => {
    cpfInput.value = formatarCpf(cpfInput.value);
});

formCadastroConta.addEventListener('submit', async (event) => {
    event.preventDefault();

    const cpf = somenteNumeros(cpfInput.value);

    if (cpf.length !== 11) {
        mostrarMensagem('danger', 'CPF deve ter 11 digitos.');
        cpfInput.focus();
        return;
    }

    mensagem.innerHTML = '';
    btnCadastrar.disabled = true;
    btnCadastrar.textContent = 'Cadastrando...';

    try {
        const resposta = await fetch(`${API_URL}/cadastro-conta`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: nomeInput.value,
                cpf,
                senha: senhaInput.value
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || 'Nao foi possivel cadastrar.');
        }

        localStorage.setItem('usuarioLogado', JSON.stringify(dados));
        localStorage.removeItem('usuario');
        window.location.href = 'index.html';
    } catch (error) {
        mostrarMensagem('danger', error.message || 'Erro ao conectar ao servidor.');
    } finally {
        btnCadastrar.disabled = false;
        btnCadastrar.textContent = 'Cadastrar e entrar';
    }
});
