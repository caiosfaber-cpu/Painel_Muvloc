/** Categorias de locação e unidades físicas, na mesma planilha dos clientes. */
const ABA_CATEGORIAS = 'Categorias';
const ABA_UNIDADES = 'Unidades';
const ABA_HISTORICO_MANUTENCAO = 'HistoricoManutencao';
const ABA_LEGADA = 'Equipamentos';
const CHAVES_PRECOS = ['diaria1', 'diaria2', 'diaria3', 'diaria4', 'diaria5', 'semana', 'quinzena', 'diarias21', 'mensal'];
const CAB_CATEGORIAS = ['ID', 'Nome', '01 diária', '02 diárias', '03 diárias', '04 diárias',
  '05 diárias', 'Semana', 'Quinzena', '21 diárias', 'Mensal', 'Criado em', 'Atualizado em',
  'Tipo de controle', 'Quantidade total', 'Taxa de limpeza (%)'];
const CAB_UNIDADES = ['Código', 'ID da categoria', 'Próxima manutenção', 'Criado em', 'Atualizado em', 'Em manutenção', 'Retorno previsto', 'Dispensa manutenção', 'Observação atual'];
const CAB_HISTORICO_MANUTENCAO = ['ID', 'Código da unidade', 'Ocorrência', 'Registrado em', 'Observação', 'Retorno previsto', 'Próxima manutenção'];
const CAB_LEGADO = ['Código', 'Nome', 'Próxima manutenção', ...CAB_CATEGORIAS.slice(2, 11), 'Criado em', 'Atualizado em'];
const PROP_SEQ_UNIDADES = 'EQUIP_SEQUENCE';
const PROP_MODELO = 'EQUIP_MODEL_VERSION';

function configurarEquipamentos_(planilha) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const legado = planilha.getSheetByName(ABA_LEGADA);
    let registros = [];
    if (legado && legado.getLastRow() > 0) {
      if (legado.getRange(1, 1, 1, CAB_LEGADO.length).getValues()[0].join('|') !== CAB_LEGADO.join('|'))
        throw new Error('A aba Equipamentos antiga tem um cabeçalho inesperado. Nenhum dado foi alterado.');
      if (legado.getLastRow() > 1) registros = legado.getRange(2, 1, legado.getLastRow() - 1, CAB_LEGADO.length).getValues().filter(r => r[0]);
    }
    ampliarCabecalho_(planilha, ABA_CATEGORIAS, CAB_CATEGORIAS, 13);
    const cats = prepararAba_(planilha, ABA_CATEGORIAS, CAB_CATEGORIAS, ['A:B'], 'C:K');
    const abaUnidades = planilha.getSheetByName(ABA_UNIDADES);
    if (abaUnidades && abaUnidades.getLastRow() > 0) {
      const antigo = CAB_UNIDADES.slice(0, 5);
      if (abaUnidades.getRange(1, 1, 1, 5).getValues()[0].join('|') === antigo.join('|') &&
          abaUnidades.getRange(1, 6, 1, 2).getValues()[0].every(v => v === '')) {
        abaUnidades.getRange(1, 6, 1, 2).setValues([CAB_UNIDADES.slice(5, 7)]);
        abaUnidades.getRange(1, 6, 1, 2).setFontWeight('bold').setBackground('#dcebe6');
        abaUnidades.getRange('G:G').setNumberFormat('@');
      }
    }
    if (abaUnidades && abaUnidades.getLastRow() > 0 &&
        abaUnidades.getRange(1, 1, 1, 7).getValues()[0].join('|') === CAB_UNIDADES.slice(0, 7).join('|') &&
        abaUnidades.getRange(1, 8, 1, 2).getValues()[0].every(v => v === '')) {
      abaUnidades.getRange(1, 8, 1, 2).setValues([CAB_UNIDADES.slice(7)]);
      abaUnidades.getRange(1, 8, 1, 2).setFontWeight('bold').setBackground('#dcebe6');
    }
    const unidades = prepararAba_(planilha, ABA_UNIDADES, CAB_UNIDADES, ['A:C', 'G:G']);
    prepararAba_(planilha, ABA_HISTORICO_MANUTENCAO, CAB_HISTORICO_MANUTENCAO, ['A:C', 'E:G']);
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty(PROP_MODELO) === '2') return;
    if (registros.length && (cats.getLastRow() > 1 || unidades.getLastRow() > 1))
      throw new Error('Já há dados em Categorias ou Unidades. Verifique a migração antes de executar configurar novamente.');
    if (registros.length) {
      const grupos = new Map();
      const codigos = new Set();
      const novasUnidades = [];
      registros.forEach(r => {
        const codigo = String(r[0]);
        if (!/^EQP-\d{6,}$/.test(codigo) || codigos.has(codigo))
          throw new Error('Há códigos antigos inválidos ou repetidos. Corrija a aba Equipamentos e tente novamente.');
        codigos.add(codigo);
        const nome = validarNome_(String(r[1]));
        const data = validarData_(String(r[2]));
        const precos = CHAVES_PRECOS.map((chave, i) => validarPreco_(r[i + 3]));
        const chave = chaveNome_(nome);
        if (grupos.has(chave) && JSON.stringify(grupos.get(chave).precos) !== JSON.stringify(precos))
          throw new Error('A categoria "' + nome + '" tem preços diferentes nos registros antigos. Uniformize os valores na aba Equipamentos e execute configurar novamente. Nenhum registro antigo foi alterado.');
        if (!grupos.has(chave)) grupos.set(chave, { id: Utilities.getUuid(), nome, precos, criado: r[12], atualizado: r[13] });
        novasUnidades.push({ codigo, chave, data, criado: r[12], atualizado: r[13] });
      });
      const novosGrupos = [...grupos.values()];
      cats.getRange(2, 1, novosGrupos.length, CAB_CATEGORIAS.length).setValues(
        novosGrupos.map(g => [g.id, proteger_(g.nome), ...g.precos, g.criado, g.atualizado, 'INDIVIDUAL', 0, 0]));
      unidades.getRange(2, 1, novasUnidades.length, CAB_UNIDADES.length).setValues(
        novasUnidades.map(u => [u.codigo, grupos.get(u.chave).id, u.data, u.criado, u.atualizado, 'NÃO', '', 'NÃO', '']));
      const maximo = Math.max(Number(props.getProperty(PROP_SEQ_UNIDADES)) || 0,
        ...novasUnidades.map(u => Number(u.codigo.slice(4))));
      props.setProperty(PROP_SEQ_UNIDADES, String(maximo));
    }
    SpreadsheetApp.flush();
    props.setProperty(PROP_MODELO, '2');
    // A aba antiga fica intacta para conferência. As operações passam a usar Categorias e Unidades.
  } finally { lock.releaseLock(); }
}

function ampliarCabecalho_(planilha, nome, cabecalho, tamanhoAntigo) {
  const aba = planilha.getSheetByName(nome);
  if (!aba || !aba.getLastRow()) return;
  if (aba.getRange(1, 1, 1, tamanhoAntigo).getValues()[0].join('|') === cabecalho.slice(0, tamanhoAntigo).join('|') &&
      aba.getRange(1, tamanhoAntigo + 1, 1, cabecalho.length - tamanhoAntigo).getValues()[0].every(v => v === '')) {
    aba.getRange(1, tamanhoAntigo + 1, 1, cabecalho.length - tamanhoAntigo).setValues([cabecalho.slice(tamanhoAntigo)]);
  }
}

function prepararAba_(planilha, nome, cabecalho, texto, dinheiro) {
  let aba = planilha.getSheetByName(nome);
  if (!aba) aba = planilha.insertSheet(nome);
  if (aba.getLastRow() === 0) {
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, cabecalho.length).setFontWeight('bold').setBackground('#dcebe6');
    texto.forEach(intervalo => aba.getRange(intervalo).setNumberFormat('@'));
    if (dinheiro) aba.getRange(dinheiro).setNumberFormat('"R$" #,##0.00');
    aba.autoResizeColumns(1, cabecalho.length);
  } else if (aba.getRange(1, 1, 1, cabecalho.length).getValues()[0].join('|') !== cabecalho.join('|')) {
    throw new Error('A aba ' + nome + ' tem cabeçalho diferente do esperado.');
  }
  return aba;
}

function abasEquipamentos_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROP_PLANILHA);
  if (!id) throw new Error('Execute configurar no editor do Apps Script.');
  const planilha = SpreadsheetApp.openById(id);
  const cats = planilha.getSheetByName(ABA_CATEGORIAS);
  const unidades = planilha.getSheetByName(ABA_UNIDADES);
  if (!cats || !unidades || PropertiesService.getScriptProperties().getProperty(PROP_MODELO) !== '2')
    throw new Error('Execute novamente configurar para criar as categorias e unidades.');
  const historico = planilha.getSheetByName(ABA_HISTORICO_MANUTENCAO);
  if (!historico) throw new Error('Execute novamente configurar para criar o histórico de manutenção.');
  return { cats, unidades, historico };
}

function lerCategorias_(aba) {
  if (aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, CAB_CATEGORIAS.length).getValues()
    .map((v, i) => ({ linha: i + 2, id: String(v[0]), nome: String(v[1]),
      precos: Object.fromEntries(CHAVES_PRECOS.map((chave, j) => [chave, Number(v[j + 2])])), criado: v[11],
      tipoControle: String(v[13] || 'INDIVIDUAL'), quantidade: Number(v[14]) || 0,
      taxaLimpeza: Number(v[15]) || 0 }))
    .filter(c => c.id);
}

function lerUnidades_(aba) {
  if (aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, CAB_UNIDADES.length).getValues()
    .map((v, i) => ({ linha: i + 2, codigo: String(v[0]), categoriaId: String(v[1]),
      manutencao: String(v[2]), criado: v[3], emManutencao: String(v[5]) === 'SIM',
      retornoPrevisto: String(v[6] || ''), semManutencao: String(v[7]) === 'SIM',
      observacaoAtual: String(v[8] || '') })).filter(u => u.codigo);
}

function listarCategorias() {
  const abas = abasEquipamentos_();
  const unidades = lerUnidades_(abas.unidades);
  const ocupados = codigosLocados_();
  const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const quantidades = quantidadesLocadas_();
  return lerCategorias_(abas.cats).map(c => ({ id: c.id, nome: c.nome, precos: c.precos,
    tipoControle: c.tipoControle, quantidade: c.quantidade, taxaLimpeza: c.taxaLimpeza,
    quantidadeLocada: quantidades.get(c.id) || 0,
    quantidadeDisponivel: Math.max(0, c.quantidade - (quantidades.get(c.id) || 0)),
    unidades: c.tipoControle === 'QUANTIDADE' ? [{ codigo: 'QTD-' + c.id, semManutencao: true,
      manutencao: '', diasParaManutencao: null, emManutencao: false, porQuantidade: true,
      quantidadeDisponivel: Math.max(0, c.quantidade - (quantidades.get(c.id) || 0)),
      locado: c.quantidade <= (quantidades.get(c.id) || 0) }] : unidades.filter(u => u.categoriaId === c.id).map(u => ({ codigo: u.codigo,
      manutencao: u.manutencao, diasParaManutencao: u.semManutencao ? null :
        Math.round((Date.parse(u.manutencao + 'T00:00:00Z') - Date.parse(hoje + 'T00:00:00Z')) / 86400000),
      semManutencao: u.semManutencao, emManutencao: u.emManutencao,
      retornoPrevisto: u.retornoPrevisto, observacaoAtual: u.observacaoAtual,
      locado: ocupados.has(u.codigo) })) }));
}

function salvarCategoria(dados) {
  if (!dados || typeof dados !== 'object') throw new Error('Informe os dados da categoria.');
  const id = dados.id == null ? '' : String(dados.id);
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('ID da categoria inválido.');
  const nome = validarNome_(dados.nome);
  if (!dados.precos || typeof dados.precos !== 'object') throw new Error('Informe todos os preços.');
  const precos = CHAVES_PRECOS.map(chave => validarPreco_(dados.precos[chave]));
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const { cats } = abasEquipamentos_();
    const existentes = lerCategorias_(cats);
    const atual = id ? existentes.find(c => c.id === id) : null;
    if (id && !atual) throw new Error('Categoria não encontrada. Atualize a página.');
    const tipoControle = String(dados.tipoControle || atual?.tipoControle || 'INDIVIDUAL');
    if (!['INDIVIDUAL', 'QUANTIDADE'].includes(tipoControle)) throw new Error('Tipo de controle inválido.');
    const quantidade = tipoControle === 'QUANTIDADE' ? validarQuantidade_(dados.quantidade ?? atual?.quantidade ?? 0, true) : 0;
    const taxaLimpeza = validarPreco_(dados.taxaLimpeza ?? atual?.taxaLimpeza ?? 0);
    if (taxaLimpeza > 100) throw new Error('A taxa de limpeza deve estar entre 0% e 100%.');
    if (atual && atual.tipoControle !== tipoControle &&
        (atual.quantidade || lerUnidades_(abasEquipamentos_().unidades).some(u => u.categoriaId === id) ||
          lerItensContrato_(abasContratos_().itens).some(i => i.categoriaId === id)))
      throw new Error('O tipo de controle não pode mudar enquanto houver estoque ou contratos registrados nesta categoria.');
    if (quantidade < (quantidadesLocadas_().get(id) || 0)) throw new Error('O total não pode ser menor que a quantidade locada.');
    if (existentes.some(c => c.id !== id && chaveNome_(c.nome) === chaveNome_(nome)))
      throw new Error('Já existe uma categoria com este nome.');
    const agora = new Date();
    const categoriaId = id || Utilities.getUuid();
    cats.getRange(atual ? atual.linha : cats.getLastRow() + 1, 1, 1, CAB_CATEGORIAS.length)
      .setValues([[categoriaId, proteger_(nome), ...precos, atual ? atual.criado : agora, agora,
        tipoControle, quantidade, taxaLimpeza]]);
    SpreadsheetApp.flush();
    return { id: categoriaId };
  } finally { lock.releaseLock(); }
}

function excluirCategoria(id) {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Categoria inválida.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const { cats, unidades } = abasEquipamentos_();
    const atual = lerCategorias_(cats).find(c => c.id === id);
    if (!atual) throw new Error('Categoria não encontrada.');
    if (atual.tipoControle === 'QUANTIDADE' && (atual.quantidade || quantidadesLocadas_().get(id)))
      throw new Error('Zere o estoque e finalize os contratos antes de excluir esta categoria.');
    if (lerUnidades_(unidades).some(u => u.categoriaId === id))
      throw new Error('Exclua primeiro as unidades desta categoria.');
    cats.deleteRow(atual.linha); SpreadsheetApp.flush(); return true;
  } finally { lock.releaseLock(); }
}

function salvarUnidade(dados) {
  if (!dados || typeof dados !== 'object') throw new Error('Informe os dados da unidade.');
  const codigo = dados.codigo == null ? '' : String(dados.codigo);
  if (codigo && !/^EQP-\d{6,}$/.test(codigo)) throw new Error('Código inválido.');
  const categoriaId = String(dados.categoriaId || '');
  if (!/^[0-9a-f-]{36}$/i.test(categoriaId)) throw new Error('Categoria inválida.');
  const semManutencao = dados.semManutencao === true;
  const manutencao = semManutencao ? '' : validarData_(String(dados.manutencao || ''));
  const emManutencao = dados.emManutencao === true;
  const retornoPrevisto = emManutencao ? validarData_(String(dados.retornoPrevisto || '')) : '';
  const observacao = validarObservacaoManutencao_(dados.observacao);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const { cats, unidades, historico } = abasEquipamentos_();
    const categoria = lerCategorias_(cats).find(c => c.id === categoriaId);
    if (!categoria) throw new Error('Categoria não encontrada.');
    if (categoria.tipoControle === 'QUANTIDADE') throw new Error('Esta categoria usa estoque por quantidade, sem unidades individuais.');
    const registros = lerUnidades_(unidades);
    const atual = codigo ? registros.find(u => u.codigo === codigo) : null;
    if (codigo && (!atual || atual.categoriaId !== categoriaId))
      throw new Error('Unidade não encontrada nesta categoria. Atualize a página.');
    if (emManutencao && codigo && codigosLocados_().has(codigo))
      throw new Error('Finalize o contrato antes de parar esta unidade para manutenção.');
    if (atual && atual.emManutencao && !emManutencao && !observacao)
      throw new Error('Descreva o serviço realizado antes de concluir a manutenção.');
    const props = PropertiesService.getScriptProperties();
    const proximo = codigo || 'EQP-' + String(Math.max(Number(props.getProperty(PROP_SEQ_UNIDADES)) || 0,
      ...registros.map(u => Number(u.codigo.slice(4)) || 0)) + 1).padStart(6, '0');
    const agora = new Date();
    const ocorrencia = !atual?.emManutencao && emManutencao ? 'INICIADA' :
      atual?.emManutencao && !emManutencao ? 'CONCLUÍDA' :
      atual?.emManutencao && emManutencao &&
        (atual.observacaoAtual !== observacao || atual.retornoPrevisto !== retornoPrevisto ||
          atual.manutencao !== manutencao || atual.semManutencao !== semManutencao) ? 'ATUALIZADA' : '';
    const observacaoAtual = emManutencao ? observacao : '';
    unidades.getRange(atual ? atual.linha : unidades.getLastRow() + 1, 1, 1, CAB_UNIDADES.length)
      .setValues([[proximo, categoriaId, manutencao, atual ? atual.criado : agora, agora,
        emManutencao ? 'SIM' : 'NÃO', retornoPrevisto, semManutencao ? 'SIM' : 'NÃO',
        proteger_(observacaoAtual)]]);
    if (ocorrencia) historico.getRange(historico.getLastRow() + 1, 1, 1, CAB_HISTORICO_MANUTENCAO.length)
      .setValues([[Utilities.getUuid(), proximo, ocorrencia, agora, proteger_(observacao),
        emManutencao ? retornoPrevisto : '', manutencao]]);
    SpreadsheetApp.flush();
    if (!codigo) props.setProperty(PROP_SEQ_UNIDADES, String(Number(proximo.slice(4))));
    return { codigo: proximo };
  } finally { lock.releaseLock(); }
}

function validarQuantidade_(valor, aceitarZero) {
  if (valor === '' || valor == null || typeof valor === 'boolean') throw new Error('Informe uma quantidade inteira.');
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < (aceitarZero ? 0 : 1) || numero > 1000000)
    throw new Error('Informe uma quantidade inteira válida de até 1.000.000 peças.');
  return numero;
}

function adicionarPecasCategoria(id, quantidade) {
  const acrescimo = validarQuantidade_(quantidade, false);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const {cats} = abasEquipamentos_();
    const categoria = lerCategorias_(cats).find(c => c.id === id && c.tipoControle === 'QUANTIDADE');
    if (!categoria) throw new Error('Categoria por quantidade não encontrada.');
    const total = validarQuantidade_(categoria.quantidade + acrescimo, true);
    cats.getRange(categoria.linha, 15).setValue(total);
    cats.getRange(categoria.linha, 13).setValue(new Date());
    SpreadsheetApp.flush(); return {quantidade: total};
  } finally { lock.releaseLock(); }
}

function validarObservacaoManutencao_(valor) {
  if (valor != null && typeof valor !== 'string') throw new Error('Observação da manutenção inválida.');
  const texto = String(valor || '').trim();
  if (texto.length > 1000 || /[\u0000-\u0008\u000B-\u001F\u007F]/.test(texto))
    throw new Error('A observação deve ter até 1000 caracteres.');
  return texto;
}

function listarHistoricoManutencao(codigo) {
  if (typeof codigo !== 'string' || !/^EQP-\d{6,}$/.test(codigo)) throw new Error('Código inválido.');
  const aba = abasEquipamentos_().historico;
  if (aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, CAB_HISTORICO_MANUTENCAO.length).getValues()
    .filter(v => String(v[1]) === codigo)
    .map(v => ({ id: String(v[0]), codigo, ocorrencia: String(v[2]),
      registradoEm: v[3] instanceof Date ? Utilities.formatDate(v[3], Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : String(v[3]),
      observacao: String(v[4] || ''), retornoPrevisto: String(v[5] || ''),
      manutencao: String(v[6] || '') })).reverse();
}

function excluirUnidade(codigo) {
  if (typeof codigo !== 'string' || !/^EQP-\d{6,}$/.test(codigo)) throw new Error('Código inválido.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const { unidades } = abasEquipamentos_();
    const atual = lerUnidades_(unidades).find(u => u.codigo === codigo);
    if (!atual) throw new Error('Unidade não encontrada. Atualize a página.');
    if (codigosLocados_().has(codigo)) throw new Error('Finalize o contrato antes de excluir esta unidade.');
    unidades.deleteRow(atual.linha); SpreadsheetApp.flush(); return true;
  } finally { lock.releaseLock(); }
}

function validarNome_(valor) {
  if (typeof valor !== 'string') throw new Error('Informe o nome da categoria.');
  const nome = valor.trim();
  if (!nome || nome.length > 150 || /[\u0000-\u001F\u007F]/.test(nome))
    throw new Error('Informe um nome de até 150 caracteres.');
  return nome;
}

function validarPreco_(bruto) {
  if ((typeof bruto !== 'string' && typeof bruto !== 'number') || String(bruto).trim() === '')
    throw new Error('Informe os nove valores de aluguel.');
  const valor = Number(String(bruto).replace(',', '.'));
  if (!Number.isFinite(valor) || valor < 0 || valor > 99999999.99 || Math.round(valor * 100) / 100 !== valor)
    throw new Error('Use valores não negativos com até duas casas decimais.');
  return Math.round(valor * 100) / 100;
}

function validarData_(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new Error('Informe a próxima data de manutenção.');
  const [ano, mes, dia] = valor.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia)
    throw new Error('Data de manutenção inválida.');
  return valor;
}

function chaveNome_(nome) {
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}
