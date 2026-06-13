(function () {
    const substituicoes = [
        [/Preencha a data e a observação da devolução\/perda\./g, 'Preencha a data e a observação da finalização.'],
        [/Na atualização, altere apenas o status e os campos de devolução\./g, 'Na atualização, altere apenas o status e os campos de finalização.'],
        [/A data da devolução deve ser posterior à data do empréstimo\./g, 'A data da finalização deve ser posterior à data da venda.'],
        [/A data prevista de devolução deve ser posterior à data do empréstimo\./g, 'A data prevista de entrega deve ser posterior à data da venda.'],
        [/A data prevista de devolução deve ser posterior à data atual\./g, 'A data prevista de entrega deve ser posterior à data atual.'],
        [/Empréstimos fornecidos não podem ser editados\./g, 'Vendas concluídas não podem ser editadas.'],
        [/\bColaboradores\b/g, 'Clientes'],
        [/\bcolaboradores\b/g, 'clientes'],
        [/\bColaborador\b/g, 'Cliente'],
        [/\bcolaborador\b/g, 'cliente'],
        [/\bEquipamentos\b/g, 'Produtos'],
        [/\bequipamentos\b/g, 'produtos'],
        [/\bEquipamento\b/g, 'Produto'],
        [/\bequipamento\b/g, 'produto'],
        [/\bEPIs\b/g, 'produtos'],
        [/\bEPI\b/g, 'produto'],
        [/\bEmpréstimos\b/g, 'Vendas'],
        [/\bempréstimos\b/g, 'vendas'],
        [/\bEmprestimos\b/g, 'Vendas'],
        [/\bemprestimos\b/g, 'vendas'],
        [/\bEmpréstimo\b/g, 'Venda'],
        [/\bempréstimo\b/g, 'venda'],
        [/\bEmprestimo\b/g, 'Venda'],
        [/\bemprestimo\b/g, 'venda'],
        [/\bemprestados\b/g, 'vendidos'],
        [/\bemprestado\b/g, 'vendido'],
        [/\bfornecidos\b/g, 'com venda concluída'],
        [/\bfornecido\b/g, 'com venda concluída'],
        [/\bDevolução\b/g, 'Entrega'],
        [/\bdevolução\b/g, 'entrega'],
        [/\bDevolucao\b/g, 'Entrega'],
        [/\bdevolucao\b/g, 'entrega']
    ];

    const statusVenda = {
        Emprestado: 'Venda em aberto',
        Fornecido: 'Venda concluída',
        Devolvido: 'Entregue',
        Danificado: 'Cancelada',
        Perdido: 'Extraviada'
    };

    const statusProduto = {
        Disponível: 'Em estoque',
        Emprestado: 'Vendido',
        Fornecido: 'Venda concluída',
        Danificado: 'Com avaria',
        Perdido: 'Extraviado'
    };

    function traduzirTexto(texto) {
        return substituicoes.reduce(
            (resultado, [padrao, substituto]) => resultado.replace(padrao, substituto),
            String(texto || '')
        );
    }

    window.TextosLoja = {
        traduzirTexto,
        statusVenda: (status) => statusVenda[status] || status || '-',
        statusProduto: (status) => statusProduto[status] || status || '-'
    };
})();
