/** Painel_Muvloc v19 — cadastro, locações e controle financeiro. */
const MUVLOC_VERSAO = 'v19';
const MUVLOC_ABA_ENDERECOS = 'EnderecosLocacao';
const MUVLOC_CAB_ENDERECOS = ['ID', 'ID do cliente', 'Endereço de locação', 'Criado em'];
const MUVLOC_ABA_CLIENTES = 'Clientes';
const MUVLOC_COLUNAS_CLIENTES = ['ID', 'Nome', 'CPF/CNPJ', 'Telefone', 'Endereço', 'Criado em', 'Atualizado em'];
const PROP_PLANILHA = 'CLIENTES_SPREADSHEET_ID';
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Gestão da locadora');
}

function incluir_(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

/** Execute após instalar ou atualizar os arquivos do projeto. */
function configurar() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) throw new Error('Abra o Apps Script pelo menu Extensões da planilha.');
  let aba = planilha.getSheetByName(MUVLOC_ABA_CLIENTES);
  if (!aba) aba = planilha.insertSheet(MUVLOC_ABA_CLIENTES);
  if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, MUVLOC_COLUNAS_CLIENTES.length).setValues([MUVLOC_COLUNAS_CLIENTES]);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, MUVLOC_COLUNAS_CLIENTES.length).setFontWeight('bold').setBackground('#dcebe6');
    aba.getRange('B:E').setNumberFormat('@');
    aba.autoResizeColumns(1, MUVLOC_COLUNAS_CLIENTES.length);
  } else if (aba.getRange(1, 1, 1, MUVLOC_COLUNAS_CLIENTES.length).getValues()[0].join('|') !== MUVLOC_COLUNAS_CLIENTES.join('|')) {
    throw new Error('A aba Clientes já contém dados com cabeçalho diferente. Use outra planilha.');
  }
  prepararAba_(planilha, MUVLOC_ABA_ENDERECOS, MUVLOC_CAB_ENDERECOS, ['A:C']);
  configurarEquipamentos_(planilha);
  configurarContratos_(planilha);
  configurarOrcamentos_(planilha);
  configurarRenegociacoes_(planilha);
  configurarContratoPDF_(planilha);
  configurarFinanceiro_(planilha);
  PropertiesService.getScriptProperties().setProperty(PROP_PLANILHA, planilha.getId());
  sincronizarContratosFinalizadosFinanceiro_();
  return 'Cadastros, contratos, auditoria financeira e lançamentos configurados.';
}

function listarClientes() {
  const aba = obterAba_();
  const adicionais = lerEnderecosLocacao_();
  const ultima = aba.getLastRow();
  if (ultima < 2) return [];
  return aba.getRange(2, 1, ultima - 1, MUVLOC_COLUNAS_CLIENTES.length).getDisplayValues()
    .filter(linha => linha[0])
    .map(linha => ({ id: linha[0], nome: linha[1], documento: linha[2],
      telefone: linha[3], endereco: linha[4], criadoEm: linha[5], atualizadoEm: linha[6],
      enderecosLocacao: [linha[4], ...adicionais.filter(e => e.clienteId === linha[0])
        .map(e => e.endereco)].filter((endereco, i, lista) =>
          lista.findIndex(e => chaveEnderecoLocacao_(e) === chaveEnderecoLocacao_(endereco)) === i) }));
}

function abaEnderecosLocacao_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROP_PLANILHA);
  const aba = id && SpreadsheetApp.openById(id).getSheetByName(MUVLOC_ABA_ENDERECOS);
  if (!aba) throw new Error('Execute configurar para criar o cadastro de endereços de locação.');
  return aba;
}

function lerEnderecosLocacao_() {
  const aba = abaEnderecosLocacao_();
  if (aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, 4).getDisplayValues()
    .map((v,i) => ({linha: i + 2, id: v[0], clienteId: v[1], endereco: v[2], criadoEm: v[3]}))
    .filter(e => e.id);
}

function chaveEnderecoLocacao_(valor) {
  return String(valor).trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function salvarCliente(dados) {
  const cliente = validar_(dados);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const aba = obterAba_();
    const registros = lerRegistros_(aba);
    const atual = cliente.id ? registros.find(r => r.id === cliente.id) : null;
    if (cliente.id && !atual) throw new Error('Cliente não encontrado. Atualize a página.');
    if (registros.some(r => r.documento === cliente.documento && r.id !== cliente.id)) {
      throw new Error('Já existe um cliente com este CPF/CNPJ.');
    }
    const agora = new Date();
    const abaEnderecos = abaEnderecosLocacao_();
    const anteriores = lerEnderecosLocacao_().filter(e => e.clienteId === cliente.id);
    const valores = [cliente.id || Utilities.getUuid(), proteger_(cliente.nome),
      cliente.documento, proteger_(cliente.telefone), proteger_(cliente.endereco),
      atual ? atual.criadoEm : agora, agora];
    const linha = atual ? atual.linha : aba.getLastRow() + 1;
    aba.getRange(linha, 1, 1, MUVLOC_COLUNAS_CLIENTES.length).setValues([valores]);
    if (cliente.enderecosLocacao !== null) {
      anteriores.sort((a,b) => b.linha - a.linha).forEach(e => abaEnderecos.deleteRow(e.linha));
      const novos = cliente.enderecosLocacao.filter(e => chaveEnderecoLocacao_(e) !== chaveEnderecoLocacao_(cliente.endereco));
      if (novos.length) abaEnderecos.getRange(abaEnderecos.getLastRow() + 1, 1, novos.length, 4)
        .setValues(novos.map(endereco => [Utilities.getUuid(), valores[0], proteger_(endereco), agora]));
    }
    SpreadsheetApp.flush();
    return { id: valores[0] };
  } finally {
    lock.releaseLock();
  }
}

function excluirCliente(id) {
  if (typeof id !== 'string' || !id) throw new Error('Cliente inválido.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const aba = obterAba_();
    const atual = lerRegistros_(aba).find(r => r.id === id);
    if (!atual) throw new Error('Cliente não encontrado. Atualize a página.');
    const abaEnderecos = abaEnderecosLocacao_();
    lerEnderecosLocacao_().filter(e => e.clienteId === id).sort((a,b) => b.linha - a.linha)
      .forEach(e => abaEnderecos.deleteRow(e.linha));
    aba.deleteRow(atual.linha);
    SpreadsheetApp.flush();
    return true;
  } finally {
    lock.releaseLock();
  }
}

function obterAba_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROP_PLANILHA);
  if (!id) throw new Error('Execute a função configurar no editor do Apps Script antes de abrir o aplicativo.');
  const aba = SpreadsheetApp.openById(id).getSheetByName(MUVLOC_ABA_CLIENTES);
  if (!aba) throw new Error('A aba Clientes não foi encontrada.');
  return aba;
}

function lerRegistros_(aba) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return [];
  return aba.getRange(2, 1, ultima - 1, MUVLOC_COLUNAS_CLIENTES.length).getValues()
    .map((v, i) => ({ linha: i + 2, id: String(v[0]),
      documento: normalizarDocumento_(String(v[2])), criadoEm: v[5] }))
    .filter(r => r.id);
}

function validar_(dados) {
  if (!dados || typeof dados !== 'object') throw new Error('Preencha os dados do cliente.');
  const texto = (v, max) => {
    if (typeof v !== 'string') throw new Error('Preencha todos os campos corretamente.');
    const s = v.trim();
    if (!s || s.length > max || /[\u0000-\u001F\u007F]/.test(s))
      throw new Error('Confira os campos obrigatórios e seus tamanhos.');
    return s;
  };
  const id = dados.id == null ? '' : String(dados.id);
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('ID inválido.');
  const nome = texto(dados.nome, 150);
  const telefone = texto(dados.telefone, 30);
  const endereco = texto(dados.endereco, 300);
  const documento = normalizarDocumento_(String(dados.documento || ''));
  if (!documentoValido_(documento)) throw new Error('CPF/CNPJ inválido. Confira os dígitos.');
  let enderecosLocacao = null;
  if (dados.enderecosLocacao !== undefined) {
    if (!Array.isArray(dados.enderecosLocacao)) throw new Error('Endereços de locação inválidos.');
    enderecosLocacao = dados.enderecosLocacao.map(e => texto(e, 300))
      .filter((e,i,lista) => lista.findIndex(v => chaveEnderecoLocacao_(v) === chaveEnderecoLocacao_(e)) === i);
  }
  return { id, nome, telefone, endereco, documento, enderecosLocacao };
}

function documentoValido_(d) {
  if (!/^(\d{11}|[A-Z0-9]{12}\d{2})$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  if (d.length === 11) {
    for (let tamanho = 9; tamanho <= 10; tamanho++) {
      let soma = 0;
      for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
      const resto = (soma * 10) % 11;
      if ((resto === 10 ? 0 : resto) !== Number(d[tamanho])) return false;
    }
    return true;
  }
  const pesos = [[5,4,3,2,9,8,7,6,5,4,3,2], [6,5,4,3,2,9,8,7,6,5,4,3,2]];
  for (let k = 0; k < 2; k++) {
    const soma = pesos[k].reduce((total, peso, i) => total + (d.charCodeAt(i) - 48) * peso, 0);
    const resto = soma % 11;
    if ((resto < 2 ? 0 : 11 - resto) !== Number(d[12 + k])) return false;
  }
  return true;
}

function normalizarDocumento_(valor) {
  return valor.toUpperCase().replace(/[.\/\-\s]/g, '');
}

// Impede que textos iniciados com operadores sejam interpretados como fórmulas.
function proteger_(valor) {
  return /^[=+\-@]/.test(valor) ? "'" + valor : valor;
}

/** Acrescenta somente um local, sem substituir o cadastro ou os demais endereços. */
function adicionarEnderecoLocacao(clienteId, endereco) {
  if (typeof clienteId !== 'string' || !clienteId) throw new Error('Selecione um cliente.');
  if (typeof endereco !== 'string' || !endereco.trim() || endereco.trim().length > 300 || /[\u0000-\u001F\u007F]/.test(endereco))
    throw new Error('Informe um endereço válido de até 300 caracteres.');
  const lock = LockService.getScriptLock();lock.waitLock(20000);
  try {
    const cliente = listarClientes().find(c => c.id === clienteId);
    if (!cliente) throw new Error('Cliente não encontrado. Atualize a página.');
    const existente = cliente.enderecosLocacao.find(e => chaveEnderecoLocacao_(e) === chaveEnderecoLocacao_(endereco));
    if (existente) return {cliente, endereco: existente, existente: true};
    const novo = endereco.trim();const aba = abaEnderecosLocacao_();
    aba.getRange(aba.getLastRow() + 1, 1, 1, 4).setValues([[Utilities.getUuid(), clienteId, proteger_(novo), new Date()]]);
    SpreadsheetApp.flush();
    cliente.enderecosLocacao.push(novo);
    return {cliente, endereco: novo, existente: false};
  } finally {lock.releaseLock();}
}
