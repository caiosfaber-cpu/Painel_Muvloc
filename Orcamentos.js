/** Propostas salvas. Não ocupam o estoque até a confirmação do contrato. */
const ABA_ORCAMENTOS = 'Orcamentos';
const ABA_ITENS_ORCAMENTO = 'ItensOrcamento';
const CAB_ORCAMENTOS = ['ID', 'ID cliente', 'Cliente', 'CPF/CNPJ', 'Telefone', 'Endereço',
  'Início', 'Último dia', 'Subtotal', 'Tipo desconto', 'Valor desconto',
  'Desconto aplicado', 'Total', 'Status', 'ID contrato', 'Versão', 'Criado em', 'Atualizado em', 'Endereço de locação', 'Horário de encerramento', 'Modalidade', 'Horário de início', 'Fuso horário'];
const CAB_ITENS_ORCAMENTO = ['ID', 'ID orçamento', 'Código unidade', 'ID categoria',
  'Categoria', 'Períodos JSON', 'Diárias', 'Último dia', 'Subtotal', 'Quantidade', 'Taxa de limpeza (%)', 'Tarifas de prazo aberto JSON'];
const PROP_SEQ_ORCAMENTOS = 'ORCAMENTO_SEQUENCE';

function configurarOrcamentos_(planilha) {
  ampliarCabecalho_(planilha, ABA_ORCAMENTOS, CAB_ORCAMENTOS, 18);
  ampliarCabecalho_(planilha, ABA_ORCAMENTOS, CAB_ORCAMENTOS, 20);
  const orcamentos = prepararAba_(planilha, ABA_ORCAMENTOS, CAB_ORCAMENTOS,
    ['A:H', 'J:K', 'N:O', 'S:T'], 'M:M');
  corrigirColunaHoraLocacao_(orcamentos, 20);
  orcamentos.getRange('U:W').setNumberFormat('@');
  orcamentos.getRange('I:I').setNumberFormat('"R$" #,##0.00');
  orcamentos.getRange('L:L').setNumberFormat('"R$" #,##0.00');
  ampliarCabecalho_(planilha, ABA_ITENS_ORCAMENTO, CAB_ITENS_ORCAMENTO, 9);
  ampliarCabecalho_(planilha, ABA_ITENS_ORCAMENTO, CAB_ITENS_ORCAMENTO, 10);
  ampliarCabecalho_(planilha, ABA_ITENS_ORCAMENTO, CAB_ITENS_ORCAMENTO, 11);
  prepararAba_(planilha, ABA_ITENS_ORCAMENTO, CAB_ITENS_ORCAMENTO,
    ['A:H'], 'I:I');
}

function abasOrcamentos_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROP_PLANILHA);
  if (!id) throw new Error('Execute configurar no editor do Apps Script.');
  const planilha = SpreadsheetApp.openById(id);
  const orcamentos = planilha.getSheetByName(ABA_ORCAMENTOS);
  const itens = planilha.getSheetByName(ABA_ITENS_ORCAMENTO);
  if (!orcamentos || !itens)
    throw new Error('Execute novamente configurar para criar as abas de orçamentos.');
  return { orcamentos, itens };
}

function lerOrcamentos_(aba) {
  if (aba.getLastRow() < 2) return [];
  const intervalo = aba.getRange(2, 1, aba.getLastRow() - 1, CAB_ORCAMENTOS.length);
  const exibidos = intervalo.getDisplayValues();
  return intervalo.getValues()
    .map((v, i) => ({ linha: i + 2, id: String(v[0]), clienteId: String(v[1]),
      cliente: String(v[2]), documento: String(v[3]), telefone: String(v[4]),
      endereco: String(v[5]), inicio: String(v[6]), fim: String(v[7]),
      subtotal: Number(v[8]), desconto: { tipo: String(v[9]), valor: Number(v[10]),
        aplicado: Number(v[11]) }, total: Number(v[12]), status: String(v[13]),
      contratoId: String(v[14] || ''), versao: Number(v[15]), criado: v[16],
      atualizado: v[17], enderecoLocacao: String(v[18] || v[5]), horaFim: lerHoraLocacao_(v[19], exibidos[i][19]), modalidade: String(v[20] || 'FIXO'),
      horaInicio: String(v[21] || ''), fuso: String(v[22] || Session.getScriptTimeZone()) })).filter(o => o.id);
}

function lerItensOrcamento_(aba) {
  if (aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, CAB_ITENS_ORCAMENTO.length).getValues()
    .map((v, i) => ({ linha: i + 2, id: String(v[0]), orcamentoId: String(v[1]),
      codigo: String(v[2]), categoriaId: String(v[3]), categoria: String(v[4]),
      blocos: JSON.parse(String(v[5])), diarias: Number(v[6]), fim: String(v[7]),
      subtotal: Number(v[8]), quantidade: Number(v[9]) || 1, taxaLimpeza: v[10] === '' ? null : Number(v[10]), tarifas: v[11] ? JSON.parse(String(v[11])) : null })).filter(i => i.id);
}

function conferirVersaoOrcamento_(id, versao, linhas) {
  if (typeof id !== 'string' || !/^ORC-\d{6,}$/.test(id))
    throw new Error('Orçamento salvo inválido.');
  const atual = linhas.find(o => o.id === id);
  if (!atual) throw new Error('Orçamento não encontrado. Atualize a lista.');
  if (atual.versao !== versao)
    throw new Error('Este orçamento foi alterado em outra janela. Atualize a lista antes de continuar.');
  return atual;
}

function listarOrcamentosSalvos() {
  const { orcamentos, itens } = abasOrcamentos_();
  const linhas = lerItensOrcamento_(itens);
  const ocupados = codigosLocados_();
  const categorias = listarCategorias();
  const existentes = new Set(lerUnidades_(abasEquipamentos_().unidades)
    .filter(u => !u.emManutencao).map(u => u.codigo));
  return lerOrcamentos_(orcamentos).map(o => ({
    id: o.id, versao: o.versao, clienteId: o.clienteId, cliente: o.cliente,
    documento: o.documento, telefone: o.telefone, endereco: o.endereco,
    modalidade: o.modalidade, horaInicio: o.horaInicio, fuso: o.fuso, inicio: o.inicio, fim: o.fim, enderecoLocacao: o.enderecoLocacao, horaFim: o.horaFim, subtotal: o.subtotal, desconto: o.desconto,
    total: o.total, status: o.status, contratoId: o.contratoId,
    atualizadoEm: o.atualizado instanceof Date ?
      Utilities.formatDate(o.atualizado, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : '',
    itens: linhas.filter(i => i.orcamentoId === o.id).map(i => ({
      codigo: i.codigo, categoriaId: i.categoriaId, categoria: i.categoria,
      blocos: i.blocos, diarias: i.diarias, fim: i.fim, subtotal: i.subtotal, quantidade: i.quantidade, taxaLimpeza: i.taxaLimpeza, tarifas: i.tarifas,
      indisponivel: o.status === 'PENDENTE' &&
        (i.codigo.startsWith('QTD-') ? !categorias.some(c => c.id === i.categoriaId && c.tipoControle === 'QUANTIDADE' &&
          c.quantidadeDisponivel >= i.quantidade) : (ocupados.has(i.codigo) || !existentes.has(i.codigo)))
    }))
  }));
}

function salvarOrcamento(dados) {
  if (!dados || typeof dados !== 'object') throw new Error('Informe os dados do orçamento.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const abas = abasOrcamentos_();
    const atuais = lerOrcamentos_(abas.orcamentos);
    const atual = dados.id ? conferirVersaoOrcamento_(dados.id, dados.versao, atuais) : null;
    if (atual && atual.status !== 'PENDENTE')
      throw new Error('Um orçamento convertido em contrato não pode ser editado.');
    const cotacao = calcularOrcamento_(dados);
    conferirTarifasAbertas_(dados, cotacao);
    if (typeof dados.totalEsperado !== 'number' || cotacao.total !== dados.totalEsperado)
      throw new Error('O preço mudou. Calcule novamente antes de salvar o orçamento.');
    const props = PropertiesService.getScriptProperties();
    const ultimo = atual ? 0 : Math.max(Number(props.getProperty(PROP_SEQ_ORCAMENTOS)) || 0,
      ...atuais.map(o => Number(o.id.slice(4)) || 0));
    const id = atual ? atual.id : 'ORC-' + String(ultimo + 1).padStart(6, '0');
    const versao = atual ? atual.versao + 1 : 1;
    const agora = new Date();
    const linha = atual ? atual.linha : abas.orcamentos.getLastRow() + 1;
    abas.orcamentos.getRange(linha, 1, 1, CAB_ORCAMENTOS.length).setValues([[
      id, cotacao.clienteId, proteger_(cotacao.cliente), cotacao.documento,
      proteger_(cotacao.telefone), proteger_(cotacao.endereco), cotacao.inicio,
      cotacao.fim, cotacao.subtotal, cotacao.desconto.tipo, cotacao.desconto.valor,
      cotacao.desconto.aplicado, cotacao.total, 'PENDENTE', '',
      versao, atual ? atual.criado : agora, agora, proteger_(cotacao.enderecoLocacao), cotacao.horaFim, cotacao.modalidade, cotacao.horaInicio, cotacao.fuso
    ]]);
    if (atual) lerItensOrcamento_(abas.itens).filter(i => i.orcamentoId === id)
      .sort((a, b) => b.linha - a.linha).forEach(i => abas.itens.deleteRow(i.linha));
    const linhas = cotacao.itens.map(i => [Utilities.getUuid(), id, i.codigo, i.categoriaId,
      proteger_(i.categoria), JSON.stringify(i.blocos), i.diarias, i.fim, i.subtotal, i.quantidade, i.taxaLimpeza, i.tarifas ? JSON.stringify(i.tarifas) : '']);
    abas.itens.getRange(abas.itens.getLastRow() + 1, 1, linhas.length, CAB_ITENS_ORCAMENTO.length)
      .setValues(linhas);
    SpreadsheetApp.flush();
    if (!atual) props.setProperty(PROP_SEQ_ORCAMENTOS, String(ultimo + 1));
    return { id, versao, total: cotacao.total };
  } finally { lock.releaseLock(); }
}

function excluirOrcamentoSalvo(id, versao) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const abas = abasOrcamentos_();
    const atual = conferirVersaoOrcamento_(id, versao, lerOrcamentos_(abas.orcamentos));
    lerItensOrcamento_(abas.itens).filter(i => i.orcamentoId === id)
      .sort((a, b) => b.linha - a.linha).forEach(i => abas.itens.deleteRow(i.linha));
    abas.orcamentos.deleteRow(atual.linha);
    SpreadsheetApp.flush();
    return true;
  } finally { lock.releaseLock(); }
}

/** Só a confirmação cria um contrato ativo e reserva o equipamento. */
function confirmarOrcamentoSalvo(id, versao) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const abas = abasOrcamentos_();
    const atual = conferirVersaoOrcamento_(id, versao, lerOrcamentos_(abas.orcamentos));
    if (atual.status !== 'PENDENTE') throw new Error('Este orçamento já foi convertido em contrato.');
    const itens = lerItensOrcamento_(abas.itens).filter(i => i.orcamentoId === id);
    if (!itens.length) throw new Error('Orçamento sem equipamentos. Edite e salve novamente.');
    const dados = { clienteId: atual.clienteId, inicio: atual.inicio, modalidade: atual.modalidade, horaInicio: atual.horaInicio, fuso: atual.fuso,
      enderecoLocacao: atual.enderecoLocacao, horaFim: atual.horaFim || '18:00',
      desconto: { tipo: atual.desconto.tipo, valor: atual.desconto.valor },
      itens: itens.map(i => ({ codigo: i.codigo, quantidade: i.quantidade, faixas: i.blocos.map(b => b.faixa) })),
      totalEsperado: atual.total };
    const tabelasSalvas = atual.modalidade === 'ABERTO' ? new Map(itens.map(i=>[i.codigo,{precos:i.tarifas,taxaLimpeza:i.taxaLimpeza}])) : null;
    if(tabelasSalvas)dados.tarifasEsperadas = assinaturaTarifasAbertas_(itens);
    const contrato = confirmarContrato_(dados, tabelasSalvas);
    abas.orcamentos.getRange(atual.linha, 14, 1, 3)
      .setValues([['CONVERTIDO', contrato.id, atual.versao + 1]]);
    abas.orcamentos.getRange(atual.linha, 18).setValue(new Date());
    SpreadsheetApp.flush();
    return contrato;
  } finally { lock.releaseLock(); }
}
