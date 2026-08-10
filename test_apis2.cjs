const https = require('https');

function get(url, headers = {}) {
  return new Promise((resolve) => {
    const opts = new URL(url);
    const req = https.get({
      hostname: opts.hostname,
      path: opts.pathname + opts.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/html, */*',
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', e => resolve({ status: 0, error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

async function main() {
  // Test ANVISA different endpoints
  const urls = [
    'https://consultas.anvisa.gov.br/api/consulta/medicamentos/?count=3&filter[nomeProduto]=dipirona',
    'https://consultas.anvisa.gov.br/api/consulta/bulario/?count=3&filter[nomeProduto]=dipirona',
    'https://queridodiario.open-knowledge-brasil.org/api/gazettes?querystring=ANVISA&territory_ids=&published_since=&published_until=&scraped_since=&scraped_until=&sort_by=relevance&page_size=1',
    'https://portalservicos.anvisa.gov.br/sctc/medicamentos/1.0.0/api/produto?termoBusca=amoxicilina&page=0&size=5&tipoProuto=MEDICAMENTO',
    'https://consultas.anvisa.gov.br/api/consulta/medicamentos/?count=3&filter[nomeProduto]=amoxicilina&Authorization=Guest',
  ];

  for (const url of urls) {
    console.log('\nURL:', url.substring(0, 80));
    const r = await get(url);
    console.log('Status:', r.status);
    if (r.body && r.body.length > 0) {
      const preview = r.body.substring(0, 250);
      console.log('Body:', preview);
    }
  }

  // Test CFM
  console.log('\n--- CFM CRM lookup ---');
  const cfm = await get('https://portal.cfm.org.br/busca-medicos/?q=123456&uf=SP');
  console.log('Status:', cfm.status);
  console.log('Body:', cfm.body.substring(0, 200));

  // Test alternative ANVISA
  console.log('\n--- ANVISA alternativa ---');
  const alt = await get('https://consultas.anvisa.gov.br/api/consulta/medicamentos/?count=5&filter[nomeProduto]=amoxicilina', {
    'Authorization': 'Guest',
    'Referer': 'https://consultas.anvisa.gov.br/'
  });
  console.log('Status:', alt.status);
  console.log('Body:', alt.body.substring(0, 400));
}

main().catch(console.error);
