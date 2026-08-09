const fs = require('fs');
const path = 'src/tabs/kanban.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Dedicated Window style for the isolated column
content = content.replace(
  `      <div class="kanban-col" data-col="\${col.id}" style="background: rgba(\${rgb}, \${isSelected ? '0.1' : '0.04'}); border-radius:14px; display:flex; flex-direction:column; border:1.5px solid rgba(\${rgb}, \${isSelected ? '0.4' : '0.1'}); min-width: 280px; height: 100%; transition: all 0.3s ease;">`,
  `      <div class="kanban-col" data-col="\${col.id}" style="background: \${isSelected ? '#1e293b' : 'rgba('+rgb+', 0.04)'}; backdrop-filter: \${isSelected ? 'blur(16px)' : 'none'}; border-radius: \${isSelected ? '16px' : '14px'}; display:flex; flex-direction:column; border: \${isSelected ? '1px solid rgba(255,255,255,0.1)' : '1.5px solid rgba('+rgb+', 0.1)'}; box-shadow: \${isSelected ? '0 25px 50px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba('+rgb+',0.3)' : 'none'}; min-width: 280px; height: 100%; transition: all 0.3s ease;">`
);

content = content.replace(
  `        <div style="padding:14px; border-bottom:1px solid rgba(\${rgb}, 0.2); display:flex; justify-content:space-between; align-items:center; background: rgba(\${rgb}, 0.05); border-radius: 14px 14px 0 0;">`,
  `        <div style="padding:16px 20px; border-bottom:1px solid rgba(\${rgb}, 0.2); display:flex; justify-content:space-between; align-items:center; background: \${isSelected ? \`linear-gradient(90deg, rgba(\${rgb}, 0.15), rgba(\${rgb}, 0.05))\` : \`rgba(\${rgb}, 0.05)\`}; border-radius: \${isSelected ? '16px 16px 0 0' : '14px 14px 0 0'};">`
);

content = content.replace(
  `          <h3 style="margin:0; font-size: 0.95rem; font-weight:700; color:\${col.color}; display:flex; align-items:center; gap:8px;">`,
  `          <h3 style="margin:0; font-size: \${isSelected ? '1.1rem' : '0.95rem'}; font-weight:700; color:\${col.color}; display:flex; align-items:center; gap:8px;">`
);

// 2. Increase the size of Kanban patient cards
content = content.replace(
  `const diagHtml = hosp.diagnosis ? \`<div style="font-size:0.72rem;`,
  `const diagHtml = hosp.diagnosis ? \`<div style="font-size:0.85rem;`
);
content = content.replace(
  `const bedHtml = hosp.bed ? \`<div style="font-size:0.72rem;`,
  `const bedHtml = hosp.bed ? \`<div style="font-size:0.85rem;`
);
content = content.replace(
  `const drHtml = hosp.doctor_name ? \`<div style="font-size:0.72rem;`,
  `const drHtml = hosp.doctor_name ? \`<div style="font-size:0.85rem;`
);

content = content.replace(
  `style="background:var(--bg-card); border:1px solid var(--border-color); border-left:4px solid \${statusColor}; border-radius:10px; padding:14px; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); position:relative; transition: transform 0.2s ease, box-shadow 0.2s ease; display:flex; flex-direction:column; gap:12px;"`,
  `style="background:var(--bg-card); border:1px solid var(--border-color); border-left:4px solid \${statusColor}; border-radius:12px; padding:18px; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.2); position:relative; transition: transform 0.2s ease, box-shadow 0.2s ease; display:flex; flex-direction:column; gap:16px;"`
);

content = content.replace(
  `width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,\${col.color}44,\${col.color}88); display:flex; align-items:center; justify-content:center; font-size:0.75rem;`,
  `width:42px; height:42px; border-radius:50%; background:linear-gradient(135deg,\${col.color}44,\${col.color}88); display:flex; align-items:center; justify-content:center; font-size:0.95rem;`
);

content = content.replace(
  `<strong style="font-size:0.95rem;`,
  `<strong style="font-size:1.1rem;`
);

content = content.replace(
  `font-size:0.65rem; padding:3px 6px; border-radius:6px;`,
  `font-size:0.75rem; padding:4px 8px; border-radius:6px;`
);

content = content.replace(
  `<span style="font-size:0.7rem; color:var(--text-muted);"><i class="fa-regular fa-clock" style="margin-right:4px;"></i>Setor: <b style="color:var(--text-primary);">\${timeStr}</b></span>`,
  `<span style="font-size:0.82rem; color:var(--text-muted);"><i class="fa-regular fa-clock" style="margin-right:4px;"></i>Setor: <b style="color:var(--text-primary);">\${timeStr}</b></span>`
);

content = content.replace(
  `<span style="font-size:0.7rem; font-weight:700; color:\${statusColor};">\${statusText}</span>`,
  `<span style="font-size:0.82rem; font-weight:700; color:\${statusColor};">\${statusText}</span>`
);

content = content.replace(
  `padding:6px; font-size:0.75rem;`,
  `padding:8px; font-size:0.85rem;`
);
content = content.replace(
  `padding:6px; font-size:0.75rem;`,
  `padding:8px; font-size:0.85rem;`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Update script run successfully.');
