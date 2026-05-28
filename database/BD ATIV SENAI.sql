CREATE DATABASE sistema_emprestimos;
USE sistema_emprestimos;

-- =========================
-- Tabela base
-- =========================
CREATE TABLE Usuario_Sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100),
    funcao VARCHAR(50),
    senha VARCHAR(100),
    cpf VARCHAR(11)
);

-- =========================
-- Administrador (herança)
-- =========================
CREATE TABLE Administrador (
    id INT PRIMARY KEY,
    status VARCHAR(50),
    FOREIGN KEY (id) REFERENCES Usuario_Sistema(id)
);

-- =========================
-- Login do administrador
-- =========================
CREATE TABLE Login_Administrador (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_administrador INT NOT NULL,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    senha_hash VARCHAR(64) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_administrador) REFERENCES Administrador(id)
);

-- Acesso inicial: CPF 00000000000 / senha admin123
INSERT INTO Usuario_Sistema (nome, funcao, senha, cpf)
VALUES ('Administrador SENAI', 'Administrador', 'admin123', '00000000000');

SET @id_admin_padrao = LAST_INSERT_ID();

INSERT INTO Administrador (id, status)
VALUES (@id_admin_padrao, 'Ativo');

INSERT INTO Login_Administrador (id_administrador, cpf, senha_hash)
VALUES (@id_admin_padrao, '00000000000', SHA2('admin123', 256));

-- =========================
-- Colaborador (herança)
-- =========================
CREATE TABLE Colaborador (
    id INT PRIMARY KEY,
    cargo VARCHAR(50),
    setor VARCHAR(50),
    status VARCHAR(50),
    FOREIGN KEY (id) REFERENCES Usuario_Sistema(id)
);

-- =========================
-- Equipamento
-- =========================
CREATE TABLE Equipamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50),
    modelo VARCHAR(50),
    status VARCHAR(50),
    
    -- Relacionamento: Administrador registra
    id_administrador INT,
    FOREIGN KEY (id_administrador) REFERENCES Administrador(id)
);

-- =========================
-- Emprestimo
-- =========================
CREATE TABLE Emprestimo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    id_usuario INT,
    id_equipamento INT,
    id_colaborador INT,
    
    data DATE,
    data_prevista_devolucao DATE,
    data_devolucao DATE,
    status VARCHAR(50), -- Emprestado, Fornecido, Devolvido, Danificado, Perdido
    condicoes VARCHAR(255),
    observacao_devolucao VARCHAR(255),
    
    FOREIGN KEY (id_usuario) REFERENCES Usuario_Sistema(id),
    FOREIGN KEY (id_equipamento) REFERENCES Equipamento(id),
    FOREIGN KEY (id_colaborador) REFERENCES Colaborador(id)
);

