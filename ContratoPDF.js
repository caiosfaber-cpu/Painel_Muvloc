/** PDF contratual com condições editáveis e cópia das condições na primeira emissão. */
const ABA_CONFIG_CONTRATO = 'ConfiguracaoContrato';
const ABA_TERMOS_CONTRATO = 'TermosContrato';
const CONFIG_CONTRATO_PADRAO = {
  nome: 'Cleverson Carlos Pereira',
  documento: '04200124602',
  endereco: 'Rua Tucano, nº 140',
  bairro: 'Monte das Oliveiras',
  cidade: '',
  foro: 'Porto Seguro, Estado da Bahia',
  antecedenciaHoras: 3,
  multaPercentual: 50,
  versaoModelo: 'v08',
  taxaLimpeza: 30,
  formasPagamento: 'PIX, boleto, débito, crédito ou dinheiro'
};
const CAMPOS_CONFIG_CONTRATO = Object.keys(CONFIG_CONTRATO_PADRAO);

const CLAUSULAS_CONTRATO_V08 = [
  "1. Objeto e entrega",
  "1.1. A LOCADORA entrega ao LOCATÁRIO as unidades identificadas na tabela, em condições de funcionamento e uso. O LOCATÁRIO deverá devolvê-las nas condições em que as recebeu, ressalvado o desgaste natural decorrente do uso adequado.",
  "1.2. No momento da entrega ou disponibilização dos equipamentos, as partes poderão realizar conferência visual das condições aparentes dos equipamentos. Eventuais divergências identificadas deverão ser comunicadas à LOCADORA imediatamente.",
  "2. Prazo, prorrogação, devolução e retirada",
  "2.1. O prazo de locação de cada equipamento será aquele indicado no quadro de equipamentos, períodos e valores deste contrato. Cada equipamento deverá ser devolvido ou disponibilizado para retirada até a data indicada em sua respectiva linha.",
  "2.2. Para solicitar prorrogação do período de locação, o LOCATÁRIO deverá comunicar a LOCADORA com antecedência mínima de 3 (três) horas. A prorrogação somente será válida mediante confirmação expressa da LOCADORA e, quando aplicável, atualização do período e dos valores contratados.",
  "2.3. O silêncio da LOCADORA, a permanência do equipamento com o LOCATÁRIO ou a ausência de cobrança imediata não serão interpretados como autorização para prorrogação ou renovação da locação.",
  "2.4. Quando a devolução for de responsabilidade do LOCATÁRIO, este deverá realizar a devolução até a data estabelecida, no local previamente acordado com a LOCADORA.",
  "2.5. Quando a retirada for de responsabilidade da LOCADORA, o LOCATÁRIO deverá manter os equipamentos disponíveis, desimpedidos e no local previamente informado, garantindo acesso para a realização da retirada.",
  "2.6. Caso a retirada não seja realizada no prazo por responsabilidade exclusiva da LOCADORA, não serão cobradas do LOCATÁRIO diárias ou multa referentes ao período posterior ao término contratado, desde que o LOCATÁRIO tenha disponibilizado corretamente os equipamentos para retirada.",
  "2.7. Caso a retirada seja impossibilitada, dificultada ou atrasada por responsabilidade do LOCATÁRIO, incluindo ausência injustificada, falta de acesso ao local, mudança de endereço não comunicada, equipamento não disponibilizado, deslocamento dos equipamentos para local diverso do informado ou outra circunstância atribuível ao LOCATÁRIO, serão devidas as diárias adicionais e a multa prevista neste contrato até a efetiva disponibilização dos equipamentos.",
  "2.8. A solicitação, o agendamento ou a tentativa de retirada pela LOCADORA não caracterizam, por si só, prorrogação ou renovação do contrato.",
  "3. Responsabilidades do locatário",
  "3.1. O LOCATÁRIO será responsável pela guarda, conservação e uso adequado dos equipamentos durante o período em que estiverem sob sua posse ou responsabilidade, respondendo pelos danos decorrentes de mau uso, negligência, imprudência, imperícia ou utilização em desacordo com as orientações da LOCADORA.",
  "3.2. Em caso de dano causado por mau uso, negligência ou utilização inadequada, o LOCATÁRIO deverá arcar com os custos necessários para reparo ou, quando tecnicamente inviável ou economicamente não recomendável, para reposição do equipamento.",
  "3.3. Qualquer mudança do local de utilização ou armazenamento dos equipamentos deverá ser previamente comunicada e autorizada pela LOCADORA.",
  "3.4. Os equipamentos deverão ser devolvidos limpos e nas condições adequadas de conservação. Caso necessitem de limpeza extraordinária decorrente do uso pelo LOCATÁRIO, poderá ser cobrada taxa de limpeza de X%",
  "4. Obrigações da locadora",
  "4.1. A LOCADORA fornecerá os equipamentos em condições adequadas de uso, ressalvadas as características próprias de equipamentos usados e o desgaste natural.",
  "4.2. Caso seja constatado defeito de fabricação ou falha não decorrente de ação ou omissão do LOCATÁRIO, a LOCADORA providenciará, conforme disponibilidade, o reparo ou a substituição do equipamento.",
  "5. Pagamento",
  "5.1. O valor total da locação será aquele indicado no quadro de equipamentos, períodos e valores deste contrato, considerando eventuais descontos expressamente registrados.",
  "5.2. O pagamento da locação será realizado no ato da contratação, entrega ou assinatura deste instrumento, conforme a modalidade ajustada entre as partes.",
  "5.3. São aceitas as seguintes formas de pagamento: PIX, cartão de débito, cartão de crédito, dinheiro ou boleto.",
  "5.4. Este contrato não constitui, isoladamente, comprovante de pagamento. A quitação será comprovada pelo respectivo registro ou comprovante de pagamento.",
  "6. Inspeção e condições dos equipamentos",
  "6.1. O LOCATÁRIO declara receber os equipamentos após conferência visual de suas condições aparentes, comprometendo-se a comunicar imediatamente qualquer irregularidade identificada no momento da entrega ou durante a locação.",
  "6.2. Na devolução ou retirada, a LOCADORA poderá realizar nova conferência dos equipamentos. Eventuais danos, faltas ou irregularidades constatados serão registrados e poderão gerar as cobranças previstas neste contrato.",
  "7. Local de uso, transporte e movimentação",
  "7.1. Os equipamentos deverão permanecer no local informado e acordado com a LOCADORA, sendo vedada sua transferência para outro endereço sem autorização prévia.",
  "7.2. O LOCATÁRIO não poderá desmontar, alterar, adaptar ou utilizar os equipamentos para finalidade diversa daquela para a qual foram destinados, salvo autorização expressa da LOCADORA.",
  "8. Furto, roubo, extravio ou perda",
  "8.1. Enquanto os equipamentos estiverem sob posse, guarda ou responsabilidade do LOCATÁRIO, este responderá financeiramente pelos casos de furto, roubo, extravio ou perda, independentemente de o fato ocorrer no local de utilização ou armazenamento.",
  "8.2. Ocorrendo furto, roubo, extravio ou perda, o LOCATÁRIO deverá comunicar imediatamente a LOCADORA e, quando aplicável, apresentar o respectivo registro de ocorrência.",
  "8.3. Nesses casos, o LOCATÁRIO ficará responsável pelo pagamento do valor necessário para indenizar a LOCADORA ou repor o equipamento, conforme o caso, considerando o valor de reposição de equipamento equivalente ou outro valor acordado entre as partes.",
  "8.4. A responsabilidade prevista nesta cláusula permanecerá até a efetiva devolução do equipamento à LOCADORA ou sua substituição/indenização, conforme aplicável.",
  "9. Danos, reparos e reposição",
  "9.1. Constatado dano decorrente de mau uso, negligência, imprudência, imperícia, transporte inadequado, alteração não autorizada ou qualquer outra conduta atribuível ao LOCATÁRIO, este deverá arcar com os custos necessários ao reparo ou à reposição do equipamento.",
  "9.2. O valor do reparo ou da reposição será informado ao LOCATÁRIO com base nos custos necessários para restabelecer as condições do equipamento ou substituí-lo, conforme o caso.",
  "9.3. O pagamento dos custos de reparo ou reposição não afasta as demais obrigações contratuais eventualmente incidentes, inclusive aquelas relativas ao período adicional de permanência do equipamento.",
  "10. Atraso na devolução ou disponibilização",
  "10.1. A devolução ou disponibilização do equipamento após o prazo contratado, quando o atraso for de responsabilidade do LOCATÁRIO, acarretará a cobrança da diária correspondente ao equipamento, acrescida de multa equivalente a 50% (cinquenta por cento) do valor da respectiva diária, por dia de atraso.",
  "10.2. A cobrança prevista nesta cláusula será aplicada até a efetiva devolução do equipamento ou sua efetiva disponibilização para retirada pela LOCADORA, conforme a responsabilidade pela devolução estabelecida neste contrato.",
  "10.3. A cobrança das diárias adicionais e da multa prevista nesta cláusula não caracteriza renovação ou prorrogação automática da locação.",
  "11. Condições de pagamento e inadimplência",
  "11.1. O pagamento da locação será realizado no ato da contratação ou assinatura deste contrato, salvo condição diferente expressamente acordada entre as partes e registrada neste instrumento.",
  "11.2. Eventuais valores adicionais decorrentes de atraso, danos, limpeza, perda, furto, roubo, extravio, reparos ou reposição deverão ser pagos pelo LOCATÁRIO conforme apuração e cobrança da LOCADORA.",
  "11.3. O não pagamento de valores devidos sujeitará o LOCATÁRIO às medidas de cobrança cabíveis, observadas as disposições deste contrato e da legislação aplicável.",
  "12. Obrigações da locadora quanto a defeitos",
  "12.1. A LOCADORA será responsável por defeitos preexistentes ou falhas de funcionamento não causadas pelo LOCATÁRIO, após verificação.",
  "12.2. Quando necessário e disponível, a LOCADORA poderá realizar reparo ou substituição do equipamento afetado, sem cobrança ao LOCATÁRIO por defeito que não lhe seja atribuível.",
  "13. Entrega, retirada e transporte",
  "13.1. A responsabilidade pelo transporte, entrega e retirada de cada equipamento será definida entre as partes no momento da contratação, podendo ser da LOCADORA, do LOCATÁRIO ou de terceiro autorizado.",
  "13.2. Quando a LOCADORA for responsável pela entrega ou retirada, o LOCATÁRIO deverá fornecer informações corretas de endereço e garantir acesso ao local.",
  "13.3. Se o LOCATÁRIO impedir, dificultar ou inviabilizar a entrega ou retirada por circunstância que lhe seja atribuível, poderá responder pelos custos adicionais decorrentes, além das diárias e multas previstas neste contrato, quando aplicáveis.",
  "14. Acidentes e responsabilidade perante terceiros",
  "14.1. O LOCATÁRIO será responsável pela utilização dos equipamentos e pelos acidentes, danos ou prejuízos causados a si próprio ou a terceiros em decorrência de uso inadequado, operação indevida ou descumprimento das orientações de segurança.",
  "14.2. A LOCADORA não será responsável por danos decorrentes de utilização inadequada, negligente ou contrária às orientações fornecidas.",
  "15. Rescisão e encerramento",
  "15.1. O contrato poderá ser encerrado antecipadamente mediante comunicação entre as partes, observadas as obrigações financeiras já constituídas.",
  "15.2. A LOCADORA poderá exigir a devolução imediata dos equipamentos em caso de uso inadequado, descumprimento contratual, risco de dano, inadimplência ou utilização em local não autorizado.",
  "15.3. O encerramento do contrato não elimina valores já devidos pelo LOCATÁRIO em razão de diárias adicionais, danos, limpeza, perda, furto, roubo, extravio, reparos, reposição ou demais obrigações constituídas durante a locação.",
  "16. Proibição de sublocação e cessão",
  "16.1. O LOCATÁRIO não poderá sublocar, emprestar, ceder ou transferir a terceiros os equipamentos, total ou parcialmente, sem autorização prévia e expressa da LOCADORA.",
  "17. Comunicações",
  "17.1. As comunicações relacionadas ao contrato poderão ser realizadas por telefone, WhatsApp ou outro meio informado pelas partes, desde que seja possível identificar o remetente e o conteúdo da comunicação.",
  "17.2. O LOCATÁRIO deverá manter seus dados de contato e endereço atualizados durante a vigência da locação.",
  "18. Título executivo extrajudicial",
  "18.1. Este instrumento poderá constituir título executivo extrajudicial quando preenchidos os requisitos legais aplicáveis, inclusive quanto à assinatura das partes e testemunhas, nos termos da legislação vigente.",
  "19. Foro",
  "19.1. Fica eleito o foro da Comarca de Porto Seguro, Estado da Bahia, para dirimir questões decorrentes deste contrato, ressalvadas as hipóteses em que a legislação aplicável determine foro diverso."
];

function configurarContratoPDF_(planilha) {
  const aba = prepararAba_(planilha, ABA_CONFIG_CONTRATO, ['Campo', 'Valor'], ['A:B'], '');
  const existentes = aba.getLastRow() < 2 ? [] :
    aba.getRange(2, 1, aba.getLastRow() - 1, 1).getValues().map(r => String(r[0]));
  // Migra as condições gerais uma vez; não altera taxas percentuais das categorias.
  if (!existentes.includes('versaoModelo')) {
    const linhas = aba.getLastRow() < 2 ? [] : aba.getRange(2, 1, aba.getLastRow() - 1, 2).getValues();
    ['antecedenciaHoras', 'foro'].forEach(campo => {
      const indice = linhas.findIndex(l => String(l[0]) === campo);
      if (indice >= 0) aba.getRange(indice + 2, 2).setValue(CONFIG_CONTRATO_PADRAO[campo]);
    });
  }
  const faltantes = CAMPOS_CONFIG_CONTRATO.filter(c => !existentes.includes(c));
  if (faltantes.length)
    aba.getRange(aba.getLastRow() + 1, 1, faltantes.length, 2)
      .setValues(faltantes.map(c => [c, CONFIG_CONTRATO_PADRAO[c]]));
  prepararAba_(planilha, ABA_TERMOS_CONTRATO,
    ['ID contrato', 'Condições JSON', 'Primeira emissão'], ['A:B'], '');
}

function abasContratoPDF_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROP_PLANILHA);
  if (!id) throw new Error('Execute configurar no editor do Apps Script.');
  const livro = SpreadsheetApp.openById(id);
  const configuracao = livro.getSheetByName(ABA_CONFIG_CONTRATO);
  const termos = livro.getSheetByName(ABA_TERMOS_CONTRATO);
  if (!configuracao || !termos)
    throw new Error('Execute configurar novamente para preparar os PDFs dos contratos.');
  return { configuracao, termos };
}

function lerConfiguracaoContrato_(aba) {
  const valores = aba.getLastRow() < 2 ? [] :
    aba.getRange(2, 1, aba.getLastRow() - 1, 2).getValues();
  const config = { ...CONFIG_CONTRATO_PADRAO };
  valores.forEach(([campo, valor]) => {
    if (CAMPOS_CONFIG_CONTRATO.includes(String(campo))) config[String(campo)] = valor;
  });
  config.antecedenciaHoras = Number(config.antecedenciaHoras);
  config.multaPercentual = Number(config.multaPercentual);
  config.taxaLimpeza = Number(config.taxaLimpeza);
  return config;
}

function obterConfiguracaoContrato() {
  return lerConfiguracaoContrato_(abasContratoPDF_().configuracao);
}

function validarConfiguracaoContrato_(dados) {
  if (!dados || typeof dados !== 'object') throw new Error('Informe os dados da locadora.');
  const texto = (v, limite, obrigatorio) => {
    if (typeof v !== 'string') throw new Error('Confira os campos da locadora.');
    const valor = v.trim();
    if ((obrigatorio && !valor) || valor.length > limite || /[\u0000-\u001F\u007F]/.test(valor))
      throw new Error('Confira os dados da locadora e o tamanho dos campos.');
    return valor;
  };
  const percentual = v => {
    const numero = Number(v);
    if (v == null || String(v).trim() === '' || !Number.isFinite(numero) || numero < 0 || numero > 100 || Math.round(numero * 100) / 100 !== numero)
      throw new Error('Informe uma multa de 0% a 100%, com até duas casas decimais.');
    return numero;
  };
  const documento = normalizarDocumento_(texto(dados.documento, 30, true));
  if (!documentoValido_(documento)) throw new Error('CPF/CNPJ da locadora inválido.');
  const antecedenciaHoras = Number(dados.antecedenciaHoras);
  if (!Number.isInteger(antecedenciaHoras) || antecedenciaHoras < 0 || antecedenciaHoras > 168)
    throw new Error('Informe de 0 a 168 horas de antecedência.');
  return {
    nome: texto(dados.nome, 150, true), documento,
    endereco: texto(dados.endereco, 200, true),
    bairro: texto(dados.bairro, 100, false),
    cidade: texto(dados.cidade, 100, false),
    foro: texto(dados.foro, 100, false),
    antecedenciaHoras, multaPercentual: percentual(dados.multaPercentual),
    versaoModelo: 'v08',
    // Valor legado preservado internamente; não há mais campo fixo no formulário.
    taxaLimpeza: obterConfiguracaoContrato().taxaLimpeza,
    formasPagamento: texto(dados.formasPagamento, 200, true)
  };
}

function salvarConfiguracaoContrato(dados) {
  const config = validarConfiguracaoContrato_(dados);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const { configuracao } = abasContratoPDF_();
    const rows = configuracao.getRange(2, 1, configuracao.getLastRow() - 1, 2).getValues();
    const indices = new Map(rows.map(([campo], i) => [String(campo), i + 2]));
    CAMPOS_CONFIG_CONTRATO.forEach(campo => {
      const linha = indices.get(campo);
      if (!linha) throw new Error('Execute configurar novamente para restaurar os campos de contrato.');
      configuracao.getRange(linha, 2).setValue(proteger_(String(config[campo])));
    });
    SpreadsheetApp.flush();
    return config;
  } finally { lock.releaseLock(); }
}

/** A primeira emissão registra as condições então vigentes para novas cópias. */
function termosParaContrato_(id) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const { configuracao, termos } = abasContratoPDF_();
    if (termos.getLastRow() > 1) {
      const existentes = termos.getRange(2, 1, termos.getLastRow() - 1, 3).getValues();
      const salvo = existentes.find(r => String(r[0]) === id);
      if (salvo) {
        const config = JSON.parse(String(salvo[1]));
        if (config.versaoModelo !== 'v08') {
          Object.assign(config, {antecedenciaHoras: 3, multaPercentual: 50,
            foro: 'Porto Seguro, Estado da Bahia', versaoModelo: 'v08'});
          termos.getRange(existentes.indexOf(salvo) + 2, 2).setValue(JSON.stringify(config));
          SpreadsheetApp.flush();
        }
        return config;
      }
    }
    const config = lerConfiguracaoContrato_(configuracao);
    termos.getRange(termos.getLastRow() + 1, 1, 1, 3)
      .setValues([[id, JSON.stringify(config), new Date()]]);
    SpreadsheetApp.flush();
    return config;
  } finally { lock.releaseLock(); }
}

function gerarPDFContrato(id) {
  if (typeof id !== 'string' || !/^LOC-\d{6,}$/.test(id))
    throw new Error('Contrato inválido.');
  const { contratos, itens } = abasContratos_();
  const contrato = lerContratos_(contratos).find(c => c.id === id);
  if (!contrato) throw new Error('Contrato não encontrado. Atualize a lista.');
  const equipamentos = lerItensContrato_(itens).filter(i => i.contratoId === id);
  if (!equipamentos.length) throw new Error('Contrato sem equipamentos registrados.');
  const config = termosParaContrato_(id);
  const aberto = contrato.modalidade === 'ABERTO', emAberto = aberto && contrato.status === 'ATIVO';
  const nomeArquivo = 'Contrato_Muviloc_' + id + '.pdf';
  const doc = DocumentApp.create('Temporario_' + nomeArquivo);
  const idTemporario = doc.getId();
  let resultado;
  try {
    const corpo = doc.getBody();
    const logo = Utilities.newBlob(Utilities.base64Decode(LOGO_CONTRATO_PDF_BASE64),
      'image/png', 'Muviloc.png');
    corpo.appendImage(logo).setWidth(166).setHeight(80);
    tituloContratoPDF_(corpo, 'CONTRATO DE LOCAÇÃO DE EQUIPAMENTOS');
    paragrafoContratoPDF_(corpo, 'MUVILOC  |  Contrato nº ' + id +
      '  |  Situação: ' + (contrato.status === 'ATIVO' ? 'Ativo' : 'Finalizado'));
    paragrafoContratoPDF_(corpo, 'Documento gerado em ' +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') + '.');

    if(aberto)paragrafoContratoPDF_(corpo, TEXTO_PRAZO_ABERTO);
    tituloContratoPDF_(corpo, 'Identificação das partes', DocumentApp.ParagraphHeading.HEADING2);
    tabelaContratoPDF_(corpo, [
      ['LOCADORA', config.nome],
      ['CPF/CNPJ', config.documento],
      ['Endereço', [config.endereco, config.bairro, config.cidade].filter(Boolean).join(' · ')],
      ['LOCATÁRIO', contrato.cliente],
      ['CPF/CNPJ', contrato.documento],
      ['Telefone', contrato.telefone],
      ['Endereço cadastral', contrato.endereco], ['Endereço de locação', contrato.enderecoLocacao]
    ], false);
    paragrafoContratoPDF_(corpo, 'As partes acima identificadas ajustam a locação dos equipamentos ' +
      'abaixo, observadas as condições deste instrumento.');

    tituloContratoPDF_(corpo, 'Equipamentos, períodos e valores', DocumentApp.ParagraphHeading.HEADING2);
    tabelaContratoPDF_(corpo, [
      ['Equipamento / código', emAberto?'Períodos de referência':'Períodos contratados', 'Diárias', 'Último dia', 'Subtotal'],
      ...equipamentos.map(item => [
        item.categoria + '\n' + (item.codigo.startsWith('QTD-') ? item.quantidade + ' peças' : item.codigo),
        item.blocos.map(b => (b.vezes>1?b.vezes+' × ':'') + periodoContratoPDF_(b.faixa) + ' (' +
          moedaContratoPDF_(b.preco) + (item.codigo.startsWith('QTD-') ? ' por peça' : '') + ')').join(' + '),
        emAberto ? 'A apurar' : String(item.diarias) + (aberto?' utilizadas / '+item.blocos.reduce((n,b)=>n+b.diarias*(b.vezes||1),0)+' cobertas':''), emAberto ? 'Em aberto' : (dataContratoPDF_(item.fim) + (contrato.horaFim ? ' às ' + contrato.horaFim : '')), (emAberto?'Referência: ':'')+moedaContratoPDF_(item.subtotal)
      ])
    ], true);
    if(aberto)tarifasPrazoAbertoPDF_(corpo,equipamentos,tituloContratoPDF_,tabelaContratoPDF_,moedaContratoPDF_);
    tabelaContratoPDF_(corpo, [
      ['Primeiro dia da locação', dataContratoPDF_(contrato.inicio)+(aberto?' às '+contrato.horaInicio+' ('+contrato.fuso+')':'')],
      [aberto?'Devolução / encerramento':'Último dia previsto do contrato', emAberto ? 'Sem término definido' : (dataContratoPDF_(contrato.fim) + (contrato.horaFim ? ' às ' + contrato.horaFim : ''))],
      [emAberto?'Subtotal de referência (1 diária)':'Subtotal', moedaContratoPDF_(contrato.subtotal)],
      ['Desconto', descontoContratoPDF_(contrato.desconto)],
      [emAberto?'REFERÊNCIA — VALOR FINAL A APURAR':'VALOR TOTAL DA LOCAÇÃO', moedaContratoPDF_(contrato.total)]
    ], false);

    CLAUSULAS_CONTRATO_V08.forEach(original => {
      let texto = original;
      if (/^\d+\. /.test(texto)) {
        tituloContratoPDF_(corpo, texto, DocumentApp.ParagraphHeading.HEADING2);return;
      }
      if(aberto) {
        if(texto.startsWith('2.1.'))texto='2.1. Esta locação tem prazo em aberto. Data e hora de início constam do quadro. '+(emAberto?'A devolução ou disponibilização efetiva será informada no encerramento, sem término previamente fixado.':'O encerramento efetivo e o valor final apurado constam do quadro.');
        if(texto.startsWith('2.2.'))texto='2.2. Na modalidade em aberto, não há prorrogação automática de prazo fixo: o LOCATÁRIO comunicará o término do serviço e combinará a devolução ou disponibilização para retirada com a LOCADORA.';
        if(texto.startsWith('2.3.'))texto='2.3. A permanência dos equipamentos está sujeita à apuração das diárias e não implica pagamento ou quitação.';
        if(texto.startsWith('2.4.'))texto='2.4. Quando a devolução for de responsabilidade do LOCATÁRIO, este deverá entregar os equipamentos no local acordado e informar a data e hora efetivas para fechamento.';
        if(texto.startsWith('2.6.'))texto='2.6. Se a retirada atrasar por responsabilidade exclusiva da LOCADORA após a correta disponibilização, a apuração considera a data e hora em que os equipamentos ficaram disponíveis, sem diárias ou multa pelo atraso exclusivo da LOCADORA.';
        if(texto.startsWith('2.8.'))texto='2.8. O agendamento ou tentativa de retirada não encerra, por si só, a locação: as partes registrarão a devolução ou disponibilização efetiva.';
        if(texto.startsWith('5.1.'))texto='5.1. O valor definitivo será a combinação de tarifas registradas de menor preço que cubra o tempo utilizado, multiplicada pelas quantidades e com aplicação dos descontos registrados, conforme regra de 24 horas descrita neste contrato. O quadro inicial apresenta somente uma referência de 1 diária.';
        if(texto.startsWith('5.2.'))texto='5.2. O pagamento do valor definitivo ocorrerá no encerramento, ressalvados adiantamentos ou condições expressamente acordados e registrados entre as partes.';
        if(texto.startsWith('10.1.'))texto='10.1. A modalidade em aberto não gera multa por ultrapassar uma data final inexistente. Havendo prazo de devolução posteriormente acordado e documentado entre as partes, atraso de responsabilidade do LOCATÁRIO poderá sujeitar-se à diária correspondente acrescida de multa de '+config.multaPercentual+'% da respectiva diária por dia de atraso. Essas cobranças são apuradas à parte, sem lançamento automático pelo fechamento.';
        if(texto.startsWith('11.1.'))texto='11.1. O pagamento da locação em aberto é devido conforme o fechamento, salvo condição expressamente acordada e registrada neste instrumento.';
      }
      if (!aberto && texto.startsWith('2.1.')) texto += contrato.horaFim ? ' O horário de encerramento é ' + contrato.horaFim + ', na data final de cada equipamento.' : '';
      if (texto.startsWith('2.2.')) texto = texto.replace('3 (três) horas', config.antecedenciaHoras + ' hora(s)');
      if (texto.startsWith('5.3.')) texto = '5.3. São aceitas as seguintes formas de pagamento: ' + config.formasPagamento + '.';
      if (texto.startsWith('10.1.')) texto = texto.replace('50% (cinquenta por cento)', config.multaPercentual + '%');
      if (texto.startsWith('19.1.')) texto = texto.replace('Porto Seguro, Estado da Bahia', config.foro || '____________________________');
      if (texto.startsWith('3.4.')) {
        texto = '3.4. Os equipamentos deverão ser devolvidos limpos e nas condições adequadas de conservação. Caso necessitem de limpeza extraordinária decorrente do uso pelo LOCATÁRIO, poderá ser cobrada, para cada equipamento afetado, a taxa percentual registrada na contratação e discriminada abaixo, aplicada ao valor bruto de suas diárias, antes do desconto. Em lotes, a cobrança considera somente as peças que necessitarem dessa limpeza, pelo valor por peça indicado. A cobrança é condicional, feita à parte e não está incluída no total da locação.';
      }
      paragrafoContratoPDF_(corpo, texto);
      if (texto.startsWith('3.4.')) {
        const percentuais = equipamentos.filter(i => i.taxaLimpeza != null);
        if (percentuais.length) tabelaContratoPDF_(corpo, [
          ['Equipamento / código', 'Percentual', 'Limpeza condicional — à parte'],
          ...percentuais.map(i => [i.categoria + ' · ' + (i.codigo.startsWith('QTD-') ? i.quantidade + ' peças' : i.codigo),
            i.taxaLimpeza + '%', (emAberto?'Referência provisória: ':'')+moedaContratoPDF_(Math.round(i.subtotal * i.taxaLimpeza) / 100) +
            (i.quantidade > 1 ? ' no lote (' + moedaContratoPDF_(Math.round(i.subtotal / i.quantidade * i.taxaLimpeza) / 100) + ' por peça)' : '')])
        ], true);
        if(emAberto)paragrafoContratoPDF_(corpo,'Os valores de limpeza acima são referências provisórias de 1 diária. A base será recalculada com o subtotal bruto final, sem incluir essa cobrança condicional no total da locação.');
        const legados = equipamentos.filter(i => i.taxaLimpeza == null);
        if (legados.length) paragrafoContratoPDF_(corpo, 'Condição anterior preservada para os itens sem percentual registrado: ' +
          legados.map(i => i.categoria + ' · ' + (i.codigo.startsWith('QTD-') ? i.quantidade + ' peças' : i.codigo)).join('; ') +
          '. Taxa fixa de limpeza da condição anterior: ' + moedaContratoPDF_(config.taxaLimpeza ?? 0) + ', somente se necessária, à parte. Nenhum percentual foi atribuído retroativamente a esses itens.');
      }
    });
    corpo.appendPageBreak();
    tituloContratoPDF_(corpo, 'Assinaturas', DocumentApp.ParagraphHeading.HEADING2);
    paragrafoContratoPDF_(corpo, 'Contrato nº ' + id + ' · ' + contrato.cliente).editAsText().setFontSize(10);
    paragrafoContratoPDF_(corpo, 'E, por estarem de acordo, assinam o presente instrumento, com duas testemunhas, em duas vias de igual teor.')
      .setSpacingAfter(18);
    paragrafoContratoPDF_(corpo, 'Local e data da assinatura: ' +
      (config.cidade || '____________________________') + ', ____/____/________')
      .setSpacingAfter(26);
    blocoAssinaturasContratoPDF_(corpo, config.nome, contrato.cliente);

    doc.saveAndClose();
    const pdf = DocumentApp.openById(idTemporario).getAs('application/pdf');
    resultado = { nome: nomeArquivo, base64: Utilities.base64Encode(pdf.getBytes()) };
  } finally {
    try { DriveApp.getFileById(idTemporario).setTrashed(true); }
    catch (erro) {
      console.warn('Falha ao limpar documento temporário do contrato ' + idTemporario + ': ' + erro);
      if (resultado) resultado.aviso =
        'O documento temporário ficou no Drive. Autorize a limpeza e remova o arquivo Temporario_ depois.';
    }
  }
  return resultado;
}

/** Colunas independentes evitam que nomes longos invadam a outra assinatura. */
function blocoAssinaturasContratoPDF_(corpo, locadora, locatario) {
  const tabela = corpo.appendTable([['', ''], ['', '']]);
  tabela.setBorderWidth(0);
  const largura = (corpo.getPageWidth() - corpo.getMarginLeft() - corpo.getMarginRight()) / 2;
  tabela.setColumnWidth(0, largura);tabela.setColumnWidth(1, largura);
  const linhas = [
    [ ['____________________________', 'LOCADORA', locadora],
      ['____________________________', 'LOCATÁRIO', locatario] ],
    [ ['____________________________', 'TESTEMUNHA 1', 'Nome: ________________________', 'CPF: _________________________'],
      ['____________________________', 'TESTEMUNHA 2', 'Nome: ________________________', 'CPF: _________________________'] ]
  ];
  linhas.forEach((linha, r) => linha.forEach((textos, c) => {
    const celula = tabela.getRow(r).getCell(c);
    celula.setPaddingLeft(12).setPaddingRight(12).setPaddingTop(r === 0 ? 22 : 38).setPaddingBottom(18);
    textos.forEach((texto, i) => {
      const p = i === 0 ? celula.getChild(0).asParagraph() : celula.appendParagraph(texto);
      // Guarde o parágrafo, sem depender do retorno de setText.
      if (i === 0) p.setText(texto);
      p.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingBefore(0).setSpacingAfter(i === 0 ? 10 : 6).setLineSpacing(1.15);
      p.editAsText().setFontSize(10).setForegroundColor('#000000').setBold(i === 1);
    });
  }));
  return tabela;
}

function tituloContratoPDF_(corpo, texto, estilo) {
  const titulo = corpo.appendParagraph(texto)
    .setHeading(estilo || DocumentApp.ParagraphHeading.HEADING1);
  titulo.editAsText().setForegroundColor('#000000');
}

function paragrafoContratoPDF_(corpo, texto) {
  const paragrafo = corpo.appendParagraph(texto);
  paragrafo.editAsText().setForegroundColor('#000000');
  return paragrafo;
}

function tabelaContratoPDF_(corpo, linhas, cabecalho) {
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

function dataContratoPDF_(iso) {
  return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
}

function moedaContratoPDF_(valor) {
  return 'R$ ' + Number(valor).toLocaleString('pt-BR',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function descontoContratoPDF_(desconto) {
  if (!desconto || desconto.tipo === 'nenhum') return 'Sem desconto';
  const criterio = desconto.tipo === 'percentual' ?
    String(desconto.valor).replace('.', ',') + '%' : moedaContratoPDF_(desconto.valor);
  return criterio + ' (- ' + moedaContratoPDF_(desconto.aplicado) + ')';
}

function periodoContratoPDF_(faixa) {
  return ({ diaria1: '01 diária', diaria2: '02 diárias', diaria3: '03 diárias',
    diaria4: '04 diárias', diaria5: '05 diárias', semana: 'Semana',
    quinzena: 'Quinzena', diarias21: '21 diárias', mensal: 'Mensal' })[faixa] || faixa;
}

// Logo Muviloc compacta, incorporada para a geração independente do PDF.
const LOGO_CONTRATO_PDF_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAU0AAAChCAMAAAB03x27AAAAwFBMVEVjX1mljGVdSS8eHx1+fYB+g4mJXh/CrqXe3OI8QUeAf4KcoqjUqdRDPzulflnW0Lf+/v4CBAJyRgLr6efZ1dHNycaSd1AUFhWGZTXPxbi4ppHGuasnKCh5WSc2NjdmPQF5UxiqlHfi2tS3trerqKlGRkdoaGlWVlZ2dniIbESjimvn4tyIh4mtm4WCXCmZhWiWlZeZglt9YzLCspyBWBpaOAObnKO9sZu8u8MdISPBrZkjIRuinaM4PUOMfW3EvMTp+MoiAAAAQHRSTlP/////////////////////////////////////////////////////////////////////////////////////73leyQAAEctJREFUeNrtnYl2m7gagN1t2lnuvQQJzGIM2HgDL1nbNO207/9WV4CQfgkJcJqZkkaac6ZJDBg+/buENLFMe7o2MQgMTUPT0DTtl6SJDM2nayfbxYbm07TQi2PbPi0MzSdQ8h1BWbXA0PzRdhPZrOXI0PyRltq1YMZUPg+G5qPbwiMQYxu02DU0H9fwCVBkP2BD83FKDprXEDU0H9McF7J0rCJIatkMDM3zw/UYKHntevL617QyAgdsaA5tAYiKWBYU1L+eKsmNkxQbmkPaARrMnGVAfi2uu0o2y593jqHZGxXtAMsECCCuaUbVQbVTcg3NzlYInvwEcx9kc5qImoLkYGh21DdgoB5Jmnxd/70of2Yef4cMzQFRkX1oOKGw/pd+6ldqz43BARmaPYJp2yGzl14cQu/0CXp4ztfQ1Apmcigap1Sml0tIO60/uIFBlG9oCnLpATjXn9jfc1DYXNg8RCoNAIykXMfQVEZFjfABgDSbjLhTr20ADPKvDE2a5SQwJw/bppTSpPLLvQ6CSVMUGJow2mmPVqTCH6kEw5QSQQuxMzQF75xKI2k7QffremcsuBxBPENDk4um2xqVpKRygbvEDF2pLO5LpbmztVmib4O6EbOirePCaCSeaAQ0Pf3wbiO2tLrhCL+RpF7m6RqaOymfCZjsoUSkuRBpIi/nOGNDk9NMWE5+5GLq2CJNWkXy+McsnPKNbAJ1Tuog0q81diF5+4YSNbD0tyVwSYZmm2ZxFPyMKweS1MQKwWgOaO4MTZeLY+PD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';
