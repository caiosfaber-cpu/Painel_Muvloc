/** Orçamentos, reservas de estoque, prorrogações e histórico. */
const ABA_CONTRATOS = 'Contratos';
const ABA_ITENS = 'ItensContrato';
const CAB_CONTRATOS = ['ID', 'ID cliente', 'Cliente', 'CPF/CNPJ', 'Telefone', 'Endereço',
  'Início', 'Status', 'Valor total', 'Último dia', 'Criado em', 'Atualizado em', 'Finalizado em',
  'Subtotal bruto', 'Tipo desconto', 'Valor informado', 'Desconto aplicado', 'Endereço de locação', 'Horário de encerramento', 'Modalidade', 'Horário de início', 'Fuso horário', 'Frete'];
const CAB_ITENS = ['ID', 'ID contrato', 'Código unidade', 'ID categoria', 'Categoria',
  'Períodos JSON', 'Total de diárias', 'Último dia', 'Subtotal', 'Quantidade', 'Taxa de limpeza (%)', 'Tarifas de prazo aberto JSON'];
const DIAS_FAIXAS = { diaria1: 1, diaria2: 2, diaria3: 3, diaria4: 4, diaria5: 5,
  semana: 7, quinzena: 15, diarias21: 21, mensal: 30 };
const PROP_SEQ_CONTRATOS = 'CONTRATO_SEQUENCE';

function configurarContratos_(planilha) {
  const existente = planilha.getSheetByName(ABA_CONTRATOS);
  if (existente && existente.getLastRow() > 0) {
    const antigo = CAB_CONTRATOS.slice(0, 13);
    const cabecalho = existente.getRange(1, 1, 1, antigo.length).getValues()[0];
    if (cabecalho.join('|') === antigo.join('|')) {
      const adicionais = existente.getRange(1, 14, 1, 4).getValues()[0];
      if (adicionais.every(c => c === ''))
        existente.getRange(1, 14, 1, 4).setValues([CAB_CONTRATOS.slice(13, 17)]);
    }
  }
  ampliarCabecalho_(planilha, ABA_CONTRATOS, CAB_CONTRATOS, 17);
  ampliarCabecalho_(planilha, ABA_CONTRATOS, CAB_CONTRATOS, 19);
  ampliarCabecalho_(planilha, ABA_CONTRATOS, CAB_CONTRATOS, 22);
  const aba = prepararAba_(planilha, ABA_CONTRATOS, CAB_CONTRATOS, ['A:H', 'J:J', 'R:S'], 'I:I');
  corrigirColunaHoraLocacao_(aba, 19);
  aba.getRange('T:V').setNumberFormat('@');
  aba.getRange('N:N').setNumberFormat('"R$" #,##0.00');
  aba.getRange('W:W').setNumberFormat('"R$" #,##0.00');
  aba.getRange('Q:Q').setNumberFormat('"R$" #,##0.00');
  if (aba.getLastRow() > 1) {
    const antigos = aba.getRange(2, 9, aba.getLastRow() - 1, 1).getValues();
    const atuais = aba.getRange(2, 14, aba.getLastRow() - 1, 4).getValues();
    atuais.forEach((linha, i) => {
      if (linha[0] === '')
        aba.getRange(i + 2, 14, 1, 4).setValues([[Number(antigos[i][0]), 'nenhum', 0, 0]]);
    });
  }
  ampliarCabecalho_(planilha, ABA_ITENS, CAB_ITENS, 9);
  ampliarCabecalho_(planilha, ABA_ITENS, CAB_ITENS, 11);
  prepararAba_(planilha, ABA_ITENS, CAB_ITENS, ['A:F', 'H:H'], 'I:I');
}

function abasContratos_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROP_PLANILHA);
  if (!id) throw new Error('Execute configurar no editor do Apps Script.');
  const livro = SpreadsheetApp.openById(id);
  const contratos = livro.getSheetByName(ABA_CONTRATOS);
  const itens = livro.getSheetByName(ABA_ITENS);
  if (!contratos || !itens) throw new Error('Execute novamente configurar para criar as abas de contratos.');
  return { contratos, itens };
}

function lerContratos_(aba) {
  if (aba.getLastRow() < 2) return [];
  const intervalo = aba.getRange(2, 1, aba.getLastRow() - 1, CAB_CONTRATOS.length);
  const exibidos = intervalo.getDisplayValues();
  return intervalo.getValues()
    .map((v, i) => ({ linha: i + 2, id: String(v[0]), clienteId: String(v[1]),
      cliente: String(v[2]), documento: String(v[3]), telefone: String(v[4]),
      endereco: String(v[5]), inicio: String(v[6]), status: String(v[7]),
      total: Number(v[8]), fim: String(v[9]), criado: v[10], finalizado: v[12],
      subtotal: v[13] === '' ? Number(v[8]) : Number(v[13]),
      desconto: { tipo: String(v[14] || 'nenhum'), valor: Number(v[15]) || 0,
        aplicado: Number(v[16]) || 0 }, enderecoLocacao: String(v[17] || v[5]),
      horaFim: lerHoraLocacao_(v[18], exibidos[i][18]), modalidade: String(v[19] || 'FIXO'),
      horaInicio: String(v[20] || ''), fuso: String(v[21] || Session.getScriptTimeZone()), frete: validarFrete_(v[22]) }))
    .filter(c => c.id);
}

function lerItensContrato_(aba) {
  if (aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, CAB_ITENS.length).getValues()
    .map((v, i) => ({ linha: i + 2, id: String(v[0]), contratoId: String(v[1]),
      codigo: String(v[2]), categoriaId: String(v[3]), categoria: String(v[4]),
      blocos: JSON.parse(String(v[5])), diarias: Number(v[6]), fim: String(v[7]), subtotal: Number(v[8]),
      quantidade: Number(v[9]) || 1, taxaLimpeza: v[10] === '' ? null : Number(v[10]), tarifas: v[11] ? JSON.parse(String(v[11])) : null }))
    .filter(item => item.id);
}

function codigosLocados_() {
  const { contratos, itens } = abasContratos_();
  const ativos = new Set(lerContratos_(contratos).filter(c => c.status === 'ATIVO').map(c => c.id));
  return new Set(lerItensContrato_(itens).filter(i => ativos.has(i.contratoId) && !i.codigo.startsWith('QTD-')).map(i => i.codigo));
}

function quantidadesLocadas_() {
  const {contratos, itens} = abasContratos_();
  const ativos = new Set(lerContratos_(contratos).filter(c => c.status === 'ATIVO').map(c => c.id));
  const totais = new Map();
  lerItensContrato_(itens).filter(i => ativos.has(i.contratoId) && i.codigo.startsWith('QTD-'))
    .forEach(i => totais.set(i.categoriaId, (totais.get(i.categoriaId) || 0) + i.quantidade));
  return totais;
}

function listarContratos() {
  const { contratos, itens } = abasContratos_();
  const linhas = lerItensContrato_(itens);
  return lerContratos_(contratos).map(c => ({ id: c.id, cliente: c.cliente,
    documento: c.documento, telefone: c.telefone, endereco: c.endereco,
    modalidade: c.modalidade, horaInicio: c.horaInicio, fuso: c.fuso, inicio: c.inicio, enderecoLocacao: c.enderecoLocacao, horaFim: c.horaFim, status: c.status, subtotal: c.subtotal,
    desconto: c.desconto, frete: c.frete, total: c.total, fim: c.fim,
    finalizadoEm: c.finalizado ? Utilities.formatDate(c.finalizado, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : '',
    itens: linhas.filter(i => i.contratoId === c.id).map(i => ({ id: i.id, inicio: i.blocos[0]?.inicioLocacao || c.inicio, horaInicio: i.blocos[0]?.horaInicioLocacao || c.horaInicio, codigo: i.codigo,
      categoriaId: i.categoriaId, categoria: i.categoria, blocos: i.blocos,
      diarias: i.diarias, fim: i.fim, subtotal: i.subtotal, quantidade: i.quantidade,
      tarifas: i.tarifas, diariasCobertas: i.blocos.reduce((n,b)=>n+b.diarias*(b.vezes||1),0), taxaLimpeza: i.taxaLimpeza, limpezaCondicional: i.taxaLimpeza == null ? null :
        Math.round(i.subtotal * i.taxaLimpeza) / 100 })) }));
}

function calcularOrcamento(dados) {
  return calcularOrcamento_(dados);
}

function calcularOrcamento_(dados, tabelasSalvas) {
  if (!dados || typeof dados !== 'object') throw new Error('Informe o cliente, início e equipamentos.');
  const inicio = validarData_(String(dados.inicio || ''));
  const clienteId = String(dados.clienteId || '');
  const cliente = lerRegistros_(obterAba_()).find(c => c.id === clienteId);
  if (!cliente) throw new Error('Cliente não encontrado. Atualize a página.');
  const clientes = listarClientes();
  const clienteExibido = clientes.find(c => c.id === clienteId);
  const modalidade = String(dados.modalidade || 'FIXO');
  if (!['FIXO','ABERTO'].includes(modalidade)) throw new Error('Modalidade de locação inválida.');
  const aberto = modalidade === 'ABERTO';
  const horaInicio = aberto ? validarHoraAberta_(dados.horaInicio) : '';
  const fuso = tabelasSalvas ? dados.fuso : Session.getScriptTimeZone();
  if(aberto) instanteLocacaoAberta_(inicio, horaInicio, fuso);
  const horaFim = aberto ? '' : (dados.horaFim == null ? '18:00' : String(dados.horaFim));
  if (!aberto && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(horaFim))
    throw new Error('Informe um horário de encerramento válido (HH:mm).');
  const enderecoSolicitado = dados.enderecoLocacao == null ? clienteExibido.endereco : String(dados.enderecoLocacao).trim();
  const enderecoLocacao = clienteExibido.enderecosLocacao.find(e => e === enderecoSolicitado);
  if (!enderecoLocacao) throw new Error('Escolha um endereço de locação cadastrado para este cliente. Se o endereço foi removido, edite o orçamento antes de confirmar.');
  if (!Array.isArray(dados.itens) || !dados.itens.length || dados.itens.length > 200)
    throw new Error('Selecione ao menos uma unidade (máximo de 200).');
  const equip = abasEquipamentos_();
  const categorias = lerCategorias_(equip.cats);
  const unidades = lerUnidades_(equip.unidades);
  const ocupados = codigosLocados_();
  const quantidades = quantidadesLocadas_();
  const usados = new Set();
  const itens = dados.itens.map(entrada => {
    if (!entrada || typeof entrada.codigo !== 'string' || usados.has(entrada.codigo))
      throw new Error('Uma unidade foi selecionada mais de uma vez.');
    usados.add(entrada.codigo);
    const categoriaQuantidade = entrada.codigo.startsWith('QTD-') ?
      categorias.find(c => 'QTD-' + c.id === entrada.codigo && c.tipoControle === 'QUANTIDADE') : null;
    const quantidade = categoriaQuantidade ? validarQuantidade_(entrada.quantidade, false) : 1;
    if (!categoriaQuantidade && entrada.quantidade != null && Number(entrada.quantidade) !== 1)
      throw new Error('Uma unidade individual tem quantidade igual a 1.');
    if (categoriaQuantidade && quantidade > categoriaQuantidade.quantidade - (quantidades.get(categoriaQuantidade.id) || 0))
      throw new Error('Quantidade indisponível para ' + categoriaQuantidade.nome + '. Atualize o estoque.');
    const unidade = categoriaQuantidade ? {codigo: entrada.codigo, categoriaId: categoriaQuantidade.id, manutencao: ''} :
      unidades.find(u => u.codigo === entrada.codigo);
    if (!unidade) throw new Error('Unidade não encontrada: ' + entrada.codigo);
    if (ocupados.has(unidade.codigo)) throw new Error('Unidade já locada: ' + unidade.codigo);
    if (unidade.emManutencao) throw new Error('Unidade parada para manutenção: ' + unidade.codigo);
    const categoria = categorias.find(c => c.id === unidade.categoriaId);
    if (!categoria) throw new Error('Categoria não encontrada para ' + unidade.codigo);
    const salva = aberto && tabelasSalvas ? tabelasSalvas.get(entrada.codigo) : null;
    if(aberto && tabelasSalvas && !salva)throw new Error('Tabela de tarifas não registrada. Edite e recalcule o orçamento.');
    const tarifas = aberto ? validarTarifasAbertas_(salva ? salva.precos : categoria.precos) : null;
    const blocos = aberto ? melhorPrecoAberto_(1, tarifas).blocos : validarFaixas_(entrada.faixas).map(faixa => ({faixa,diarias:DIAS_FAIXAS[faixa],preco:categoria.precos[faixa]}));
    const diarias = aberto ? 1 : blocos.reduce((n,b)=>n+b.diarias,0);
    const fim = aberto ? '' : adicionarDias_(inicio, diarias);
    return { codigo: unidade.codigo, categoriaId: categoria.id, categoria: categoria.nome,
      blocos, diarias, fim, manutencao: unidade.manutencao, quantidade, tarifas, diariasCobertas: blocos.reduce((n,b)=>n+b.diarias*(b.vezes||1),0), taxaLimpeza: salva ? salva.taxaLimpeza : categoria.taxaLimpeza,
      alertaManutencao: !!unidade.manutencao && (aberto || fim >= unidade.manutencao),
      subtotal: subtotalPorQuantidade_(blocos, quantidade) };
  });
  const subtotal = somarValores_(itens.map(i => i.subtotal));
  const desconto = aberto ? descontoPrazoAberto_(subtotal, dados.desconto) : calcularDesconto_(subtotal, dados.desconto);
  const frete = validarFrete_(dados.frete);
  return { clienteId, cliente: clienteExibido.nome, documento: clienteExibido.documento,
    telefone: clienteExibido.telefone, endereco: clienteExibido.endereco,
    inicio, modalidade, horaInicio, fuso, tarifasAssinatura: aberto ? assinaturaTarifasAbertas_(itens) : '', enderecoLocacao, horaFim, itens, subtotal, desconto, frete, total: somarValores_([desconto.total, frete]),
    fim: itens.map(i => i.fim).sort().at(-1) };
}

function confirmarContrato(dados) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { return confirmarContrato_(dados); }
  finally { lock.releaseLock(); }
}

/** Pressupõe que o chamador já possui o bloqueio do script. */
function confirmarContrato_(dados, tabelasSalvas) {
    const cotacao = calcularOrcamento_(dados, tabelasSalvas); // revalida preço e estoque sob bloqueio
    conferirTarifasAbertas_(dados, cotacao);
    if (typeof dados.totalEsperado !== 'number' || cotacao.total !== dados.totalEsperado)
      throw new Error('O preço mudou desde o orçamento. Calcule novamente antes de confirmar.');
    const { contratos, itens } = abasContratos_();
    const props = PropertiesService.getScriptProperties();
    const ultimo = Math.max(Number(props.getProperty(PROP_SEQ_CONTRATOS)) || 0,
      ...lerContratos_(contratos).map(c => Number(c.id.slice(4)) || 0));
    const id = 'LOC-' + String(ultimo + 1).padStart(6, '0');
    const agora = new Date();
    contratos.getRange(contratos.getLastRow() + 1, 1, 1, CAB_CONTRATOS.length).setValues([[
      id, cotacao.clienteId, proteger_(cotacao.cliente), cotacao.documento,
      proteger_(cotacao.telefone), proteger_(cotacao.endereco), cotacao.inicio,
      'ATIVO', cotacao.total, cotacao.fim, agora, agora, '', cotacao.subtotal,
      cotacao.desconto.tipo, cotacao.desconto.valor, cotacao.desconto.aplicado,
      proteger_(cotacao.enderecoLocacao), cotacao.horaFim, cotacao.modalidade, cotacao.horaInicio, cotacao.fuso, cotacao.frete
    ]]);
    const linhas = cotacao.itens.map(i => [Utilities.getUuid(), id, i.codigo, i.categoriaId,
      proteger_(i.categoria), JSON.stringify(i.blocos), i.diarias, i.fim, i.subtotal, i.quantidade, i.taxaLimpeza, i.tarifas ? JSON.stringify(i.tarifas) : '']);
    itens.getRange(itens.getLastRow() + 1, 1, linhas.length, CAB_ITENS.length).setValues(linhas);
    SpreadsheetApp.flush();
    props.setProperty(PROP_SEQ_CONTRATOS, String(ultimo + 1));
    return { id, total: cotacao.total, fim: cotacao.fim, modalidade: cotacao.modalidade };
}

function prorrogarContrato() {
  throw new Error('Use Renegociar para gerar e confirmar um orçamento adicional. Atualize o painel.');
}

function prorrogarContratoLegado_(id, acrescimos, totalEsperado) {
  if (typeof id !== 'string' || !/^LOC-\d{6,}$/.test(id)) throw new Error('Contrato inválido.');
  if (!Array.isArray(acrescimos) || !acrescimos.length || acrescimos.length > 200)
    throw new Error('Informe as unidades e os períodos adicionais.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const abas = abasContratos_();
    const contrato = lerContratos_(abas.contratos).find(c => c.id === id);
    if (!contrato || contrato.status !== 'ATIVO') throw new Error('Somente contratos ativos podem ser prorrogados.');
    if(contrato.modalidade === 'ABERTO')throw new Error('Locação em aberto é calculada no fechamento; não use prorrogação.');
    const itens = lerItensContrato_(abas.itens).filter(i => i.contratoId === id);
    const categorias = lerCategorias_(abasEquipamentos_().cats);
    const vistos = new Set();
    const alterados = acrescimos.map(a => {
      if (!a || typeof a.codigo !== 'string' || vistos.has(a.codigo)) throw new Error('Unidade repetida.');
      vistos.add(a.codigo);
      const item = itens.find(i => i.codigo === a.codigo);
      if (!item) throw new Error('Unidade não encontrada neste contrato: ' + a.codigo);
      const cat = categorias.find(c => c.id === item.categoriaId);
      if (!cat) throw new Error('Categoria da unidade não encontrada.');
      const novos = validarFaixas_(a.faixas).map(faixa => ({ faixa,
        diarias: DIAS_FAIXAS[faixa], preco: cat.precos[faixa] }));
      const blocos = item.blocos.concat(novos);
      const diarias = blocos.reduce((n, b) => n + b.diarias, 0);
      if (diarias > 3650) throw new Error('O limite é de 3.650 diárias por unidade.');
      return { ...item, blocos, diarias, fim: adicionarDias_(item.fim, novos.reduce((n, b) => n + b.diarias, 0)),
        subtotal: subtotalPorQuantidade_(blocos, item.quantidade) };
    });
    const todos = itens.map(i => alterados.find(a => a.id === i.id) || i);
    const subtotal = somarValores_(todos.map(i => i.subtotal));
    const desconto = calcularDesconto_(subtotal, contrato.desconto);
    const total = somarValores_([desconto.total, validarFrete_(contrato.frete)]);
    if (typeof totalEsperado !== 'number' || total !== totalEsperado)
      throw new Error('O preço mudou. Atualize os dados e confira a prorrogação antes de confirmar.');
    const fim = todos.map(i => i.fim).sort().at(-1);
    alterados.forEach(i => abas.itens.getRange(i.linha, 6, 1, 4)
      .setValues([[JSON.stringify(i.blocos), i.diarias, i.fim, i.subtotal]]));
    abas.contratos.getRange(contrato.linha, 9, 1, 2).setValues([[total, fim]]);
    abas.contratos.getRange(contrato.linha, 12).setValue(new Date());
    abas.contratos.getRange(contrato.linha, 14).setValue(subtotal);
    abas.contratos.getRange(contrato.linha, 17).setValue(desconto.aplicado);
    SpreadsheetApp.flush();
    return { id, total, fim };
  } finally { lock.releaseLock(); }
}

function finalizarContrato(id) {
  if (typeof id !== 'string' || !/^LOC-\d{6,}$/.test(id)) throw new Error('Contrato inválido.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const { contratos } = abasContratos_();
    const contrato = lerContratos_(contratos).find(c => c.id === id);
    if (!contrato || contrato.status !== 'ATIVO') throw new Error('Contrato não está ativo.');
    if(contrato.modalidade === 'ABERTO')throw new Error('Calcule e confirme o fechamento da locação em aberto antes de liberar os equipamentos.');
    const agora = new Date();
    contratos.getRange(contrato.linha, 8).setValue('FINALIZADO');
    contratos.getRange(contrato.linha, 12, 1, 2).setValues([[agora, agora]]);
    SpreadsheetApp.flush();
    return true;
  } finally { lock.releaseLock(); }
}

function validarFaixas_(lista) {
  if (!Array.isArray(lista) || !lista.length || lista.length > 100 ||
      lista.some(f => typeof f !== 'string' || !Object.prototype.hasOwnProperty.call(DIAS_FAIXAS, f)))
    throw new Error('Escolha de 1 a 100 períodos válidos por unidade.');
  const total = lista.reduce((n, f) => n + DIAS_FAIXAS[f], 0);
  if (total > 3650) throw new Error('O limite é de 3.650 diárias por unidade.');
  return lista;
}

function adicionarDias_(iso, quantidade) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia + quantidade));
  return data.toISOString().slice(0, 10);
}

function somarValores_(valores) {
  const centavos = valores.reduce((n, valor) => n + Math.round(valor * 100), 0);
  if (!Number.isSafeInteger(centavos)) throw new Error('O valor total excede o limite de cálculo.');
  return centavos / 100;
}

function subtotalPorQuantidade_(blocos, quantidade) {
  const centavos = blocos.reduce((n, b) => n + Math.round(b.preco * 100) * (b.vezes || 1), 0) * quantidade;
  if (!Number.isSafeInteger(centavos)) throw new Error('O valor total das peças excede o limite de cálculo.');
  return centavos / 100;
}

function calcularDesconto_(subtotal, entrada) {
  const tipo = entrada && entrada.tipo ? String(entrada.tipo) : 'nenhum';
  if (!['nenhum', 'valor', 'percentual'].includes(tipo)) throw new Error('Tipo de desconto inválido.');
  if (tipo === 'nenhum') return { tipo, valor: 0, aplicado: 0, total: subtotal };
  const bruto = entrada.valor;
  if ((typeof bruto !== 'string' && typeof bruto !== 'number') || String(bruto).trim() === '')
    throw new Error('Informe o valor do desconto.');
  const valor = Number(String(bruto).replace(',', '.'));
  if (!Number.isFinite(valor) || valor < 0 || Math.round(valor * 100) / 100 !== valor)
    throw new Error('Use um desconto não negativo com até duas casas decimais.');
  if (tipo === 'percentual' && valor > 100) throw new Error('O percentual não pode superar 100%.');
  if (tipo === 'valor' && valor > subtotal) throw new Error('O desconto em reais não pode superar o subtotal.');
  const aplicado = tipo === 'percentual' ? Math.round(Math.round(subtotal * 100) * valor / 100) / 100 : valor;
  return { tipo, valor, aplicado, total: Math.round((subtotal - aplicado) * 100) / 100 };
}

/** Horas digitadas em colunas sem formato de texto podem vir como Date (1899). */
function lerHoraLocacao_(valor, exibido) {
  if (valor === '' || valor == null) return '';
  const candidato = valor instanceof Date ? String(exibido || '') : String(valor);
  const partes = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/.exec(candidato.trim());
  if (partes && Number(partes[1]) < 24) return partes[1].padStart(2, '0') + ':' + partes[2];
  if (valor instanceof Date) return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'HH:mm');
  return candidato;
}
function corrigirColunaHoraLocacao_(aba, coluna) {
  if (aba.getLastRow() > 1) {
    const intervalo = aba.getRange(2, coluna, aba.getLastRow() - 1, 1);
    const valores = intervalo.getValues(), exibidos = intervalo.getDisplayValues();
    valores.forEach((v, i) => {
      if (v[0] instanceof Date) {
        const hora = lerHoraLocacao_(v[0], exibidos[i][0]);
        const celula = aba.getRange(i + 2, coluna);celula.setNumberFormat('@').setValue(hora);
      }
    });
  }
  aba.getRange(1, coluna, aba.getMaxRows(), 1).setNumberFormat('@');
}

/** Frete é um valor por orçamento; descontos e limpeza incidem só nas diárias. */
function validarFrete_(entrada) {
  if (entrada == null || entrada === '') return 0;
  if (typeof entrada !== 'number' && typeof entrada !== 'string')
    throw new Error('Informe um frete válido, não negativo, com até duas casas decimais.');
  const texto=String(entrada).trim();
  if(typeof entrada==='string' && !/^\d+(?:[.,]\d{1,2})?$/.test(texto))
    throw new Error('Informe um frete válido, não negativo, com até duas casas decimais.');
  const valor=Number(texto.replace(',','.'));
  if(!Number.isFinite(valor) || valor<0 || Math.round(valor*100)/100!==valor || !Number.isSafeInteger(Math.round(valor*100)))
    throw new Error('Informe um frete válido, não negativo, com até duas casas decimais.');
  return valor;
}
