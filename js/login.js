const API_URL = 'http://localhost:3000';

const formLogin = document.getElementById('formLogin');
const cpfInput = document.getElementById('cpf');
const senhaInput = document.getElementById('senha');
const mensagem = document.getElementById('mensagem');
const btnLogin = document.getElementById('btnLogin');

if (localStorage.getItem('usuarioLogado')) {
    window.location.href = 'index.html';
}

function somenteNumeros(valor) {
    return String(valor || '').replace(/\D/g, '').slice(0, 11);
}

function formatarCpf(valor) {
    const cpf = somenteNumeros(valor).slice(0, 11);

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

formLogin.addEventListener('submit', async (event) => {
    event.preventDefault();
    const cpf = somenteNumeros(cpfInput.value);

    if (cpf.length !== 11) {
        mostrarMensagem('danger', 'CPF deve ter 11 digitos.');
        cpfInput.focus();
        return;
    }

    mensagem.innerHTML = '';
    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando...';

    try {
        const resposta = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cpf,
                senha: senhaInput.value
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || 'Nao foi possivel entrar.');
        }

        localStorage.setItem('usuarioLogado', JSON.stringify(dados));
        localStorage.removeItem('usuario');
        window.location.href = 'index.html';
    } catch (error) {
        mostrarMensagem('danger', error.message || 'Erro ao conectar ao servidor.');
    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
    }
});
