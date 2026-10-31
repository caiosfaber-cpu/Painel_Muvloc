/** Base financeira: recebíveis auditados, lançamentos manuais e relatórios. */
const ABA_AUDITORIA_FINANCEIRA = 'AuditoriaFinanceira';
const ABA_LANCAMENTOS_FINANCEIROS = 'LancamentosFinanceiros';
const CAB_AUDITORIA_FINANCEIRA = ['ID', 'ID contrato', 'Cliente', 'Valor do contrato', 'Valor confirmado',
  'Data de encerramento', 'Competência', 'Vencimento', 'Recebimento', 'Forma de pagamento',
  'Status', 'Observações', 'Criado em', 'Atualizado em', 'Confirmado em', 'Confirmado por', 'ID lançamento'];
const CAB_LANCAMENTOS_FINANCEIROS = ['ID', 'Origem', 'ID de origem', 'Descrição', 'Natureza',
  'Categoria', 'Valor', 'Competência', 'Vencimento', 'Pagamento ou recebimento', 'Status',
  'Forma de pagamento', 'Observações', 'Criado em', 'Atualizado em'];
const FINANCEIRO_FORMAS = ['PIX', 'Dinheiro', 'Débito', 'Crédito', 'Boleto', 'Transferência', 'Outro'];
const FINANCEIRO_NATUREZAS = ['ENTRADA', 'SAIDA', 'INVESTIMENTO'];

function configurarFinanceiro_(planilha) {
  const auditoria = prepararAba_(planilha, ABA_AUDITORIA_FINANCEIRA, CAB_AUDITORIA_FINANCEIRA,
    ['A:C', 'J:J', 'L:L', 'P:Q'], 'D:E');
  const lancamentos = prepararAba_(planilha, ABA_LANCAMENTOS_FINANCEIROS, CAB_LANCAMENTOS_FINANCEIROS,
    ['A:F', 'K:M'], 'G:G');
  auditoria.getRange('D:E').setNumberFormat('"R$" #,##0.00');
  auditoria.getRange('F:I').setNumberFormat('dd/MM/yyyy');
  auditoria.getRange('M:O').setNumberFormat('dd/MM/yyyy HH:mm');
  lancamentos.getRange('G:G').setNumberFormat('"R$" #,##0.00');
  lancamentos.getRange('H:J').setNumberFormat('dd/MM/yyyy');
  lancamentos.getRange('N:O').setNumberFormat('dd/MM/yyyy HH:mm');
  return { auditoria, lancamentos };
}

function abasFinanceiro_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROP_PLANILHA);
  if (!id) throw new Error('Execute configurar no Apps Script antes de abrir o financeiro.');
  const livro = SpreadsheetApp.openById(id);
  const auditoria = livro.getSheetByName(ABA_AUDITORIA_FINANCEIRA);
  const lancamentos = livro.getSheetByName(ABA_LANCAMENTOS_FINANCEIROS);
  if (!auditoria || !lancamentos) throw new Error('Execute configurar novamente para criar as abas financeiras.');
  return { auditoria, lancamentos };
}


function listarLancamentosFinanceiros(filtros = {}) {
  const { lancamentos } = abasFinanceiro_();
  if (lancamentos.getLastRow() < 2) return [];
  const ano = filtros.ano == null || filtros.ano === '' ? '' : validarAnoFinanceiro_(filtros.ano);
  const natureza = String(filtros.natureza || 'TODAS');
  const status = String(filtros.status || 'TODOS');
  const termo = String(filtros.busca || '').trim().toLocaleLowerCase('pt-BR');
  return lancamentos.getRange(2, 1, lancamentos.getLastRow() - 1, CAB_LANCAMENTOS_FINANCEIROS.length).getValues()
    .map((v, i) => ({ linha: i + 2, id: String(v[0]), origem: String(v[1]), origemId: String(v[2]),
      descricao: String(v[3]), natureza: String(v[4]), categoria: String(v[5]), valor: Number(v[6]) || 0,
      competencia: serializarDataFinanceira_(v[7]), vencimento: serializarDataFinanceira_(v[8]),
      pagamento: serializarDataFinanceira_(v[9]), status: String(v[10]), forma: String(v[11] || ''),
      observacoes: String(v[12] || ''), atualizado: v[14] }))
    .filter(x => x.id)
    .filter(x => !ano || (x.competencia || '').startsWith(String(ano)) ||
      ((x.status === 'BAIXADO' ? x.pagamento : x.vencimento) || '').startsWith(String(ano)))
    .filter(x => natureza === 'TODAS' || x.natureza === natureza)
    .filter(x => status === 'TODOS' || x.status === status)
    .filter(x => !termo || [x.id, x.origemId, x.descricao, x.categoria, x.natureza, x.status]
      .some(v => v.toLocaleLowerCase('pt-BR').includes(termo)))
    .sort((a, b) => String(b.pagamento || b.vencimento || b.competencia).localeCompare(
      String(a.pagamento || a.vencimento || a.competencia)) || b.linha - a.linha)
    .slice(0, 1000)
    .map(({ linha, atualizado, ...x }) => x);
}

function validarAnoFinanceiro_(ano) {
  const n = Number(ano);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) throw new Error('Selecione um ano entre 2000 e 2100.');
  return n;
}

function resumoFinanceiro(anoEntrada) {
  const ano = validarAnoFinanceiro_(anoEntrada);
  const { lancamentos } = abasFinanceiro_();
  const linhas = lancamentos.getLastRow() < 2 ? [] :
    lancamentos.getRange(2, 1, lancamentos.getLastRow() - 1, CAB_LANCAMENTOS_FINANCEIROS.length).getValues();
  const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, entradas: 0, despesas: 0,
    investimentos: 0, aReceber: 0, aPagar: 0, investimentosPrevistos: 0 }));
  const categorias = new Map();
  const chaveMes = iso => {
    const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso || '');
    return m && Number(m[1]) === ano ? Number(m[2]) - 1 : -1;
  };
  linhas.forEach(v => {
    const natureza = String(v[4]), status = String(v[10]);
    const iso = status === 'BAIXADO' ? serializarDataFinanceira_(v[9]) :
      serializarDataFinanceira_(v[8]) || serializarDataFinanceira_(v[7]);
    const ix = chaveMes(iso); if (ix < 0) return;
    const valor = Math.round((Number(v[6]) || 0) * 100) / 100, m = meses[ix];
    const nomeCategoria = String(v[5] || 'Sem categoria');
    if (!categorias.has(nomeCategoria)) categorias.set(nomeCategoria, {
      categoria: nomeCategoria, entradas: 0, despesas: 0, investimentos: 0,
      aReceber: 0, aPagar: 0, investimentosPrevistos: 0
    });
    const cat = categorias.get(nomeCategoria);
    if (status === 'BAIXADO') {
      if (natureza === 'ENTRADA') { m.entradas += valor; cat.entradas += valor; }
      else if (natureza === 'SAIDA') { m.despesas += valor; cat.despesas += valor; }
      else if (natureza === 'INVESTIMENTO') { m.investimentos += valor; cat.investimentos += valor; }
    } else if (status === 'PENDENTE') {
      if (natureza === 'ENTRADA') { m.aReceber += valor; cat.aReceber += valor; }
      else if (natureza === 'SAIDA') { m.aPagar += valor; cat.aPagar += valor; }
      else if (natureza === 'INVESTIMENTO') { m.investimentosPrevistos += valor; cat.investimentosPrevistos += valor; }
    }
  });
  meses.forEach(m => {
    for (const k of ['entradas','despesas','investimentos','aReceber','aPagar','investimentosPrevistos'])
      m[k] = Math.round(m[k] * 100) / 100;
    m.saldo = Math.round((m.entradas - m.despesas - m.investimentos) * 100) / 100;
    m.saldoProjetado = Math.round((m.saldo + m.aReceber - m.aPagar - m.investimentosPrevistos) * 100) / 100;
  });
  const totais = meses.reduce((t, m) => {
    for (const k of ['entradas','despesas','investimentos','aReceber','aPagar','investimentosPrevistos'])
      t[k] += m[k];
    t.saldo += m.saldo; t.saldoProjetado += m.saldoProjetado; return t;
  }, { entradas: 0, despesas: 0, investimentos: 0, aReceber: 0, aPagar: 0,
    investimentosPrevistos: 0, saldo: 0, saldoProjetado: 0 });
  for (const k in totais) totais[k] = Math.round(totais[k] * 100) / 100;
  const relatorioCategorias = [...categorias.values()].map(c => {
    for (const k of ['entradas','despesas','investimentos','aReceber','aPagar','investimentosPrevistos'])
      c[k] = Math.round(c[k] * 100) / 100;
    c.participacaoDespesas = totais.despesas ? c.despesas / totais.despesas : null;
    return c;
  }).sort((a,b) => b.despesas - a.despesas || a.categoria.localeCompare(b.categoria, 'pt-BR'));
  return { ano, meses, totais, categorias: relatorioCategorias };
}

function salvarLancamentoFinanceiro(dados) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (!dados || typeof dados !== 'object') throw new Error('Preencha os dados do lançamento.');
    const id = dados.id ? String(dados.id) : 'FIN-MAN-' + Utilities.getUuid();
    if (dados.id && !/^FIN-MAN-[0-9a-f-]{36}$/i.test(id)) throw new Error('Somente lançamentos manuais podem ser editados.');
    const natureza = String(dados.natureza || '');
    if (!FINANCEIRO_NATUREZAS.includes(natureza)) throw new Error('Selecione entrada, saída ou investimento.');
    const descricao = validarTextoFinanceiro_(dados.descricao, 'descrição', 180, true);
    const categoria = validarTextoFinanceiro_(dados.categoria, 'categoria', 80, true);
    const valor = validarValorFinanceiro_(dados.valor);
    const competencia = validarDataFinanceira_(dados.competencia);
    const vencimento = validarDataFinanceira_(dados.vencimento);
    const recebimento = validarDataFinanceira_(dados.pagamento, false);
    const status = String(dados.status || 'PENDENTE');
    if (!['PENDENTE','BAIXADO'].includes(status)) throw new Error('Situação financeira inválida.');
    if (status === 'BAIXADO' && !recebimento) throw new Error('Informe a data em que o valor foi recebido ou pago.');
    if (status === 'PENDENTE' && recebimento) throw new Error('Remova a data de pagamento de um lançamento pendente.');
    const forma = validarTextoFinanceiro_(dados.forma || '', 'forma de pagamento', 40, false);
    if (forma && !FINANCEIRO_FORMAS.includes(forma)) throw new Error('Selecione uma forma de pagamento da lista.');
    const observacoes = validarTextoFinanceiro_(dados.observacoes || '', 'observações', 1000, false);
    const { lancamentos } = abasFinanceiro_();
    const existentes = lancamentos.getLastRow() < 2 ? [] : lancamentos.getRange(2,1,lancamentos.getLastRow()-1,1).getDisplayValues().flat();
    const linha = dados.id ? existentes.indexOf(id) + 2 : lancamentos.getLastRow() + 1;
    if (dados.id && linha < 2) throw new Error('Lançamento não encontrado.');
    const agora = new Date(), criado = dados.id ? lancamentos.getRange(linha,14).getValue() : agora;
    lancamentos.getRange(linha,1,1,CAB_LANCAMENTOS_FINANCEIROS.length).setValues([[
      id, 'MANUAL', '', proteger_(descricao), natureza, proteger_(categoria), valor,
      validarDataFinanceira_(competencia), validarDataFinanceira_(vencimento),
      recebimento ? validarDataFinanceira_(recebimento) : '', status, forma,
      proteger_(observacoes), criado, agora
    ]]);
    SpreadsheetApp.flush();
    return { id, status };
  } finally { lock.releaseLock(); }
}

function registrarPagamentoFinanceiro(id, dados) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const { lancamentos } = abasFinanceiro_();
    const dadosAba = lancamentos.getLastRow() < 2 ? [] :
      lancamentos.getRange(2,1,lancamentos.getLastRow()-1,CAB_LANCAMENTOS_FINANCEIROS.length).getValues();
    const ix = dadosAba.findIndex(v => String(v[0]) === id);
    if (ix < 0) throw new Error('Lançamento financeiro não encontrado.');
    const linha = ix + 2, v = dadosAba[ix];
    const status = String(dados.status || '');
    if (!['PENDENTE','BAIXADO'].includes(status)) throw new Error('Situação inválida.');
    const pagamento = validarDataFinanceira_(dados.pagamento, status === 'BAIXADO');
    lancamentos.getRange(linha,10,1,2).setValues([[pagamento || '', status]]);
    lancamentos.getRange(linha,15).setValue(new Date());
    SpreadsheetApp.flush();
    return { id, status };
  } finally { lock.releaseLock(); }
}

