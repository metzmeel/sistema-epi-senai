# Sistema de Gerenciamento de EPIs

Projeto desenvolvido para a atividade de Desenvolvimento de Sistemas. O sistema visa controlar o cadastro de colaboradores de uma indústria do setor têxtil.

## 🚀 Status do Projeto
- [x] Tela Base (Home e Menu Lateral) implementada.
- [x] Cadastro e listagem de Colaboradores implementados.
- [x] Separação de arquivos CSS e JS concluída.
- [ ] Cadastro de Equipamentos (Pendente).
- [ ] Controle de EPI / Empréstimos (Pendente).

## 💻 Tecnologias Utilizadas
- HTML5, CSS3 e Bootstrap 5 (Front-end)
- Node.js com Express (Back-end)
- MySQL (Banco de Dados)

## ⚙️ Como executar o projeto

1. **Configurando o Banco de Dados:**
   - Abra o XAMPP e inicie os módulos Apache e MySQL.
   - Acesse o phpMyAdmin no navegador (`http://localhost/phpmyadmin/`).
   - Crie um banco de dados chamado `sistema_emprestimos`.
   - Importe o arquivo `BD ATIV SENAI.sql` (que está dentro da pasta /database) para dentro desse banco recém-criado.

2. **Iniciando o Servidor (Back-end):**
   - Abra o terminal na pasta raiz do projeto.
   - Instale as dependências necessárias rodando o comando: 
     `npm install`
   - Inicie o servidor rodando o comando: 
     `node server.js`

3. **Acessando o Sistema:**
   - Com o servidor rodando e o banco conectado, abra o arquivo **`index.html`** diretamente no seu navegador para acessar a Tela Base do sistema.

## 🐳 Pesquisa: Integração com Dockerfile

Para integrar o Docker neste projeto, criaríamos um arquivo chamado `Dockerfile` na raiz do projeto, sem extensão. Esse arquivo funcionaria como uma receita para empacotar o nosso servidor Node.js em um ambiente isolado (contêiner). 

Um exemplo de como esse arquivo ficaria no nosso projeto:

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]