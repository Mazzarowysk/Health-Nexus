const https = require('https');

function get(url, headers = {}) {
  return new Promise((resolve) => {
    try {
      const opts = new URL(url);
      const req = https.get({
        hostname: opts.hostname,
        path: opts.pathname + opts.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, */*',
          ...headers
        }
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', e => resolve({ status: 0, error: e.message }));
      req.setTimeout(8000, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    } catch(e) {
      resolve({ status: 0, error: e.message });
    }
  });
}

async function main() {
  // Test: Open Health Data (dados.gov.br)
  console.log('--- dados.gov.br (ANVISA Medicamentos) ---');
  const r1 = await get('https://dados.gov.br/api/3/action/package_search?q=medicamentos+anvisa&rows=3');
  console.log('Status:', r1.status);
  console.log('Body:', r1.body?.substring(0, 300));

  // Test: OpenFDA (funciona bem para medicamentos internacionais)
  console.log('\n--- OpenFDA (drug search) ---');
  const r2 = await get('https://api.fda.gov/drug/label.json?search=openfda.generic_name:amoxicillin&limit=1');
  console.log('Status:', r2.status);
  const parsed2 = r2.body ? JSON.parse(r2.body) : null;
  if (parsed2?.results) {
    console.log('Generic name:', parsed2.results[0]?.openfda?.generic_name?.[0]);
    console.log('Brand:', parsed2.results[0]?.openfda?.brand_name?.[0]);
  }

  // Test: Bulário ANVISA via scrape alt
  console.log('\n--- Bulario ANVISA alt ---');
  const r3 = await get('https://bulas.ms.gov.br/api/v1/bulas?q=amoxicilina&limit=3');
  console.log('Status:', r3.status, 'error:', r3.error || '');
  console.log('Body:', r3.body?.substring(0, 300));

  // Test: CFM via official JSON API
  console.log('\n--- CFM JSON API ---');
  const r4 = await get('https://sistemas.cfm.org.br/cfmAtividades/viewMedico.php?crm=100000&uf=SP');
  console.log('Status:', r4.status);
  console.log('Body:', r4.body?.substring(0, 400));

  // Test: RQE CFM
  console.log('\n--- CFM RQE ---');
  const r5 = await get('https://rqe.cfm.org.br/rqe/rqe-medico.cfm?ufCRM=SP&numeroCRM=100000');
  console.log('Status:', r5.status);
  console.log('Body:', r5.body?.substring(0, 300));
}

main().catch(console.error);
