import fs from 'fs';
import path from 'path';

const hospitalMedications = [
  // Vasopressores, Inotrópicos e Ressuscitação
  { nome: "Noradrenalina (Hemitartarato de Norepinefrina)", dose: "4mg/4mL (1 amp)", via: "EV" },
  { nome: "Noradrenalina em Solução (BIC)", dose: "8mg + SG 5% 250mL", via: "EV" },
  { nome: "Dobutamina", dose: "250mg/20mL (1 amp)", via: "EV" },
  { nome: "Dopamina", dose: "50mg/10mL (1 amp)", via: "EV" },
  { nome: "Adrenalina (Epinefrina)", dose: "1mg/mL (1 amp)", via: "EV" },
  { nome: "Adrenalina (Epinefrina)", dose: "0.5mg (1/2 amp)", via: "IM" },
  { nome: "Atropina (Sulfato de Atropina)", dose: "0.5mg/mL (1 amp)", via: "EV" },
  { nome: "Vasopressina", dose: "20UI/mL (1 amp)", via: "EV" },
  { nome: "Nitroglicerina (Tridil)", dose: "50mg/10mL", via: "EV" },
  { nome: "Nitroprussiato de Sódio (Nipride)", dose: "50mg (Frasco)", via: "EV" },
  { nome: "Amiodarona", dose: "150mg/3mL (1 amp)", via: "EV" },
  { nome: "Amiodarona em Solução", dose: "300mg + SG 5% 250mL", via: "EV" },
  { nome: "Adenosina", dose: "6mg/2mL (Bolus rápido)", via: "EV" },
  { nome: "Metoprolol", dose: "5mg/5mL", via: "EV" },
  { nome: "Esmolol", dose: "100mg/10mL", via: "EV" },

  // Antibióticos Hospitalares e Sepse
  { nome: "Ceftriaxona (Rocefin)", dose: "1g (Frasco)", via: "EV" },
  { nome: "Ceftriaxona (Rocefin)", dose: "2g (Frasco)", via: "EV" },
  { nome: "Cefepima", dose: "1g (Frasco)", via: "EV" },
  { nome: "Cefepima", dose: "2g (Frasco)", via: "EV" },
  { nome: "Cefazolina", dose: "1g (Frasco)", via: "EV" },
  { nome: "Cefotaxima", dose: "1g (Frasco)", via: "EV" },
  { nome: "Meropenem", dose: "1g (Frasco)", via: "EV" },
  { nome: "Imipenem + Cilastatina", dose: "500mg (Frasco)", via: "EV" },
  { nome: "Ertapenem", dose: "1g (Frasco)", via: "EV" },
  { nome: "Vancomicina", dose: "500mg (Frasco)", via: "EV" },
  { nome: "Vancomicina", dose: "1g (Frasco)", via: "EV" },
  { nome: "Piperacilina + Tazobactam (Tazocin)", dose: "4,5g (Frasco)", via: "EV" },
  { nome: "Polimixina B", dose: "500.000 UI", via: "EV" },
  { nome: "Colistina (Colistimetato de Sódio)", dose: "1.000.000 UI", via: "EV" },
  { nome: "Daptomicina", dose: "500mg", via: "EV" },
  { nome: "Linezolida", dose: "600mg (Bolsa 300mL)", via: "EV" },
  { nome: "Linezolida", dose: "600mg", via: "VO" },
  { nome: "Ciprofloxacino", dose: "400mg (Bolsa 200mL)", via: "EV" },
  { nome: "Ciprofloxacino", dose: "500mg", via: "VO" },
  { nome: "Levofloxacino", dose: "500mg (Bolsa 100mL)", via: "EV" },
  { nome: "Levofloxacino", dose: "750mg (Bolsa 150mL)", via: "EV" },
  { nome: "Metronidazol", dose: "500mg (Bolsa 100mL)", via: "EV" },
  { nome: "Amicacina", dose: "500mg (1 amp)", via: "EV" },
  { nome: "Gentamicina", dose: "80mg/2mL", via: "EV" },
  { nome: "Azitromicina", dose: "500mg (Frasco)", via: "EV" },
  { nome: "Claritromicina", dose: "500mg (Frasco)", via: "EV" },
  { nome: "Fluconazol", dose: "200mg (Bolsa 100mL)", via: "EV" },
  { nome: "Anidulafungina", dose: "100mg", via: "EV" },
  { nome: "Micafungina", dose: "100mg", via: "EV" },
  { nome: "Anfotericina B Lipossomal", dose: "50mg", via: "EV" },
  { nome: "Aciclovir", dose: "250mg", via: "EV" },
  { nome: "Oseltamivir (Tamiflu)", dose: "75mg", via: "VO" },

  // Sedação, Analgesia, Anestesia e Bloqueadores Neuromusculares
  { nome: "Fentanil (Fentanila)", dose: "50mcg/mL (amp 2mL)", via: "EV" },
  { nome: "Fentanil (Fentanila) em Solução (BIC)", dose: "1000mcg + SF 0,9% 100mL", via: "EV" },
  { nome: "Remifentanil", dose: "2mg", via: "EV" },
  { nome: "Morfina (Sulfato de Morfina)", dose: "10mg/mL (amp 1mL)", via: "EV" },
  { nome: "Morfina (Sulfato de Morfina)", dose: "10mg/mL (amp 1mL)", via: "SC" },
  { nome: "Midazolam (Dormonid)", dose: "15mg/3mL (amp 3mL)", via: "EV" },
  { nome: "Midazolam (Dormonid)", dose: "50mg/10mL (amp 10mL)", via: "EV" },
  { nome: "Diazepam", dose: "10mg/2mL", via: "EV" },
  { nome: "Propofol 1%", dose: "200mg/20mL (amp 20mL)", via: "EV" },
  { nome: "Cetamina (Ketamina)", dose: "50mg/mL", via: "EV" },
  { nome: "Etomidato", dose: "20mg/10mL", via: "EV" },
  { nome: "Dexmedetomidina (Precedex)", dose: "200mcg/2mL", via: "EV" },
  { nome: "Rocurônio (Brometo de Rocurônio)", dose: "50mg/5mL", via: "EV" },
  { nome: "Pancurônio", dose: "4mg/2mL", via: "EV" },
  { nome: "Succinilcolina (Quelicin)", dose: "100mg", via: "EV" },
  { nome: "Cisatracúrio", dose: "10mg/5mL", via: "EV" },
  { nome: "Naloxona (Narcan)", dose: "0.4mg/mL (amp 1mL)", via: "EV" },
  { nome: "Flumazenil", dose: "0.5mg/5mL", via: "EV" },

  // Anticoagulantes e Trombolíticos
  { nome: "Enoxaparina Sódica (Clexane)", dose: "40mg/0,4mL", via: "SC" },
  { nome: "Enoxaparina Sódica (Clexane)", dose: "60mg/0,6mL", via: "SC" },
  { nome: "Enoxaparina Sódica (Clexane)", dose: "80mg/0,8mL", via: "SC" },
  { nome: "Heparina Não Fracionada", dose: "5.000 UI/0,25mL", via: "SC" },
  { nome: "Heparina Não Fracionada (Solução)", dose: "25.000 UI/5mL", via: "EV" },
  { nome: "Fondaparinux", dose: "2.5mg", via: "SC" },
  { nome: "Alteplase (Actilyse / rt-PA)", dose: "50mg", via: "EV" },
  { nome: "Varfarina Sódica (Marevan)", dose: "5mg", via: "VO" },
  { nome: "Rivaroxabana (Xarelto)", dose: "15mg", via: "VO" },
  { nome: "Rivaroxabana (Xarelto)", dose: "20mg", via: "VO" },
  { nome: "Apixabana (Eliquis)", dose: "5mg", via: "VO" },
  { nome: "Protamina (Sulfato de Protamina)", dose: "50mg/5mL", via: "EV" },

  // Corticoides e Anti-inflamatórios
  { nome: "Hidrocortisona (Succinato Sódico)", dose: "100mg", via: "EV" },
  { nome: "Hidrocortisona (Succinato Sódico)", dose: "500mg", via: "EV" },
  { nome: "Metilprednisolona (Solu-Medrol)", dose: "125mg", via: "EV" },
  { nome: "Metilprednisolona (Solu-Medrol)", dose: "500mg", via: "EV" },
  { nome: "Dexametasona", dose: "4mg/mL (amp 1mL)", via: "EV" },
  { nome: "Dexametasona", dose: "10mg/2.5mL (amp 2.5mL)", via: "EV" },
  { nome: "Betametasona", dose: "4mg", via: "IM" },
  { nome: "Cetoprofeno (Profenid)", dose: "100mg", via: "EV" },
  { nome: "Cetoprofeno", dose: "100mg", via: "IM" },
  { nome: "Tenoxicam (Tilatil)", dose: "20mg", via: "EV" },
  { nome: "Parecoxibe (Dynastat)", dose: "40mg", via: "EV" },
  { nome: "Dipirona Sódica", dose: "1g/2mL (amp 2mL)", via: "EV" },
  { nome: "Dipirona Sódica", dose: "500mg/mL gotas", via: "VO" },
  { nome: "Dipirona Sódica", dose: "500mg (comprimido)", via: "VO" },
  { nome: "Paracetamol", dose: "500mg", via: "VO" },
  { nome: "Paracetamol", dose: "750mg", via: "VO" },

  // Gastroprotetores e Antieméticos
  { nome: "Omeprazol Sódico", dose: "40mg (Frasco)", via: "EV" },
  { nome: "Omeprazol", dose: "20mg", via: "VO" },
  { nome: "Pantoprazol Sódico", dose: "40mg (Frasco)", via: "EV" },
  { nome: "Pantoprazol", dose: "40mg", via: "VO" },
  { nome: "Ondansetrona (Vonau)", dose: "4mg/2mL (amp 2mL)", via: "EV" },
  { nome: "Ondansetrona (Vonau)", dose: "8mg/4mL (amp 4mL)", via: "EV" },
  { nome: "Ondansetrona", dose: "8mg", via: "VO" },
  { nome: "Metoclopramida (Plasil)", dose: "10mg/2mL (amp 2mL)", via: "EV" },
  { nome: "Metoclopramida (Plasil)", dose: "10mg", via: "VO" },
  { nome: "Dimenidrinato + Piridoxina (Dramin B6)", dose: "1 ampola", via: "EV" },
  { nome: "Bromoprida", dose: "10mg/2mL", via: "EV" },

  // Soluções Hidroeletrolíticas e Reposições
  { nome: "Cloreto de Sódio 0,9% (Soro Fisiológico)", dose: "250mL", via: "EV" },
  { nome: "Cloreto de Sódio 0,9% (Soro Fisiológico)", dose: "500mL", via: "EV" },
  { nome: "Cloreto de Sódio 0,9% (Soro Fisiológico)", dose: "1000mL", via: "EV" },
  { nome: "Ringer Lactato", dose: "500mL", via: "EV" },
  { nome: "Ringer Lactato", dose: "1000mL", via: "EV" },
  { nome: "Soro Glicosado 5%", dose: "250mL", via: "EV" },
  { nome: "Soro Glicosado 5%", dose: "500mL", via: "EV" },
  { nome: "Soro Glicosado 10%", dose: "500mL", via: "EV" },
  { nome: "Glicose Hipertônica 50%", dose: "10mL (amp)", via: "EV" },
  { nome: "Glicose Hipertônica 50%", dose: "20mL (amp)", via: "EV" },
  { nome: "Cloreto de Sódio 3% (Salina Hipertônica)", dose: "250mL", via: "EV" },
  { nome: "Bicarbonato de Sódio 8,4%", dose: "250mL", via: "EV" },
  { nome: "Gluconato de Cálcio 10%", dose: "10mL (amp)", via: "EV" },
  { nome: "Cloreto de Potássio 19,1%", dose: "10mL (amp)", via: "EV" },
  { nome: "Sulfato de Magnésio 10%", dose: "10mL (amp)", via: "EV" },
  { nome: "Sulfato de Magnésio 50%", dose: "10mL (amp)", via: "EV" },
  { nome: "Albumina Humana 20%", dose: "50mL", via: "EV" },

  // Diuréticos e Controle Metabólico
  { nome: "Furosemida (Lasix)", dose: "20mg/2mL (amp 2mL)", via: "EV" },
  { nome: "Furosemida (Lasix)", dose: "40mg", via: "VO" },
  { nome: "Espironolactona (Aldactone)", dose: "25mg", via: "VO" },
  { nome: "Hidroclorotiazida", dose: "25mg", via: "VO" },
  { nome: "Manitol 20%", dose: "250mL", via: "EV" },
  { nome: "Insulina Regular Humana", dose: "Escala Móvel conforme HGT", via: "SC" },
  { nome: "Insulina Regular em Solução (BIC)", dose: "100 UI + SF 0,9% 100mL", via: "EV" },
  { nome: "Insulina NPH Humana", dose: "10 UI a 30 UI", via: "SC" },
  { nome: "Glucagon", dose: "1mg", via: "SC" }
];

const filePathPublic = path.resolve('public/assets/medicamentos.json');
const filePathDist = path.resolve('dist/assets/medicamentos.json');

const raw = fs.readFileSync(filePathPublic, 'utf-8');
const existing = JSON.parse(raw);

const map = new Map();
// Key by name + dose + via to prevent strict duplicates
for (const item of existing) {
  const key = `${item.nome.trim().toLowerCase()}|${item.dose.trim().toLowerCase()}|${item.via.trim().toLowerCase()}`;
  map.set(key, item);
}

for (const item of hospitalMedications) {
  const key = `${item.nome.trim().toLowerCase()}|${item.dose.trim().toLowerCase()}|${item.via.trim().toLowerCase()}`;
  if (!map.has(key)) {
    map.set(key, item);
  }
}

const merged = Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

console.log(`Total medications before: ${existing.length}, after: ${merged.length}`);

fs.writeFileSync(filePathPublic, JSON.stringify(merged, null, 2), 'utf-8');
if (fs.existsSync(filePathDist)) {
  fs.writeFileSync(filePathDist, JSON.stringify(merged, null, 2), 'utf-8');
}
console.log('Saved successfully to public and dist!');
