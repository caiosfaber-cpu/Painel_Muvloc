/** Locação em aberto: tarifas da contratação, otimização em centavos e fechamento revisável. */
function validarHoraAberta_(hora) {
  if(typeof hora !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora))
    throw new Error('Informe uma hora válida no formato HH:mm.');
  return hora;
}
function instanteLocacaoAberta_(data, hora, fuso) {
  const texto = validarData_(String(data || '')) + ' ' + validarHoraAberta_(hora);
  const instante = Utilities.parseDate(texto, fuso, 'yyyy-MM-dd HH:mm');
  if(Utilities.formatDate(instante, fuso, 'yyyy-MM-dd HH:mm') !== texto)
    throw new Error('Data e hora inválidas no fuso da locação.');
  return instante;
}
function validarTarifasAbertas_(precos) {
  if(!precos || typeof precos !== 'object')throw new Error('Tabela de tarifas não registrada.');
  const copia = {};
  Object.keys(DIAS_FAIXAS).forEach(faixa=>{
    const valor = precos[faixa];
    if(typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 ||
      !Number.isSafeInteger(Math.round(valor*100)) || Math.round(valor*100)/100 !== valor)
      throw new Error('Tabela de tarifas inválida: '+faixa);
    copia[faixa]=valor;
  });
  return copia;
}
/** Cobertura >= dias usados, permitindo pacote maior mais barato. Empate: menor cobertura e menos blocos. */
function melhorPrecoAberto_(dias, entrada) {
  if(!Number.isInteger(dias) || dias < 1 || dias > 3650)throw new Error('Informe de 1 a 3.650 diárias.');
  const tarifas = validarTarifasAbertas_(entrada), limite = dias+29;
  const dp=Array(limite+1).fill(Infinity), contas=Array(limite+1).fill(Infinity), anterior=Array(limite+1);
  dp[0]=0;contas[0]=0;
  for(let n=1;n<=limite;n++)Object.keys(DIAS_FAIXAS).forEach(f=>{
    const d=DIAS_FAIXAS[f];if(d>n || !Number.isFinite(dp[n-d]))return;
    const custo=dp[n-d]+Math.round(tarifas[f]*100), blocos=contas[n-d]+1;
    if(!Number.isSafeInteger(custo))throw new Error('Valor excede o limite de cálculo.');
    if(custo<dp[n] || (custo===dp[n]&&blocos<contas[n])){dp[n]=custo;contas[n]=blocos;anterior[n]=f;}
  });
  let cobertura=dias;
  for(let n=dias+1;n<=limite;n++)if(dp[n]<dp[cobertura])cobertura=n;
  const frequencias={};for(let n=cobertura;n>0;){const f=anterior[n];frequencias[f]=(frequencias[f]||0)+1;n-=DIAS_FAIXAS[f];}
  const blocos=Object.keys(DIAS_FAIXAS).filter(f=>frequencias[f]).map(f=>({faixa:f,diarias:DIAS_FAIXAS[f],preco:tarifas[f],vezes:frequencias[f]}));
  return {diarias:dias,diariasCobertas:cobertura,subtotal:dp[cobertura]/100,blocos};
}
function descontoPrazoAberto_(subtotal, entrada) {
  // Valida o desconto completo; em reais, permite valor maior que a estimativa de 1 diária.
  const valor=entrada && entrada.tipo==='valor' ? Number(String(entrada.valor).replace(',','.')) : 0;
  if(entrada && entrada.tipo==='valor' && !Number.isSafeInteger(Math.round(valor*100)))throw new Error('Desconto excede o limite de cálculo.');
  const desconto=calcularDesconto_(Math.max(subtotal,Number.isFinite(valor)?valor:0),entrada);
  if(desconto.tipo==='valor'){
    desconto.aplicado=Math.min(desconto.valor,subtotal);
    desconto.total=Math.round((subtotal-desconto.aplicado)*100)/100;
  }
  return desconto;
}
function assinaturaTarifasAbertas_(itens) {
  return JSON.stringify(itens.map(i=>({codigo:i.codigo,tarifas:validarTarifasAbertas_(i.tarifas),taxaLimpeza:i.taxaLimpeza})).sort((a,b)=>a.codigo.localeCompare(b.codigo)));
}
function conferirTarifasAbertas_(dados,cotacao) {
  if(cotacao.modalidade==='ABERTO' && dados.tarifasEsperadas!==cotacao.tarifasAssinatura)
    throw new Error('As tarifas para a locação em aberto mudaram. Calcule e confira novamente antes de continuar.');
}
function obterReferenciaFechamentoAberto(id) {
  const c=lerContratos_(abasContratos_().contratos).find(c=>c.id===id);
  if(!c || c.modalidade!=='ABERTO' || c.status!=='ATIVO')throw new Error('Contrato em aberto não encontrado.');
  return {agora:Utilities.formatDate(new Date(),c.fuso,'yyyy-MM-dd HH:mm'),fuso:c.fuso};
}
function calcularFechamentoAberto_(c,itens,dados,agora) {
  if(!c || c.modalidade!=='ABERTO' || c.status!=='ATIVO')throw new Error('Somente locações ativas em aberto podem ser fechadas.');
  const fim=validarData_(String(dados.fim||'')),horaFim=validarHoraAberta_(dados.horaFim);
  const inicio=instanteLocacaoAberta_(c.inicio,c.horaInicio,c.fuso), termino=instanteLocacaoAberta_(fim,horaFim,c.fuso);
  if(termino<inicio)throw new Error('O encerramento não pode ser anterior ao início.');
  if(termino>agora)throw new Error('Informe a devolução efetiva; o encerramento não pode estar no futuro.');
  const diarias=Math.max(1,Math.ceil((termino-inicio)/86400000));
  if(!itens.length)throw new Error('Contrato sem equipamentos.');
  const calculados=itens.map(i=>{
    const inicioItem=instanteLocacaoAberta_(i.blocos[0]?.inicioLocacao||c.inicio,i.blocos[0]?.horaInicioLocacao||c.horaInicio,c.fuso);
    if(termino<inicioItem)throw new Error('O encerramento não pode ser anterior à entrada de um equipamento.');
    const diariasItem=Math.max(1,Math.ceil((termino-inicioItem)/86400000));
    const preco=melhorPrecoAberto_(diariasItem,i.tarifas);
    preco.blocos[0]={...preco.blocos[0],inicioLocacao:i.blocos[0]?.inicioLocacao||c.inicio,horaInicioLocacao:i.blocos[0]?.horaInicioLocacao||c.horaInicio};
    const subtotal=subtotalPorQuantidade_(preco.blocos,i.quantidade);
    return {...i,...preco,diarias:diariasItem,subtotal,fim,limpezaCondicional:Math.round(subtotal*i.taxaLimpeza)/100};
  });
  const subtotal=somarValores_(calculados.map(i=>i.subtotal)),desconto=descontoPrazoAberto_(subtotal,c.desconto);
  return {id:c.id,cliente:c.cliente,inicio:c.inicio,horaInicio:c.horaInicio,fuso:c.fuso,fim,horaFim,diarias,
    modalidade:'ABERTO',itens:calculados,subtotal,desconto,total:desconto.total,
    assinaturaFechamento:JSON.stringify([c.id,c.inicio,c.horaInicio,c.fuso,c.desconto,fim,horaFim,
      itens.map(i=>[i.id,i.codigo,i.quantidade,i.tarifas,i.taxaLimpeza,i.blocos[0]?.inicioLocacao,i.blocos[0]?.horaInicioLocacao]),subtotal,desconto.total])};
}
function calcularFechamentoAberto(id,dados) {
  if(!dados || typeof dados!=='object')throw new Error('Informe a data e hora de devolução.');
  const abas=abasContratos_();
  return calcularFechamentoAberto_(lerContratos_(abas.contratos).find(c=>c.id===id),
    lerItensContrato_(abas.itens).filter(i=>i.contratoId===id),dados,new Date());
}
function fecharContratoAberto(id,dados) {
  if(!dados || typeof dados!=='object')throw new Error('Calcule o fechamento antes de confirmar.');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const abas=abasContratos_(),c=lerContratos_(abas.contratos).find(c=>c.id===id);
    const itens=lerItensContrato_(abas.itens).filter(i=>i.contratoId===id);
    const fechamento=calcularFechamentoAberto_(c,itens,dados,new Date());
    if(dados.totalEsperado!==fechamento.total || dados.assinaturaFechamento!==fechamento.assinaturaFechamento)
      throw new Error('O fechamento mudou. Recalcule e confira antes de confirmar.');
    fechamento.itens.forEach(i=>abas.itens.getRange(i.linha,6,1,4).setValues([[JSON.stringify(i.blocos),i.diarias,i.fim,i.subtotal]]));
    abas.contratos.getRange(c.linha,9,1,2).setValues([[fechamento.total,fechamento.fim]]);
    abas.contratos.getRange(c.linha,14).setValue(fechamento.subtotal);
    abas.contratos.getRange(c.linha,17).setValue(fechamento.desconto.aplicado);
    abas.contratos.getRange(c.linha,19).setValue(fechamento.horaFim);
    const agora=new Date();abas.contratos.getRange(c.linha,12,1,2).setValues([[agora,agora]]);
    // Só libera o estoque depois de gravar o fechamento financeiro.
    abas.contratos.getRange(c.linha,8).setValue('FINALIZADO');SpreadsheetApp.flush();
    return {id:c.id,total:fechamento.total,fim:fechamento.fim,horaFim:fechamento.horaFim};
  } finally {lock.releaseLock();}
}
const TEXTO_PRAZO_ABERTO = 'Locação por prazo em aberto, sem data final previamente definida. O valor final será apurado na devolução ou disponibilização efetiva dos equipamentos, informando data e hora. Para equipamentos incluídos posteriormente, a apuração começa na data e hora de entrada registradas para cada item. Cada período iniciado de 24 horas desde o início registrado conta como uma diária, com mínimo de uma diária. O sistema escolherá, para cada equipamento, a combinação de tarifas registrada na contratação de menor preço que cubra o tempo utilizado; um pacote maior poderá ser aplicado quando for mais econômico, sem prolongar o uso dos equipamentos. Semana = 7 dias, quinzena = 15 dias, 21 diárias = 21 dias e mensal = 30 dias. Descontos registrados serão aplicados no fechamento, limitados ao subtotal. Taxas de limpeza permanecem condicionais, calculadas sobre as diárias antes do desconto e cobradas à parte. Enquanto a locação estiver ativa, os equipamentos permanecerão reservados.';
function tarifasPrazoAbertoPDF_(corpo,itens,titulo,tabela,moeda) {
  const grupos=new Map();
  itens.forEach(i=>{const chave=JSON.stringify([i.categoriaId,i.tarifas]);if(!grupos.has(chave))grupos.set(chave,i);});
  const rotulos={diaria1:'01 diária',diaria2:'02 diárias',diaria3:'03 diárias',diaria4:'04 diárias',diaria5:'05 diárias',semana:'Semana (7 dias)',quinzena:'Quinzena (15 dias)',diarias21:'21 diárias',mensal:'Mensal (30 dias)'};
  grupos.forEach(i=>{
    titulo(corpo,'Tarifas registradas · '+i.categoria,DocumentApp.ParagraphHeading.HEADING2);
    tabela(corpo,[['Período','Valor por equipamento / peça'],...Object.keys(DIAS_FAIXAS).map(f=>[rotulos[f],moeda(i.tarifas[f])])],true);
  });
}
