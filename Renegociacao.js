/** Propostas adicionais, confirmação no mesmo contrato e histórico imutável. */
const ABA_RENEGOCIACOES = 'Renegociacoes';
const CAB_RENEGOCIACOES = ['ID','ID contrato','Tipo','Status','Criado em','Dados JSON'];
function configurarRenegociacoes_(livro) {
  prepararAba_(livro,ABA_RENEGOCIACOES,CAB_RENEGOCIACOES,['A:F']);
}
function abaRenegociacoes_() {
  const livro=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty(PROP_PLANILHA));
  const aba=livro.getSheetByName(ABA_RENEGOCIACOES);
  if(!aba)throw new Error('Execute configurar para criar o histórico de renegociações.');
  return aba;
}
function registrosRenegociacao_(aba) {
  if(aba.getLastRow()<2)return [];
  return aba.getRange(2,1,aba.getLastRow()-1,6).getValues().map((r,i)=>({linha:i+2,id:String(r[0]),contratoId:String(r[1]),tipo:String(r[2]),status:String(r[3]),criadoEm:String(r[4]),dados:JSON.parse(String(r[5]))}));
}
function jsonRenegociacao_(valor) {
  const texto=JSON.stringify(valor);
  if(texto.length>45000)throw new Error('Este orçamento excede o limite de armazenamento. Divida os equipamentos em propostas menores.');
  return texto;
}
function contratoRenegociacao_(id,ativo) {
  const abas=abasContratos_(),c=lerContratos_(abas.contratos).find(c=>c.id===id);
  if(!c || (ativo && c.status!=='ATIVO'))throw new Error('Contrato não encontrado ou já finalizado.');
  const itens=lerItensContrato_(abas.itens).filter(i=>i.contratoId===id);
  return {abas,c,itens};
}
function assinaturaContratoRenegociacao_(c,itens) {
  return JSON.stringify([c.id,c.status,c.modalidade,c.total,c.subtotal,c.fim,c.desconto,itens.map(i=>[i.id,i.codigo,i.quantidade,i.blocos,i.diarias,i.fim,i.subtotal,i.tarifas,i.taxaLimpeza])]);
}
function cotacaoBaseRenegociacao_(c,itens) {
  return {contratoId:c.id,cliente:c.cliente,documento:c.documento,telefone:c.telefone,endereco:c.endereco,enderecoLocacao:c.enderecoLocacao,
    inicio:c.inicio,horaInicio:c.horaInicio,horaFim:c.horaFim,fuso:c.fuso,modalidade:c.modalidade,fim:c.fim,
    subtotal:c.subtotal,desconto:c.desconto,total:c.total,itens:itens.map(i=>({...i,inicio:i.blocos[0]?.inicioLocacao||c.inicio}))};
}
function validarNovosRenegociacao_(entradas) {
  const abas=abasEquipamentos_(),cats=lerCategorias_(abas.cats),units=lerUnidades_(abas.unidades);
  const ocupados=codigosLocados_(),qtds=quantidadesLocadas_(),vistos=new Set();
  return entradas.map(e=>{
    if(!e || typeof e.codigo!=='string' || vistos.has(e.codigo))throw new Error('Novo equipamento repetido ou inválido.');
    vistos.add(e.codigo);
    const lote=e.codigo.startsWith('QTD-'),cat=lote?cats.find(c=>'QTD-'+c.id===e.codigo&&c.tipoControle==='QUANTIDADE'):null;
    const u=lote?null:units.find(u=>u.codigo===e.codigo);
    const categoria=cat||cats.find(c=>c.id===u?.categoriaId);
    const quantidade=lote?validarQuantidade_(e.quantidade,false):1;
    if(!categoria || (!lote && (!u || u.emManutencao || ocupados.has(e.codigo))))throw new Error('Equipamento indisponível: '+e.codigo);
    if(!lote && e.quantidade!=null && Number(e.quantidade)!==1)throw new Error('Unidade individual tem quantidade 1.');
    if(lote && quantidade>cat.quantidade-(qtds.get(cat.id)||0))throw new Error('Quantidade indisponível para '+cat.nome+'.');
    return {e,u,categoria,quantidade};
  });
}
function calcularRenegociacao_(id,dados) {
  if(!dados || typeof dados!=='object')throw new Error('Informe os equipamentos e períodos.');
  const {c,itens}=contratoRenegociacao_(id,true),aberto=c.modalidade==='ABERTO';
  const existentes=Array.isArray(dados.existentes)?dados.existentes:[],novos=Array.isArray(dados.novos)?dados.novos:[];
  if(!existentes.length&&!novos.length || existentes.length+novos.length>200)throw new Error('Escolha de 1 a 200 itens.');
  if(aberto&&existentes.length)throw new Error('O prazo em aberto já acompanha o tempo utilizado. Acrescente novos equipamentos ou apure os existentes no fechamento.');
  const cats=lerCategorias_(abasEquipamentos_().cats),vistos=new Set();
  const adicionais=existentes.map(e=>{
    if(vistos.has(e.itemId))throw new Error('Item repetido na proposta.');vistos.add(e.itemId);
    const i=itens.find(i=>i.id===e.itemId),cat=cats.find(cat=>cat.id===i?.categoriaId);
    if(!i||!cat)throw new Error('Equipamento do contrato não encontrado.');
    const blocos=validarFaixas_(e.faixas).map(faixa=>({faixa,diarias:DIAS_FAIXAS[faixa],preco:cat.precos[faixa]}));
    const diarias=blocos.reduce((n,b)=>n+b.diarias,0);
    if(i.diarias+diarias>3650)throw new Error('O limite é de 3.650 diárias por item.');
    return {...i,itemId:i.id,novo:false,inicio:i.fim,fim:adicionarDias_(i.fim,diarias),blocos,diarias,subtotal:subtotalPorQuantidade_(blocos,i.quantidade)};
  });
  const inicioNovos=novos.length?validarData_(String(dados.inicioNovos||'')):'';
  if(novos.length && inicioNovos<c.inicio)throw new Error('O início dos novos equipamentos não pode ser anterior ao contrato.');
  const horaInicioNovos=aberto&&novos.length?validarHoraAberta_(dados.horaInicioNovos):'';
  if(aberto&&novos.length)instanteLocacaoAberta_(inicioNovos,horaInicioNovos,c.fuso);
  validarNovosRenegociacao_(novos).forEach(({e,u,categoria,quantidade})=>{
    const tarifas=aberto?validarTarifasAbertas_(categoria.precos):null;
    const blocos=aberto?melhorPrecoAberto_(1,tarifas).blocos:validarFaixas_(e.faixas).map(faixa=>({faixa,diarias:DIAS_FAIXAS[faixa],preco:categoria.precos[faixa]}));
    blocos[0]={...blocos[0],inicioLocacao:inicioNovos,horaInicioLocacao:horaInicioNovos};
    const diarias=aberto?1:blocos.reduce((n,b)=>n+b.diarias,0),fim=aberto?'':adicionarDias_(inicioNovos,diarias);
    adicionais.push({codigo:e.codigo,categoriaId:categoria.id,categoria:categoria.nome,quantidade,novo:true,inicio:inicioNovos,horaInicio:horaInicioNovos,
      blocos,diarias,fim,tarifas,subtotal:subtotalPorQuantidade_(blocos,quantidade),taxaLimpeza:categoria.taxaLimpeza,
      alertaManutencao:!!u?.manutencao&&(aberto||fim>=u.manutencao)});
  });
  const subtotal=somarValores_(adicionais.map(i=>i.subtotal));
  const desconto=aberto?descontoPrazoAberto_(subtotal,{tipo:'nenhum',valor:0}):calcularDesconto_(subtotal,dados.desconto);
  const base=cotacaoBaseRenegociacao_(c,itens),cotacao={...base,itens:adicionais,inicio:adicionais.map(i=>i.inicio).sort()[0],
    fim:adicionais.map(i=>i.fim).sort().at(-1),horaInicio:aberto?horaInicioNovos:base.horaInicio,subtotal,desconto,total:desconto.total,
    contratoId:id,observacaoPDF:'Orçamento adicional do contrato '+id+'. Só a confirmação desta proposta altera o contrato e reserva os novos equipamentos.'};
  cotacao.assinaturaContrato=assinaturaContratoRenegociacao_(c,itens);
  cotacao.assinatura=JSON.stringify([cotacao.assinaturaContrato,adicionais,subtotal,desconto]);
  return cotacao;
}
function calcularRenegociacao(id,dados) {return calcularRenegociacao_(id,dados);}
function salvarRenegociacao(id,dados) {
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const q=calcularRenegociacao_(id,dados);
    if(q.assinatura!==dados.assinaturaEsperada)throw new Error('O contrato ou preços mudaram. Calcule e confira novamente.');
    const aba=abaRenegociacoes_(),registros=registrosRenegociacao_(aba),json=jsonRenegociacao_(q);
    const {c,itens}=contratoRenegociacao_(id,true),base=jsonRenegociacao_(cotacaoBaseRenegociacao_(c,itens));
    const agora=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm');
    if(!registros.some(r=>r.contratoId===id&&r.tipo==='BASE'))aba.getRange(aba.getLastRow()+1,1,1,6).setValues([['BASE-'+id,id,'BASE','CONFIRMADO',agora,base]]);
    const sequencia=Math.max(0,...registros.filter(r=>r.tipo==='ADICIONAL').map(r=>Number(r.id.slice(4))||0))+1;
    const propostaId='REN-'+String(sequencia).padStart(6,'0');
    aba.getRange(aba.getLastRow()+1,1,1,6).setValues([[propostaId,id,'ADICIONAL','PENDENTE',agora,json]]);SpreadsheetApp.flush();
    return {id:propostaId,total:q.total};
  } finally {lock.releaseLock();}
}
function listarRenegociacoes(id) {
  const {c,itens}=contratoRenegociacao_(id,false),regs=registrosRenegociacao_(abaRenegociacoes_()).filter(r=>r.contratoId===id);
  return {modo:regs.find(r=>r.tipo==='VISAO')?.dados.modo||'SEPARADOS',
    original:regs.find(r=>r.tipo==='BASE')?.dados||cotacaoBaseRenegociacao_(c,itens),
    propostas:regs.filter(r=>r.tipo==='ADICIONAL').map(r=>({id:r.id,status:r.status,criadoEm:r.criadoEm,cotacao:r.dados}))};
}
function cancelarRenegociacao(id) {
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const aba=abaRenegociacoes_(),r=registrosRenegociacao_(aba).find(r=>r.id===id&&r.tipo==='ADICIONAL');
    if(!r||r.status!=='PENDENTE')throw new Error('Somente propostas pendentes podem ser canceladas.');
    aba.getRange(r.linha,4).setValue('CANCELADO');return true;
  } finally{lock.releaseLock();}
}
function confirmarRenegociacao(id) {
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const aba=abaRenegociacoes_(),r=registrosRenegociacao_(aba).find(r=>r.id===id&&r.tipo==='ADICIONAL');
    if(!r)throw new Error('Proposta não encontrada.');
    if(r.status==='CONFIRMADO')return {id:r.contratoId,jaConfirmado:true};
    if(r.status!=='PENDENTE')throw new Error('Proposta cancelada.');
    const {abas,c,itens}=contratoRenegociacao_(r.contratoId,true),q=r.dados;
    if(q.assinaturaContrato!==assinaturaContratoRenegociacao_(c,itens))throw new Error('O contrato mudou após esta proposta. Gere um novo orçamento adicional.');
    validarNovosRenegociacao_(q.itens.filter(i=>i.novo).map(i=>({codigo:i.codigo,quantidade:i.quantidade})));
    const anteriores=abas.itens.getLastRow(),backup=abas.contratos.getRange(c.linha,1,1,CAB_CONTRATOS.length).getValues();
    const antigos=itens.map(i=>({linha:i.linha,valores:abas.itens.getRange(i.linha,1,1,CAB_ITENS.length).getValues()}));
    try {
      q.itens.forEach(n=>{
        if(n.novo){
          abas.itens.getRange(abas.itens.getLastRow()+1,1,1,CAB_ITENS.length).setValues([[Utilities.getUuid(),c.id,n.codigo,n.categoriaId,proteger_(n.categoria),JSON.stringify(n.blocos),n.diarias,n.fim,n.subtotal,n.quantidade,n.taxaLimpeza,n.tarifas?JSON.stringify(n.tarifas):'']]);
        }else{
          const i=itens.find(i=>i.id===n.itemId);
          abas.itens.getRange(i.linha,6,1,4).setValues([[JSON.stringify(i.blocos.concat(n.blocos)),i.diarias+n.diarias,n.fim,somarValores_([i.subtotal,n.subtotal])]]);
        }
      });
      const total=somarValores_([c.total,q.total]),subtotal=somarValores_([c.subtotal,q.subtotal]),aplicado=somarValores_([c.desconto.aplicado||0,q.desconto.aplicado||0]);
      const fim=c.modalidade==='ABERTO'?'':[c.fim,...q.itens.map(i=>i.fim)].sort().at(-1);
      abas.contratos.getRange(c.linha,9,1,2).setValues([[total,fim]]);
      abas.contratos.getRange(c.linha,14,1,4).setValues([[subtotal,c.modalidade==='ABERTO'?c.desconto.tipo:(aplicado?'valor':'nenhum'),c.modalidade==='ABERTO'?c.desconto.valor:aplicado,aplicado]]);
      abas.contratos.getRange(c.linha,12).setValue(new Date());
      aba.getRange(r.linha,4).setValue('CONFIRMADO');SpreadsheetApp.flush();
      return {id:c.id,total,fim};
    }catch(e){
      abas.contratos.getRange(c.linha,1,1,CAB_CONTRATOS.length).setValues(backup);
      antigos.forEach(i=>abas.itens.getRange(i.linha,1,1,CAB_ITENS.length).setValues(i.valores));
      while(abas.itens.getLastRow()>anteriores)abas.itens.deleteRow(abas.itens.getLastRow());
      aba.getRange(r.linha,4).setValue('PENDENTE');SpreadsheetApp.flush();throw e;
    }
  }finally{lock.releaseLock();}
}
function definirVisaoRenegociacao(id,modo) {
  if(!['SEPARADOS','UNIFICADO'].includes(modo))throw new Error('Visão inválida.');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    contratoRenegociacao_(id,false);
    const aba=abaRenegociacoes_(),r=registrosRenegociacao_(aba).find(r=>r.contratoId===id&&r.tipo==='VISAO');
    aba.getRange(r?r.linha:aba.getLastRow()+1,1,1,6).setValues([['VISAO-'+id,id,'VISAO','ATIVO','',JSON.stringify({modo})]]);return true;
  }finally{lock.releaseLock();}
}
function cotacaoUnificadaRenegociacao_(id) {
  const {c,itens}=contratoRenegociacao_(id,false),hist=listarRenegociacoes(id);
  const fontes=[{id:'Original',cotacao:hist.original},...hist.propostas.filter(r=>r.status==='CONFIRMADO')];
  const q=cotacaoBaseRenegociacao_(c,itens);
  // Linhas por origem preservam diferentes quantidades e datas de entrada.
  if(c.modalidade!=='ABERTO')q.itens=fontes.flatMap(r=>r.cotacao.itens.map(i=>({...i,categoria:i.categoria+' · '+r.id})));
  q.contratoId=id;q.observacaoPDF='Orçamento unificado do contrato '+id+'. Inclui apenas condições confirmadas; propostas pendentes e canceladas ficam fora do total. Os originais continuam no histórico.';
  if(c.modalidade==='ABERTO' && c.status==='FINALIZADO'){q.modalidade='FIXO';q.observacaoPDF+=' Prazo em aberto já encerrado: os valores definitivos foram apurados pelo tempo efetivo de cada equipamento. As origens abaixo registram referências iniciais.';}
  q.fontesPDF=fontes.map(r=>[r.id,moedaPDF_(r.cotacao.total)+(c.modalidade==='ABERTO'?' (referência inicial)':'')]);
  return q;
}
function gerarPDFRenegociacao(id,propostaId) {
  const {c,itens}=contratoRenegociacao_(id,false);
  let q;
  if(propostaId==='UNIFICADO')q=cotacaoUnificadaRenegociacao_(id);
  else if(propostaId==='ORIGINAL')q={...listarRenegociacoes(id).original,observacaoPDF:'Condições originais do contrato '+id+'. Histórico preservado antes das renegociações.'};
  else {
    const r=registrosRenegociacao_(abaRenegociacoes_()).find(r=>r.id===propostaId&&r.contratoId===id&&r.tipo==='ADICIONAL');
    if(!r)throw new Error('Orçamento adicional não encontrado.');
    q={...r.dados,observacaoPDF:r.dados.observacaoPDF+' Situação: '+r.status+'.'};
  }
  q={...q,identificadorPDF:propostaId==='ORIGINAL'?'Original_'+id:propostaId==='UNIFICADO'?'Unificado_'+id:propostaId};
  return gerarPDFOrcamentoDeCotacao_(q);
}
