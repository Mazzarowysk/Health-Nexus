// src/modules/pacsViewer.js — Visualizador PACS / DICOM Interativo no PEP (Health Nexus v2.8.0)

export const MOCK_DICOM_STUDIES = [
  {
    id: 'DICOM-001',
    patientName: 'Marcelo Mazaro',
    modality: 'CR (Radiografia de Tórax PA)',
    date: '04/09/2026 02:45',
    organ: 'Tórax',
    findings: 'Murmúrio vesicular mantido. Sem consolidações parenquimatosas agudas. Área cardíaca no limite superior da normalidade.',
    svgType: 'chest'
  },
  {
    id: 'DICOM-002',
    patientName: 'Marcelo Mazaro',
    modality: 'CT (Angiotomografia de Artérias Coronárias)',
    date: '04/09/2026 02:50',
    organ: 'Coração / Coronárias',
    findings: 'Tronco de coronária esquerda sem estenose significativa. Artéria descendente anterior com placa fibrolipídica moderada sem oclusão aguda.',
    svgType: 'cardiac'
  },
  {
    id: 'DICOM-003',
    patientName: 'Marcelo Mazaro',
    modality: 'CR (Radiografia Abdominal em Pé)',
    date: '03/09/2026 18:20',
    organ: 'Abdome',
    findings: 'Distribuição habitual de gás de alça. Ausência de pneumoperitônio ou níveis hidroaéreos patológicos.',
    svgType: 'abdomen'
  }
];

export function openPACSViewerModal(patientName = 'Marcelo Mazaro', studyId = 'DICOM-001') {
  const existing = document.getElementById('pacs-viewer-modal');
  if (existing) existing.remove();

  let activeStudy = MOCK_DICOM_STUDIES.find(s => s.id === studyId) || MOCK_DICOM_STUDIES[0];
  let brightness = 100;
  let contrast = 100;
  let isInverted = false;
  let zoomLevel = 1;
  let activeTool = 'pan'; // pan | measure

  const modal = document.createElement('div');
  modal.id = 'pacs-viewer-modal';
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(3,5,15,0.92); backdrop-filter:blur(12px); z-index:100060; display:flex; align-items:center; justify-content:center;';

  modal.innerHTML = `
    <div style="width:94vw; height:92vh; background:#0b0f19; border:1.5px solid rgba(99,102,241,0.4); border-radius:18px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 25px 80px rgba(0,0,0,0.95); position:relative;">
      
      <!-- Cabeçalho PACS -->
      <div style="padding:14px 20px; background:linear-gradient(135deg, #0f172a, #1e1b4b); border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:38px; height:38px; border-radius:10px; background:rgba(99,102,241,0.25); border:1px solid rgba(99,102,241,0.4); display:flex; align-items:center; justify-content:center; color:#a5b4fc;">
            <i class="fa-solid fa-x-ray" style="font-size:1.2rem;"></i>
          </div>
          <div>
            <h3 style="font-family:Outfit, sans-serif; font-size:1.1rem; color:#fff; margin:0;">Visualizador PACS / DICOM Integrado</h3>
            <div style="font-size:0.78rem; color:#c4b5fd;">Paciente: <strong style="color:#fff;">${patientName}</strong> · Estudo: <span id="pacs-study-title" style="color:#38bdf8; font-weight:700;">${activeStudy.modality}</span></div>
          </div>
        </div>

        <!-- Botão Fechar -->
        <button onclick="document.getElementById('pacs-viewer-modal').remove()" style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2); color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Barra de Ferramentas DICOM -->
      <div style="padding:10px 20px; background:#111827; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        <button id="pacs-btn-zoom-in" class="btn btn-sm" style="background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.15);"><i class="fa-solid fa-magnifying-glass-plus"></i> Zoom +</button>
        <button id="pacs-btn-zoom-out" class="btn btn-sm" style="background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.15);"><i class="fa-solid fa-magnifying-glass-minus"></i> Zoom -</button>
        <button id="pacs-btn-invert" class="btn btn-sm" style="background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.15);"><i class="fa-solid fa-circle-half-stroke"></i> Inverter Cor</button>
        <button id="pacs-btn-measure" class="btn btn-sm" style="background:rgba(99,102,241,0.2); color:#a5b4fc; border:1px solid rgba(99,102,241,0.4);"><i class="fa-solid fa-ruler"></i> Régua de Medição</button>
        <button id="pacs-btn-reset" class="btn btn-sm" style="background:rgba(239,68,68,0.2); color:#fca5a5; border:1px solid rgba(239,68,68,0.4);"><i class="fa-solid fa-rotate-left"></i> Resetar Ajustes</button>
        
        <div style="display:flex; align-items:center; gap:8px; margin-left:auto; font-size:0.78rem; color:#94a3b8;">
          <span>Brilho:</span>
          <input type="range" id="pacs-brightness" min="30" max="200" value="100" style="width:90px;">
          <span>Contraste:</span>
          <input type="range" id="pacs-contrast" min="30" max="200" value="100" style="width:90px;">
        </div>
      </div>

      <!-- Área de Exibição DICOM (Grid Lateral + Canvas Central) -->
      <div style="flex:1; display:flex; overflow:hidden;">
        <!-- Lista de Exames DICOM -->
        <div style="width:260px; background:#0f172a; border-right:1px solid rgba(255,255,255,0.08); padding:14px; display:flex; flex-direction:column; gap:10px; overflow-y:auto;">
          <div style="font-size:0.75rem; font-weight:700; color:#818cf8; text-transform:uppercase; letter-spacing:.05em;">Séries do Paciente</div>
          ${MOCK_DICOM_STUDIES.map(s => `
            <div class="pacs-study-item" data-study-id="${s.id}" style="background:${s.id === activeStudy.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${s.id === activeStudy.id ? '#6366f1' : 'rgba(255,255,255,0.08)'}; border-radius:10px; padding:10px; cursor:pointer; transition:0.2s;">
              <div style="font-weight:700; font-size:0.82rem; color:#fff;">${s.modality}</div>
              <div style="font-size:0.74rem; color:#94a3b8; margin-top:3px;">📅 ${s.date}</div>
              <div style="font-size:0.72rem; color:#38bdf8; margin-top:3px;">Órgão: ${s.organ}</div>
            </div>
          `).join('')}
        </div>

        <!-- Tela Principal de Exibição da Imagem DICOM -->
        <div style="flex:1; background:#030712; display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden;">
          <div id="pacs-viewport" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; transition:transform 0.2s ease;">
            <svg id="pacs-svg-render" viewBox="0 0 500 500" style="max-width:85%; max-height:85%; filter: brightness(${brightness}%) contrast(${contrast}%) ${isInverted ? 'invert(1)' : ''}; transition:filter 0.1s;">
              <rect width="500" height="500" fill="#050714"/>
              
              <!-- Simulação da Estrutura Anatômica DICOM -->
              <g stroke="#ffffff" stroke-width="2" fill="none" opacity="0.85">
                <!-- Caixa Torácica / Pulmões -->
                <path d="M 150 150 C 120 220, 120 320, 180 380 C 220 380, 230 280, 220 180 Z" fill="rgba(255,255,255,0.08)"/>
                <path d="M 350 150 C 380 220, 380 320, 320 380 C 280 380, 270 280, 280 180 Z" fill="rgba(255,255,255,0.08)"/>
                <!-- Coluna Vertebral -->
                <line x1="250" y1="80" x2="250" y2="420" stroke="#a5b4fc" stroke-width="8" stroke-dasharray="10 4"/>
                <!-- Costelas -->
                <path d="M 250 140 Q 180 160 140 200" stroke="#e2e8f0" stroke-width="3"/>
                <path d="M 250 140 Q 320 160 360 200" stroke="#e2e8f0" stroke-width="3"/>
                <path d="M 250 180 Q 170 200 130 240" stroke="#e2e8f0" stroke-width="3"/>
                <path d="M 250 180 Q 330 200 370 240" stroke="#e2e8f0" stroke-width="3"/>
                <path d="M 250 220 Q 160 240 130 280" stroke="#e2e8f0" stroke-width="3"/>
                <path d="M 250 220 Q 340 240 370 280" stroke="#e2e8f0" stroke-width="3"/>
                <!-- Silhueta Cardíaca -->
                <ellipse cx="280" cy="290" rx="65" ry="50" fill="rgba(99,102,241,0.25)" stroke="#818cf8" stroke-width="3"/>
                <!-- Clavículas -->
                <path d="M 250 110 Q 170 100 120 120" stroke="#cbd5e1" stroke-width="4"/>
                <path d="M 250 110 Q 330 100 380 120" stroke="#cbd5e1" stroke-width="4"/>
              </g>

              <!-- Régua Virtual de Medição -->
              <g id="pacs-ruler-group" style="display:none;">
                <line x1="215" y1="290" x2="345" y2="290" stroke="#34d399" stroke-width="2" stroke-dasharray="4 2"/>
                <circle cx="215" cy="290" r="4" fill="#34d399"/>
                <circle cx="345" cy="290" r="4" fill="#34d399"/>
                <text x="240" y="280" fill="#34d399" font-size="14" font-family="monospace" font-weight="bold">Diâmetro Cardiaco: 130mm</text>
              </g>

              <!-- OSD DICOM Overlay (Informações do Canto) -->
              <text x="20" y="30" fill="#38bdf8" font-size="12" font-family="monospace">PAT: ${patientName.toUpperCase()}</text>
              <text x="20" y="48" fill="#94a3b8" font-size="11" font-family="monospace">${activeStudy.modality}</text>
              <text x="20" y="480" fill="#94a3b8" font-size="11" font-family="monospace">KV: 120 | mA: 250 | WW: 400 WL: 40</text>
              <text x="360" y="480" fill="#34d399" font-size="11" font-family="monospace">HEALTH NEXUS PACS</text>
            </svg>
          </div>
        </div>
      </div>

      <!-- Laudo Técnico do Exame (Rodapé) -->
      <div style="padding:14px 20px; background:#0f172a; border-top:1px solid rgba(255,255,255,0.1); font-size:0.84rem;">
        <strong style="color:#818cf8; display:block; margin-bottom:3px;"><i class="fa-solid fa-file-waveform"></i> Impression Diagnóstica / Achados Radiológicos:</strong>
        <div id="pacs-findings-text" style="color:#e2e8f0; line-height:1.4;">${activeStudy.findings}</div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Manipuladores de Eventos PACS
  const svgEl = document.getElementById('pacs-svg-render');
  const viewportEl = document.getElementById('pacs-viewport');
  const brightnessInput = document.getElementById('pacs-brightness');
  const contrastInput = document.getElementById('pacs-contrast');

  const updateFilters = () => {
    brightness = brightnessInput.value;
    contrast = contrastInput.value;
    svgEl.style.filter = `brightness(${brightness}%) contrast(${contrast}%) ${isInverted ? 'invert(1)' : ''}`;
  };

  brightnessInput.addEventListener('input', updateFilters);
  contrastInput.addEventListener('input', updateFilters);

  document.getElementById('pacs-btn-zoom-in').addEventListener('click', () => {
    zoomLevel += 0.2;
    viewportEl.style.transform = `scale(${zoomLevel})`;
  });

  document.getElementById('pacs-btn-zoom-out').addEventListener('click', () => {
    zoomLevel = Math.max(0.6, zoomLevel - 0.2);
    viewportEl.style.transform = `scale(${zoomLevel})`;
  });

  document.getElementById('pacs-btn-invert').addEventListener('click', () => {
    isInverted = !isInverted;
    updateFilters();
  });

  document.getElementById('pacs-btn-measure').addEventListener('click', () => {
    const rulerGroup = document.getElementById('pacs-ruler-group');
    if (rulerGroup) {
      const isHidden = rulerGroup.style.display === 'none';
      rulerGroup.style.display = isHidden ? 'block' : 'none';
    }
  });

  document.getElementById('pacs-btn-reset').addEventListener('click', () => {
    brightness = 100;
    contrast = 100;
    isInverted = false;
    zoomLevel = 1;
    brightnessInput.value = 100;
    contrastInput.value = 100;
    viewportEl.style.transform = 'scale(1)';
    updateFilters();
  });

  // Troca de Estudos na barra lateral
  modal.querySelectorAll('.pacs-study-item').forEach(item => {
    item.addEventListener('click', () => {
      const sId = item.dataset.studyId;
      activeStudy = MOCK_DICOM_STUDIES.find(s => s.id === sId) || activeStudy;
      document.getElementById('pacs-study-title').textContent = activeStudy.modality;
      document.getElementById('pacs-findings-text').textContent = activeStudy.findings;
      modal.querySelectorAll('.pacs-study-item').forEach(el => {
        el.style.background = 'rgba(255,255,255,0.03)';
        el.style.borderColor = 'rgba(255,255,255,0.08)';
      });
      item.style.background = 'rgba(99,102,241,0.2)';
      item.style.borderColor = '#6366f1';
    });
  });
}
