/** Fila de conferência e publicação de receitas de contratos concluídos. */
/** Cria uma pendência uma única vez. Usada ao finalizar contrato e na migração. */
function registrarContratoNaAuditoriaFinanceira_(id, finalizadoEm) {
  const contrato = lerContratos_(abasContratos_().contratos).find(c => c.id === id);
  if (!contrato || contrato.status !== 'FINALIZADO') throw new Error('Contrato finalizado não encontrado para auditoria.');
  const { auditoria } = abasFinanceiro_();
  if (auditoria.getLastRow() > 1 &&
      auditoria.getRange(2, 2, auditoria.getLastRow() - 1, 1).getDisplayValues().flat().includes(id)) return false;
  const agora = new Date();
  auditoria.getRange(auditoria.getLastRow() + 1, 1, 1, CAB_AUDITORIA_FINANCEIRA.length)
    .setValues([linhaInicialAuditoriaContrato_(contrato, finalizadoEm, agora)]);
  return true;
}

function linhaInicialAuditoriaContrato_(contrato, finalizadoEm, agora) {
  const dataReferencia = finalizadoEm || contrato.finalizado || agora;
  const iso = Utilities.formatDate(dataReferencia, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return ['AUD-' + contrato.id, contrato.id, proteger_(contrato.cliente), contrato.total, contrato.total,
    dataReferencia, validarDataFinanceira_(contrato.fim || iso), validarDataFinanceira_(iso), '', '',
    'PENDENTE', 'Revisar valor e datas antes de enviar ao balanço.', agora, agora, '', '', ''];
}

/** Garante que contratos concluídos antes da instalação também apareçam para revisão. */
function sincronizarContratosFinalizadosFinanceiro_() {
  const { contratos } = abasContratos_();
  const finalizados = lerContratos_(contratos).filter(c => c.status === 'FINALIZADO');
  const { auditoria } = abasFinanceiro_();
  const existentes = new Set(auditoria.getLastRow() > 1 ?
    auditoria.getRange(2, 2, auditoria.getLastRow() - 1, 1).getDisplayValues().flat() : []);
  const agora = new Date();
  const pendentes = finalizados.filter(c => !existentes.has(c.id))
    .map(c => linhaInicialAuditoriaContrato_(c, c.finalizado, agora));
  if (pendentes.length)
    auditoria.getRange(auditoria.getLastRow() + 1, 1, pendentes.length, CAB_AUDITORIA_FINANCEIRA.length)
      .setValues(pendentes);
  return pendentes.length;
}

function dataISOFinanceira_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime()))
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const s = String(valor == null ? '' : valor).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  try {
    const d = Utilities.parseDate(s, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd') === s ? s : '';
  } catch (_e) { return ''; }
}

function validarDataFinanceira_(valor, obrigatoria = true) {
  const iso = dataISOFinanceira_(valor);
  if (!iso) {
    if (!obrigatoria && (valor == null || valor === '')) return '';
    throw new Error('Informe uma data válida no formato dia/mês/ano.');
  }
  return Utilities.parseDate(iso, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function serializarDataFinanceira_(valor) {
  return dataISOFinanceira_(valor);
}

function validarValorFinanceiro_(valor, permitirZero = true) {
  if ((typeof valor !== 'number' && typeof valor !== 'string') || String(valor).trim() === '')
    throw new Error('Informe um valor financeiro válido.');
  const texto = String(valor).trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(texto))
    throw new Error('O valor deve ser não negativo e ter até duas casas decimais.');
  const n = Number(texto.replace(',', '.'));
  const centavos = Math.round(n * 100);
  if (!Number.isFinite(n) || n < 0 || (!permitirZero && centavos === 0) ||
      !Number.isSafeInteger(centavos))
    throw new Error('O valor deve ser não negativo e ter até duas casas decimais.');
  return centavos / 100;
}

function validarTextoFinanceiro_(valor, rotulo, maximo, obrigatorio = false) {
  if (typeof valor !== 'string') {
    if (!obrigatorio && (valor == null || valor === '')) return '';
    throw new Error('Confira o campo ' + rotulo + '.');
  }
  const s = valor.trim();
  if ((!s && obrigatorio) || s.length > maximo || /[\u0000-\u001F\u007F]/.test(s))
    throw new Error('Confira o campo ' + rotulo + '.');
  return s;
}

function lerAuditoriasFinanceiras_() {
  const aba = abasFinanceiro_().auditoria;
  if (aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, CAB_AUDITORIA_FINANCEIRA.length).getValues()
    .map((v, i) => ({ linha: i + 2, id: String(v[0]), contratoId: String(v[1]), cliente: String(v[2]),
      valorContrato: Number(v[3]) || 0, valorConfirmado: Number(v[4]) || 0,
      encerramento: serializarDataFinanceira_(v[5]), competencia: serializarDataFinanceira_(v[6]),
      vencimento: serializarDataFinanceira_(v[7]), recebimento: serializarDataFinanceira_(v[8]),
      forma: String(v[9] || ''), status: String(v[10] || 'PENDENTE'), observacoes: String(v[11] || ''),
      criado: v[12], atualizado: v[13], confirmado: v[14], confirmadoPor: String(v[15] || ''),
      lancamentoId: String(v[16] || ''),
      revisao: v[13] instanceof Date ? v[13].getTime() : String(v[13] || '') }))
    .filter(a => a.id);
}

function valoresAuditoriaFinanceira_(dados, atual) {
  if (!dados || typeof dados !== 'object') throw new Error('Revise os dados financeiros do contrato.');
  const valor = validarValorFinanceiro_(dados.valorConfirmado);
  const competencia = validarDataFinanceira_(dados.competencia);
  const vencimento = validarDataFinanceira_(dados.vencimento);
  const recebimento = validarDataFinanceira_(dados.recebimento, false);
  const forma = validarTextoFinanceiro_(dados.forma || '', 'forma de pagamento', 40, false);
  if (forma && !FINANCEIRO_FORMAS.includes(forma)) throw new Error('Selecione uma forma de pagamento da lista.');
  const observacoes = validarTextoFinanceiro_(dados.observacoes || '', 'observações', 1000, false);
  const esperado = Number(dados.revisao);
  if (!Number.isFinite(esperado) || esperado !== atual.revisao)
    throw new Error('Esta auditoria foi alterada por outra pessoa. Atualize a lista antes de continuar.');
  return { valor, competencia, vencimento, recebimento, forma, observacoes };
}

function listarAuditoriasFinanceiras(filtro = 'PENDENTE') {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    sincronizarContratosFinalizadosFinanceiro_();
    return lerAuditoriasFinanceiras_().filter(a => filtro === 'TODAS' || a.status === filtro)
      .sort((a, b) => (a.status === 'PENDENTE' ? 0 : 1) - (b.status === 'PENDENTE' ? 0 : 1) ||
        String(b.encerramento).localeCompare(String(a.encerramento)) || b.contratoId.localeCompare(a.contratoId))
      .map(a => ({ id: a.id, contratoId: a.contratoId, cliente: a.cliente,
        valorContrato: a.valorContrato, valorConfirmado: a.valorConfirmado, encerramento: a.encerramento,
        competencia: a.competencia, vencimento: a.vencimento, recebimento: a.recebimento,
        forma: a.forma, status: a.status, observacoes: a.observacoes, confirmadoEm:
          a.confirmado instanceof Date ? Utilities.formatDate(a.confirmado, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') : '',
        confirmadoPor: a.confirmadoPor,
        lancamentoId: a.lancamentoId,
        revisao: a.revisao }));
  } finally { lock.releaseLock(); }
}

function salvarAuditoriaFinanceira(id, dados) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const audit = lerAuditoriasFinanceiras_().find(a => a.id === id);
    if (!audit || audit.status !== 'PENDENTE') throw new Error('Somente auditorias pendentes podem ser editadas.');
    const editado = valoresAuditoriaFinanceira_(dados, audit);
    const aba = abasFinanceiro_().auditoria;
    aba.getRange(audit.linha, 5).setValue(editado.valor);
    aba.getRange(audit.linha, 7, 1, 5).setValues([[validarDataFinanceira_(editado.competencia),
      validarDataFinanceira_(editado.vencimento), editado.recebimento ? validarDataFinanceira_(editado.recebimento) : '',
      editado.forma, 'PENDENTE']]);
    aba.getRange(audit.linha, 12).setValue(proteger_(editado.observacoes));
    aba.getRange(audit.linha, 14).setValue(new Date());
    SpreadsheetApp.flush();
    return true;
  } finally { lock.releaseLock(); }
}

function confirmarAuditoriaFinanceira(id, dados) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const { auditoria, lancamentos } = abasFinanceiro_();
    const audit = lerAuditoriasFinanceiras_().find(a => a.id === id);
    if (!audit) throw new Error('Auditoria não encontrada.');
    if (audit.status === 'CONFIRMADO') return { id: audit.id, lancamentoId: audit.lancamentoId, repetido: true };
    if (audit.status !== 'PENDENTE') throw new Error('Esta auditoria não pode ser confirmada.');
    const editado = valoresAuditoriaFinanceira_(dados, audit);
    const novoId = 'FIN-' + audit.contratoId;
    const agora = new Date();
    let confirmadoPor = '';
    try { confirmadoPor = Session.getActiveUser().getEmail() || ''; } catch (_e) {}
    const pagamento = editado.recebimento ? 'BAIXADO' : 'PENDENTE';
    const linhaLancamento = [
      novoId, 'CONTRATO', audit.contratoId, proteger_('Locação ' + audit.contratoId + ' · ' + audit.cliente),
      'ENTRADA', 'Locação', editado.valor, validarDataFinanceira_(editado.competencia),
      validarDataFinanceira_(editado.vencimento),
      editado.recebimento ? validarDataFinanceira_(editado.recebimento) : '',
      pagamento, editado.forma, proteger_(editado.observacoes), agora, agora
    ];
    const atuais = lancamentos.getLastRow() < 2 ? [] :
      lancamentos.getRange(2, 1, lancamentos.getLastRow() - 1, CAB_LANCAMENTOS_FINANCEIROS.length).getValues();
    const encontrado = atuais.findIndex(v => String(v[0]) === novoId);
    if (encontrado >= 0) {
      const anterior = atuais[encontrado];
      if (String(anterior[1]) !== 'CONTRATO' || String(anterior[2]) !== audit.contratoId)
        throw new Error('O identificador financeiro já está associado a outro registro. Solicite revisão.');
      linhaLancamento[13] = anterior[13] || agora;
      lancamentos.getRange(encontrado + 2, 1, 1, CAB_LANCAMENTOS_FINANCEIROS.length).setValues([linhaLancamento]);
    } else {
      lancamentos.getRange(lancamentos.getLastRow() + 1, 1, 1, CAB_LANCAMENTOS_FINANCEIROS.length).setValues([linhaLancamento]);
    }
    auditoria.getRange(audit.linha, 5).setValue(editado.valor);
    auditoria.getRange(audit.linha, 7, 1, 5).setValues([[validarDataFinanceira_(editado.competencia),
      validarDataFinanceira_(editado.vencimento), editado.recebimento ? validarDataFinanceira_(editado.recebimento) : '',
      editado.forma, 'CONFIRMADO']]);
    auditoria.getRange(audit.linha, 12).setValue(proteger_(editado.observacoes));
    auditoria.getRange(audit.linha, 14, 1, 4).setValues([[agora, agora, confirmadoPor, novoId]]);
    SpreadsheetApp.flush();
    return { id: audit.id, lancamentoId: novoId, status: pagamento, confirmadoPor };
  } finally { lock.releaseLock(); }
}

