/**
 * Health Nexus - Módulo de Faturamento & Exportação de Lotes TISS 4.01 XML
 * Em conformidade com o padrão TISS 4.01.00 da Agência Nacional de Saúde Suplementar (ANS)
 */

export const TUSS_PROCEDURES = [
  { code: '10101012', desc: 'Consulta em consultório (no horário normal ou preestabelecido)', type: 'consulta', valor: 150.00 },
  { code: '10101039', desc: 'Consulta em pronto-socorro / atendimento de urgência e emergência', type: 'urgencia', valor: 220.00 },
  { code: '40304360', desc: 'Hemograma completo com contagem de plaquetas', type: 'sadt', valor: 45.00 },
  { code: '40301638', desc: 'Glicemia de jejum / dosagem quantitativa', type: 'sadt', valor: 25.00 },
  { code: '40808041', desc: 'Radiografia de tórax (PA e Perfil)', type: 'sadt', valor: 95.00 },
  { code: '40101010', desc: 'Eletrocardiograma convencional (ECG 12 derivações)', type: 'sadt', valor: 65.00 },
  { code: '40901122', desc: 'Ultrassonografia de abdome total', type: 'sadt', valor: 180.00 },
  { code: '20104049', desc: 'Sutura de pequenos ferimentos com anestesia local', type: 'procedimento', valor: 130.00 }
];

/**
 * Calcula o hash MD5 em JavaScript puro para o epílogo TISS
 */
export function calculateMD5(string) {
  function RotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function AddUnsigned(lX, lY) {
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    }
    return lResult ^ lX8 ^ lY8;
  }
  function F(x, y, z) { return (x & y) | ((~x) & z); }
  function G(x, y, z) { return (x & z) | (y & (~z)); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | (~z)); }

  function FF(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function GG(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function HH(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function II(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function ConvertToWordArray(string) {
    let lWordCount;
    const lMessageLength = string.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  function WordToHex(lValue) {
    let WordToHexValue = '', WordToHexValue_temp = '', lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = '0' + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }

  const x = ConvertToWordArray(string);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], 7, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], 12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], 17, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], 7, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], 12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], 17, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], 22, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], 7, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], 12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], 17, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], 22, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], 7, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], 12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], 17, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], 22, 0x49b40821);

    a = GG(a, b, c, d, x[k + 1], 5, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], 9, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], 14, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], 5, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], 9, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], 14, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], 5, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], 9, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], 14, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], 20, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], 5, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], 14, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);

    a = HH(a, b, c, d, x[k + 5], 4, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], 11, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], 16, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], 23, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], 4, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], 16, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], 4, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], 11, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], 16, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], 23, 0x04881d05);
    a = HH(a, b, c, d, x[k + 9], 4, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], 11, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], 16, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], 23, 0xc4ac5665);

    a = II(a, b, c, d, x[k + 0], 6, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], 10, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], 15, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], 21, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], 6, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], 15, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], 21, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], 15, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], 6, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], 10, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], 21, 0xeb86d391);

    a = AddUnsigned(a, AA);
    b = AddUnsigned(b, BB);
    c = AddUnsigned(c, CC);
    d = AddUnsigned(d, DD);
  }

  return (WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d)).toLowerCase();
}

/**
 * Gera o lote XML completo em conformidade com o padrão TISS 4.01.00
 */
export function generateTISS401XML({
  numeroLote = '1001',
  registroANS = '359012',
  cnpjPrestador = '12345678000199',
  cnesHospital = '7654321',
  nomeHospital = 'Hospital & Maternidade Health Nexus',
  operadoraNome = 'Unimed Central',
  atendimentos = []
}) {
  const dataEnvio = new Date().toISOString().split('T')[0];
  const horaEnvio = new Date().toTimeString().split(' ')[0];

  let guiasXml = '';
  let valorTotalLote = 0;

  atendimentos.forEach((at, index) => {
    const numGuia = `G${numeroLote}${String(index + 1).padStart(4, '0')}`;
    const isUrgencia = at.tipo === 'urgencia' || at.manchesterColor === 'VERMELHO' || at.manchesterColor === 'LARANJA';
    const valorConsulta = isUrgencia ? 220.00 : 150.00;
    const codTuss = isUrgencia ? '10101039' : '10101012';
    valorTotalLote += valorConsulta;

    guiasXml += `
        <ans:guiaConsulta>
          <ans:cabecalhoConsulta>
            <ans:registroANS>${registroANS}</ans:registroANS>
            <ans:numeroGuiaPrestador>${numGuia}</ans:numeroGuiaPrestador>
          </ans:cabecalhoConsulta>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>${at.carteirinha || '0000000000000000'}</ans:numeroCarteira>
            <ans:nomeBeneficiario>${at.paciente_nome || 'Paciente Health Nexus'}</ans:nomeBeneficiario>
            <ans:atendimentoRN>N</ans:atendimentoRN>
          </ans:dadosBeneficiario>
          <ans:dadosContratadoExecutante>
            <ans:codigoPrestadorNaOperadora>${cnpjPrestador}</ans:codigoPrestadorNaOperadora>
            <ans:nomeContratado>${nomeHospital}</ans:nomeContratado>
            <ans:CNES>${cnesHospital}</ans:CNES>
          </ans:dadosContratadoExecutante>
          <ans:dadosProfissionalExecutante>
            <ans:nomeProfissional>${at.medico_nome || 'Dr. Médico Assistente'}</ans:nomeProfissional>
            <ans:conselhoProfissional>06</ans:conselhoProfissional>
            <ans:numeroConselhoProfissional>${at.medico_crm || '123456'}</ans:numeroConselhoProfissional>
            <ans:UF>SP</ans:UF>
            <ans:CBOS>225125</ans:CBOS>
          </ans:dadosProfissionalExecutante>
          <ans:dadosAtendimento>
            <ans:dataAtendimento>${at.data || dataEnvio}</ans:dataAtendimento>
            <ans:tipoConsulta>1</ans:tipoConsulta>
            <ans:procedimento>
              <ans:codigoTabela>22</ans:codigoTabela>
              <ans:codigoProcedimento>${codTuss}</ans:codigoProcedimento>
              <ans:valorProcedimento>${valorConsulta.toFixed(2)}</ans:valorProcedimento>
            </ans:procedimento>
            <ans:diagnosticoAtendimento>
              <ans:tabelaDiagnostico>CID-10</ans:tabelaDiagnostico>
              <ans:codigoDiagnostico>${at.cid || 'Z00.0'}</ans:codigoDiagnostico>
            </ans:diagnosticoAtendimento>
          </ans:dadosAtendimento>
        </ans:guiaConsulta>`;
  });

  const xmlCorpo = `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>${numeroLote}</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${dataEnvio}</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>${horaEnvio}</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:codigoPrestadorNaOperadora>${cnpjPrestador}</ans:codigoPrestadorNaOperadora>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>${registroANS}</ans:registroANS>
    </ans:destino>
    <ans:Padrao>4.01.00</ans:Padrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>${numeroLote}</ans:numeroLote>
      <ans:guiasTISS>
${guiasXml}
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

  const hashMD5 = calculateMD5(xmlCorpo);

  const xmlFinal = xmlCorpo.replace(
    '</ans:mensagemTISS>',
    `  <ans:epilogo>
    <ans:hash>${hashMD5}</ans:hash>
  </ans:epilogo>
</ans:mensagemTISS>`
  );

  return {
    xml: xmlFinal,
    hashMD5,
    numeroLote,
    totalGuias: atendimentos.length,
    valorTotal: valorTotalLote,
    dataEnvio
  };
}

/**
 * Dispara o download do arquivo XML TISS gerado
 */
export function downloadTISSFile(xmlContent, filename = 'LOTE_TISS_4_01_HEALTH_NEXUS.xml') {
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
