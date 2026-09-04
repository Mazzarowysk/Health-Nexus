import fs from 'fs';

let code = fs.readFileSync('src/main.js', 'utf8');

const searchMarker = 'searchResultsContainer.querySelectorAll(\'.search-result-item\')';
const labelsMarker = 'const tabLabels = {';

const startIdx = code.indexOf(searchMarker);
const endIdx = code.indexOf(labelsMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `searchResultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const itemType = item.dataset.type;
        if (itemType === 'ai_action') {
          const act = item.dataset.action;
          const tgt = item.dataset.target;
          if (act === 'openDoctorModal') {
            switchTab('medicos');
            setTimeout(() => { document.getElementById('btn-open-doctor-modal')?.click(); }, 350);
            if (typeof showManualReturnBeacon === 'function') {
              showManualReturnBeacon({ moduleId: 'medicos', moduleTitle: 'Corpo Clínico', btnName: 'Cadastrar / Incluir Novo Profissional', targetTab: 'medicos' });
            }
          } else if (act === 'openPatientModal') {
            switchTab('pacientes');
            setTimeout(() => { document.getElementById('btn-open-patient-modal')?.click(); }, 350);
            if (typeof showManualReturnBeacon === 'function') {
              showManualReturnBeacon({ moduleId: 'recepcao', moduleTitle: 'Recepção & Pacientes', btnName: '➕ Novo Paciente', targetTab: 'pacientes' });
            }
          } else if (act === 'switchTab') {
            switchTab(tgt);
            if (typeof showManualReturnBeacon === 'function') {
              showManualReturnBeacon({ moduleId: tgt, moduleTitle: tgt, btnName: 'Navegação por IA', targetTab: tgt });
            }
          } else if (act === 'openManual') {
            if (typeof showInteractiveManualModal === 'function') showInteractiveManualModal(tgt);
          }
        } else if (itemType === 'tab') {
          const tabId = item.dataset.tabId;
          switchTab(tabId);
          if (typeof showManualReturnBeacon === 'function') {
            showManualReturnBeacon({ moduleId: tabId, moduleTitle: tabId, btnName: \`Módulo: \${tabId}\`, targetTab: tabId });
          }
        } else if (itemType === 'btn') {
          const modId = item.dataset.modId;
          const btnName = decodeURIComponent(item.dataset.btnName || '');
          const mod = manualData.find(m => m.id === modId);
          const btn = mod ? mod.buttons.find(b => b.name === btnName) : null;
          if (btn && mod) {
            const navMap = {
              'geral': 'dashboard',
              'agenda': 'agenda',
              'recepcao': 'pacientes',
              'prontuario': 'atendimento',
              'tv': 'tv_panel',
              'estagnacao': 'estagnacao',
              'leitos': 'leitos',
              'kanban': 'kanban',
              'farmacia': 'farmacia',
              'financeiro': 'financeiro',
              'medicos': 'medicos',
              'consultorios': 'consultorios',
              'escalas': 'escalas',
              'relatorios': 'relatorios',
              'configuracoes': 'configuracoes'
            };
            if (navMap[modId]) switchTab(navMap[modId]);
            if (btnName.includes('Cadastrar / Incluir Novo Médico') || btnName.includes('Cadastrar / Incluir Novo Profissional')) {
              setTimeout(() => { document.getElementById('btn-open-doctor-modal')?.click(); }, 350);
            } else if (typeof showCardDetailModal === 'function') {
              showCardDetailModal(btn, mod);
            }

            if (typeof showManualReturnBeacon === 'function') {
              showManualReturnBeacon({
                moduleId: modId,
                moduleTitle: mod.title,
                btnName: btn.name,
                targetTab: navMap[modId] || 'dashboard'
              });
            }
          }
        } else if (itemType === 'patient') {
          switchTab('pacientes');
        } else if (itemType === 'faq') {
          const modId = item.dataset.modId;
          if (typeof showInteractiveManualModal === 'function') {
            showInteractiveManualModal(modId);
          }
        }

        searchResultsContainer.style.display = 'none';
        searchInput.value = '';
      });
    });
  };

  searchInput.addEventListener('input', performSearch);
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) performSearch();
  });

  // Fechar dropdown ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.global-search-wrapper')) {
      searchResultsContainer.style.display = 'none';
    }
  });

  // Tecla Atalho Ctrl + K ou Cmd + K para focar na busca
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  // Inicializar Card Flutuante Interativo de Guia de Fluxo (Smart Flow Guide HUD)
  if (typeof initFloatingWorkflowGuide === 'function') {
    initFloatingWorkflowGuide();
  }
}

// --- CONTROLE DE MUDANÇA DE ABA COM PERMISSÃO (RBAC) & NAVEGAÇÃO DE RETORNO ---
function switchTab(tabName, isBack = false) {
  const perms = getRolePermissions(state.user);
  if (!perms.allowedTabs.includes(tabName)) {
    showCustomAlert({
      title: 'Acesso Restrito',
      message: \`Seu perfil (<strong>\${perms.label}</strong>) não possui autorização para acessar esta funcionalidade.\`,
      type: 'warning'
    });
    return;
  }

  // Expor globalmente para módulos interativos
  window.switchTab = switchTab;
  window.showInteractiveManualModal = showInteractiveManualModal;

  // Registrar histórico de navegação global
  if (!isBack && state.activeTab && state.activeTab !== tabName) {
    if (!state.navHistory) state.navHistory = [];
    if (state.navHistory[state.navHistory.length - 1] !== state.activeTab) {
      state.navHistory.push(state.activeTab);
    }
  }

  state.activeTab = tabName;
  updateGlobalBackButton();

  // Atualizar Card Flutuante Guia de Fluxo
  if (typeof updateFloatingWorkflowGuide === 'function') {
    updateFloatingWorkflowGuide(tabName);
  }

  // Remover notificação de fluxo pendente para esta aba de destino se houver
  const existingFlowToast = document.querySelector(\`[data-flow-target-tab="\${tabName}"]\`);
  if (existingFlowToast) {
    existingFlowToast.style.transform = 'translateX(120%)';
    existingFlowToast.style.opacity = '0';
    setTimeout(() => existingFlowToast.remove(), 300);
  }

  // Mapa de nomes de exibição por aba
  `;

  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync('src/main.js', code, 'utf8');
  console.log('src/main.js successfully updated and verified!');
} else {
  console.error('Markers not found in src/main.js', { startIdx, endIdx });
}
