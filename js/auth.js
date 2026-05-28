(function () {
    const CHAVE_USUARIO = 'usuarioLogado';
    const CHAVE_ANTIGA = 'usuario';
    const paginaAtual = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const paginaLogin = paginaAtual === 'login.html';

    function obterUsuario() {
        const dados = localStorage.getItem(CHAVE_USUARIO) || localStorage.getItem(CHAVE_ANTIGA);

        if (!dados) {
            return null;
        }

        try {
            return JSON.parse(dados);
        } catch (error) {
            localStorage.removeItem(CHAVE_USUARIO);
            localStorage.removeItem(CHAVE_ANTIGA);
            return null;
        }
    }

    function salvarUsuario(usuario) {
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
        localStorage.removeItem(CHAVE_ANTIGA);
    }

    function logout() {
        localStorage.removeItem(CHAVE_USUARIO);
        localStorage.removeItem(CHAVE_ANTIGA);
        window.location.href = 'login.HTML';
    }

    function atualizarPerfil(usuario) {
        const nome = usuario?.nome || 'Administrador';
        const funcao = usuario?.funcao || 'Administrador';
        const userName = document.querySelector('.user-name');
        const userRole = document.querySelector('.user-role');
        const avatar = document.querySelector('.user-profile img');
        const logoutLink = document.querySelector('.sidebar-footer a');

        if (userName) {
            userName.textContent = nome;
        }

        if (userRole) {
            userRole.textContent = funcao;
        }

        if (avatar) {
            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=2563eb&color=fff`;
            avatar.alt = `Foto de ${nome}`;
        }

        if (logoutLink) {
            logoutLink.href = 'login.HTML';
            logoutLink.addEventListener('click', (event) => {
                event.preventDefault();
                logout();
            });
        }
    }

    const usuario = obterUsuario();

    if (!paginaLogin && !usuario) {
        window.location.href = 'login.HTML';
        return;
    }

    if (!paginaLogin && usuario) {
        atualizarPerfil(usuario);
    }

    window.SisEPIAuth = {
        obterUsuario,
        salvarUsuario,
        logout
    };
})();
