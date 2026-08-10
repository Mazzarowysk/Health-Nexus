const https = require('https');

function get(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'Authorization': 'Guest', 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', e => resolve({ status: 0, error: e.message }));
    req.setTimeout(8000, () => { req.abort(); resolve({ status: 0, error: 'timeout' }); });
  });
}

async function main() {
  // Test 1: ANVISA API search by name
  console.log('\n--- ANVISA: Search by name ---');
  const r1 = await get('https://consultas.anvisa.gov.br/api/consulta/medicamentos/?count=3&filter[nomeProduto]=amoxicilina');
  console.log('Status:', r1.status);
  if (r1.body) console.log('Body preview:', r1.body.substring(0, 300));

  // Test 2: ANVISA bulario
  console.log('\n--- ANVISA: Bulario ---');
  const r2 = await get('https://consultas.anvisa.gov.br/api/bulario/?count=3&filter[nomeProduto]=amoxicilina');
  console.log('Status:', r2.status);
  if (r2.body) console.log('Body preview:', r2.body.substring(0, 300));

  // Test 3: CFM verify
  console.log('\n--- CFM: CRM verify ---');
  const r3 = await get('https://sistemas.cfm.org.br/executavrf/executavrf.php?crm=100000&uf=SP');
  console.log('Status:', r3.status);
  if (r3.body) console.log('Body preview:', r3.body.substring(0, 400));

  // Test 4: ANVISA open data
  console.log('\n--- ANVISA Open Data ---');
  const r4 = await get('https://dados.anvisa.gov.br/api/informacoes/1?name=medicamentos');
  console.log('Status:', r4.status);
  if (r4.body) console.log('Body:', r4.body.substring(0, 300));
}

main();
