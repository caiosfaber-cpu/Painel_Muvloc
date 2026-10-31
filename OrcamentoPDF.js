/** Gera o PDF sob demanda; não cria um contrato nem reserva equipamentos. */
function gerarPDFOrcamento(dados) {
  const orcamento = calcularOrcamento_(dados);
  conferirTarifasAbertas_(dados, orcamento);
  if (typeof dados.totalEsperado !== 'number' || orcamento.total !== dados.totalEsperado)
    throw new Error('O preço mudou. Calcule o orçamento novamente antes de gerar o PDF.');
  return gerarPDFOrcamentoDeCotacao_(orcamento);
}

function gerarPDFOrcamentoDeCotacao_(orcamento) {
  const aberto = orcamento.modalidade === 'ABERTO';
  const nomeArquivo = 'Orcamento_Muviloc_' + (orcamento.identificadorPDF ? orcamento.identificadorPDF + '_' : '') + orcamento.inicio + '_' +
    orcamento.cliente.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 35) + '.pdf';
  const doc = DocumentApp.create('Temporario_' + nomeArquivo);
  const idTemporario = doc.getId();
  let resultado;
  let avisoLogo = '';
  try {
    const corpo = doc.getBody();
    try {
      const imagem = Utilities.newBlob(Utilities.base64Decode(LOGO_MUVILOC_PDF_BASE64),
        'image/png', 'Muviloc.png');
      corpo.appendImage(imagem).setWidth(185).setHeight(89);
    } catch (erro) {
      console.warn('Logo não inserida no PDF: ' + erro);
      avisoLogo = 'A logo não pôde ser incluída neste PDF; confira o arquivo OrcamentoPDF.gs do pacote.';
    }
    tituloPDF_(corpo, 'ORÇAMENTO DE LOCAÇÃO');
    paragrafoPDF_(corpo, 'MUVILOC | ALUGUEL DE EQUIPAMENTOS');
    paragrafoPDF_(corpo, 'Emitido em: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'));
    paragrafoPDF_(corpo, orcamento.contratoId?'Documento de orçamento vinculado ao contrato '+orcamento.contratoId+'. Não comprova pagamento. Consulte a situação da proposta e do contrato.':'Este documento apresenta uma proposta de locação. A reserva ocorre somente após a confirmação do contrato.');

    if(orcamento.observacaoPDF)paragrafoPDF_(corpo,orcamento.observacaoPDF);
    if(orcamento.fontesPDF)tabelaPDF_(corpo,[['Orçamentos de origem','Valor'],...orcamento.fontesPDF],true);
    if(aberto)paragrafoPDF_(corpo, TEXTO_PRAZO_ABERTO);
    tituloPDF_(corpo, 'Dados do cliente', DocumentApp.ParagraphHeading.HEADING2);
    tabelaPDF_(corpo, [
      ['Cliente', orcamento.cliente], ['CPF/CNPJ', orcamento.documento],
      ['Telefone', orcamento.telefone], ['Endereço cadastral', orcamento.endereco],
      ['Endereço de locação', orcamento.enderecoLocacao]
    ], false);

    tituloPDF_(corpo, 'Equipamentos e períodos', DocumentApp.ParagraphHeading.HEADING2);
    paragrafoPDF_(corpo, 'Início da locação: ' + dataPDF_(orcamento.inicio) +
      (aberto ? ' às ' + orcamento.horaInicio + ' (' + orcamento.fuso + ') | Sem término definido' : '   |   Último dia previsto: ' + dataPDF_(orcamento.fim) + ' às ' + orcamento.horaFim));
    const linhas = [['Equipamento / código', aberto?'Períodos de referência':'Períodos contratados', 'Diárias', 'Último dia', 'Subtotal']];
    orcamento.itens.forEach(item => linhas.push([
      item.categoria + '\n' + (item.codigo.startsWith('QTD-') ? item.quantidade + ' peças' : item.codigo) + (item.inicio?'\nInício: '+dataPDF_(item.inicio)+(item.horaInicio?' às '+item.horaInicio:''):''),
      item.blocos.map(b => (b.vezes>1?b.vezes+' × ':'') + rotuloPeriodoPDF_(b.faixa) + ' (' + moedaPDF_(b.preco) +
        (item.codigo.startsWith('QTD-') ? ' por peça' : '') + ')').join(' + '),
      aberto ? 'A apurar' : String(item.diarias), aberto ? 'Em aberto' : dataPDF_(item.fim) + ' às ' + orcamento.horaFim, (aberto?'Referência: ':'')+moedaPDF_(item.subtotal)
    ]));
    tabelaPDF_(corpo, linhas, true);

    if(aberto)tarifasPrazoAbertoPDF_(corpo,orcamento.itens,tituloPDF_,tabelaPDF_,moedaPDF_);
    paragrafoPDF_(corpo, (aberto?'Subtotal de referência (1 diária): ':'Subtotal: ') + moedaPDF_(orcamento.subtotal));
    if (orcamento.desconto.tipo !== 'nenhum') {
      const criterio = orcamento.desconto.tipo === 'percentual' ?
        String(orcamento.desconto.valor).replace('.', ',') + '%' : moedaPDF_(orcamento.desconto.valor);
      paragrafoPDF_(corpo, 'Desconto (' + criterio + '): - ' + moedaPDF_(orcamento.desconto.aplicado));
    }
    const total = paragrafoPDF_(corpo, (aberto?'REFERÊNCIA DE 1 DIÁRIA — TOTAL FINAL A APURAR: ':'TOTAL DO ORÇAMENTO: ') + moedaPDF_(orcamento.total));
    total.editAsText().setBold(true).setFontSize(15).setForegroundColor('#000000');
    paragrafoPDF_(corpo, 'Taxas de limpeza condicionais — não incluídas no total:').editAsText().setFontSize(9);
    orcamento.itens.forEach(item => {
      const taxa = Number(item.taxaLimpeza) || 0;
      const valor = Math.round(item.subtotal * taxa) / 100;
      const porPeca = item.quantidade > 1 ? ' no lote (' + moedaPDF_(Math.round(item.subtotal / item.quantidade * taxa) / 100) + ' por peça)' : '';
      paragrafoPDF_(corpo, item.categoria + ' · ' + (item.codigo.startsWith('QTD-') ? item.quantidade + ' peças' : item.codigo) +
        ': ' + taxa + '% = ' + (aberto?'referência provisória ':'') + moedaPDF_(valor) + porPeca + '. Cobrança à parte somente se a devolução exigir limpeza. Base: diárias antes do desconto.' + (aberto?' Valor recalculado sobre as diárias finais apuradas no encerramento.':''))
        .editAsText().setFontSize(9).setForegroundColor('#000000');
    });
    corpo.appendHorizontalRule();
    paragrafoPDF_(corpo, orcamento.contratoId && !aberto ? 'Orçamento vinculado ao contrato '+orcamento.contratoId+'. Valores conforme os períodos e a situação indicados. Não comprova pagamento.' : aberto ? 'Os valores acima são uma referência de 1 diária. O total definitivo será apurado no encerramento conforme a tabela registrada e o tempo utilizado. Este orçamento não confirma pagamento nem reserva equipamentos.' : 'Valores calculados conforme os períodos indicados acima. Este orçamento não confirma pagamento nem reserva os equipamentos.');

    doc.saveAndClose();
    const pdf = DocumentApp.openById(idTemporario).getAs('application/pdf');
    resultado = { nome: nomeArquivo, base64: Utilities.base64Encode(pdf.getBytes()) };
    if (avisoLogo) resultado.aviso = avisoLogo;
  } finally {
    try {
      DriveApp.getFileById(idTemporario).setTrashed(true);
    } catch (erro) {
      // A limpeza não pode ocultar o PDF já convertido (nem o erro original).
      console.warn('Não foi possível mover o documento temporário ' + idTemporario + ' para a lixeira: ' + erro);
      if (resultado) resultado.aviso = (resultado.aviso ? resultado.aviso + ' ' : '') +
        'O documento temporário permaneceu no Drive. Autorize o acesso ao Drive no editor do Apps Script e remova o arquivo Temporario_ quando possível.';
    }
  }
  return resultado;
}

function tituloPDF_(corpo, texto, tipo) {
  const titulo = corpo.appendParagraph(texto).setHeading(tipo || DocumentApp.ParagraphHeading.HEADING1);
  titulo.editAsText().setForegroundColor('#000000');
}

function paragrafoPDF_(corpo, texto) {
  const paragrafo = corpo.appendParagraph(texto);
  paragrafo.editAsText().setForegroundColor('#000000');
  return paragrafo;
}

function tabelaPDF_(corpo, linhas, cabecalho) {
  const tabela = corpo.appendTable(linhas);
  for (let linha = 0; linha < linhas.length; linha++) {
    for (let coluna = 0; coluna < linhas[linha].length; coluna++) {
      const celula = tabela.getRow(linha).getCell(coluna);
      const texto = celula.editAsText().setForegroundColor('#000000');
      if (cabecalho && linha === 0) {
        celula.setBackgroundColor('#f2e8d8');
        texto.setBold(true);
      }
    }
  }
}

function dataPDF_(iso) {
  return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
}

function moedaPDF_(valor) {
  return 'R$ ' + Number(valor).toLocaleString('pt-BR',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function rotuloPeriodoPDF_(faixa) {
  return ({ diaria1: '01 diária', diaria2: '02 diárias', diaria3: '03 diárias',
    diaria4: '04 diárias', diaria5: '05 diárias', semana: 'Semana',
    quinzena: 'Quinzena', diarias21: '21 diárias', mensal: 'Mensal' })[faixa] || faixa;
}

// Imagem da Muviloc otimizada para o PDF (333 x 161 px).
const LOGO_MUVILOC_PDF_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAU0AAAChCAMAAAB03x27AAAAwFBMVEVjX1mljGVdSS8eHx1+fYB+g4mJXh/CrqXe3OI8QUeAf4KcoqjUqdRDPzulflnW0Lf+/v4CBAJyRgLr6efZ1dHNycaSd1AUFhWGZTXPxbi4ppHGuasnKCh5WSc2NjdmPQF5UxiqlHfi2tS3trerqKlGRkdoaGlWVlZ2dniIbESjimvn4tyIh4mtm4WCXCmZhWiWlZeZglt9YzLCspyBWBpaOAObnKO9sZu8u8MdISPBrZkjIRuinaM4PUOMfW3EvMTp+MoiAAAAQHRSTlP/////////////////////////////////////////////////////////////////////////////////////73leyQAAEctJREFUeNrtnYl2m7gagN1t2lnuvQQJzGIM2HgDL1nbNO207/9WV4CQfgkJcJqZkkaac6ZJDBg+/buENLFMe7o2MQgMTUPT0DTtl6SJDM2nayfbxYbm07TQi2PbPi0MzSdQ8h1BWbXA0PzRdhPZrOXI0PyRltq1YMZUPg+G5qPbwiMQYxu02DU0H9fwCVBkP2BD83FKDprXEDU0H9McF7J0rCJIatkMDM3zw/UYKHntevL617QyAgdsaA5tAYiKWBYU1L+eKsmNkxQbmkPaARrMnGVAfi2uu0o2y593jqHZGxXtAMsECCCuaUbVQbVTcg3NzlYInvwEcx9kc5qImoLkYGh21DdgoB5Jmnxd/70of2Yef4cMzQFRkX1oOKGw/pd+6ldqz43BARmaPYJp2yGzl14cQu/0CXp4ztfQ1Apmcigap1Sml0tIO60/uIFBlG9oCnLpATjXn9jfc1DYXNg8RCoNAIykXMfQVEZFjfABgDSbjLhTr20ADPKvDE2a5SQwJw/bppTSpPLLvQ6CSVMUGJow2mmPVqTCH6kEw5QSQQuxMzQF75xKI2k7QffremcsuBxBPENDk4um2xqVpKRygbvEDF2pLO5LpbmztVmib4O6EbOirePCaCSeaAQ0Pf3wbiO2tLrhCL+RpF7m6RqaOymfCZjsoUSkuRBpIi/nOGNDk9NMWE5+5GLq2CJNWkXy+McsnPKNbAJ1Tuog0q81diF5+4YSNbD0tyVwSYZmm2ZxFPyMKweS1MQKwWgOaO4MTZeLY+PD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';
