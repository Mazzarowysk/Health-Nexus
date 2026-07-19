// --- CONFIGURAÇÃO DA SPA E ROTAS ---
const API_URL = '/api';

// --- ESTADO GLOBAL E AUTENTICAÇÃO ---
let state = {
  activeTab: 'dashboard',
  isAuthenticated: !!sessionStorage.getItem('hn_token'),
  token: sessionStorage.getItem('hn_token') || null,
  user: JSON.parse(sessionStorage.getItem('hn_user')) || null,
  dashboardData: {
    activePatients: 0,
    occupancyRate: 0,
    averageWaitTimeMinutes: 0,
    dailyAppointmentsCount: 0,
    billingSummary: { totalRevenue: 0, pendingClaims: 0 }
  },
  loading: true
};

const initializeApp = () => {
  if (state.isAuthenticated) {
    renderAppStructure();
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }
  } else {
    renderAuthScreen();
  }
};

const logout = () => {
  sessionStorage.removeItem('hn_token');
  sessionStorage.removeItem('hn_user');
  state.isAuthenticated = false;
  state.token = null;
  state.user = null;
  initializeApp();
};

const apiFetch = async (url, options = {}) => {
  if (state.token) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = `Bearer ${state.token}`;
  }
  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    logout();
  }
  return res;
};

// --- NOTIFICAÇÃO TOAST ---
function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-left: 4px solid var(--color-primary);
    padding: 14px 20px;
    border-radius: var(--radius-md);
    font-family: 'Outfit', sans-serif;
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 250px;
    transform: translateX(100px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;
  toast.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--color-primary);"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  }, 10);

  setTimeout(() => {
    toast.style.transform = 'translateX(100px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// --- ESTRUTURA DE AUTENTICAÇÃO ---
function renderAuthScreen() {
  const root = document.getElementById('app');
  let isLogin = true;

  const renderForm = () => {
    root.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <img src="/assets/logo.png" alt="Health Nexus" class="auth-logo">
          <h2 class="auth-title">${isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}</h2>
          <p class="auth-subtitle">${isLogin ? 'Faça login para acessar o sistema' : 'Preencha os dados para se registrar'}</p>
          
          <form id="auth-form" class="auth-form">
            ${!isLogin ? `
              <div class="form-group" style="text-align: left;">
                <label class="form-label" for="auth-name">Nome Completo</label>
                <input type="text" id="auth-name" class="form-input" required placeholder="Dr. João Silva">
              </div>
            ` : ''}
            <div class="form-group" style="text-align: left;">
              <label class="form-label" for="auth-username">Usuário</label>
              <input type="text" id="auth-username" class="form-input" required placeholder="Digite seu usuário (ex: drjoao)">
            </div>
            <div class="form-group" style="text-align: left;">
              <label class="form-label" for="auth-password">Senha</label>
              <input type="password" id="auth-password" class="form-input" required placeholder="••••••••">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">
              ${isLogin ? 'Entrar' : 'Cadastrar'}
            </button>
          </form>

          <div class="auth-toggle">
            ${isLogin 
              ? 'Não tem uma conta? <a id="toggle-auth">Cadastre-se</a>' 
              : 'Já tem uma conta? <a id="toggle-auth">Faça login</a>'}
          </div>
          <div style="text-align: center; font-size: 0.65rem; color: var(--text-secondary); opacity: 0.6; margin-top: 12px;">
            <i class="fa-solid fa-laptop-code" style="margin-right: 4px;"></i> Desenvolvido por @mazzarowysk & @_coltri_<br>
            <span style="font-weight: bold; opacity: 0.8; margin-top: 4px; display: inline-block;">Versão 1.0.0 (BETA)</span>
          </div>
        </div>
      </div>
    `;

    document.getElementById('toggle-auth').addEventListener('click', () => {
      isLogin = !isLogin;
      renderForm();
    });

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('auth-username').value;
      const password = document.getElementById('auth-password').value;
      const name = !isLogin ? document.getElementById('auth-name').value : null;
      
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Aguarde...';
      submitBtn.disabled = true;

      try {
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const body = isLogin ? { username, password } : { name, username, password, role: 'Médico' };
        
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        const data = await res.json();
        
        if (res.ok) {
          if (isLogin) {
            sessionStorage.setItem('hn_token', data.token);
            sessionStorage.setItem('hn_user', JSON.stringify(data.user));
            state.isAuthenticated = true;
            state.token = data.token;
            state.user = data.user;
            showToast('Login realizado com sucesso!');
            initializeApp();
          } else {
            showToast('Cadastro realizado! Faça login agora.');
            isLogin = true;
            renderForm();
          }
        } else {
          alert(data.message || 'Erro na autenticação');
        }
      } catch (err) {
        alert('Erro ao comunicar com o servidor');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  };

  renderForm();
}

// --- ESTRUTURA GERAL DA INTERFACE (TEMPLATE) ---
function renderAppStructure() {
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="app-container">
      <!-- Sidebar de Navegação -->
      <aside class="app-sidebar">
        <div class="brand-logo">
          <img src="/assets/logo.png" alt="Health Nexus" class="brand-logo-img">
        </div>
        <nav>
          <ul class="nav-menu">
            <li>
              <a class="nav-item ${state.activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
                <i class="fa-solid fa-chart-line"></i>
                <span>Dashboard</span>
              </a>
            </li>
            <li>
              <a class="nav-item ${state.activeTab === 'pacientes' ? 'active' : ''}" data-tab="pacientes">
                <i class="fa-solid fa-user-injured"></i>
                <span>Pacientes</span>
              </a>
            </li>
            <li>
              <a class="nav-item ${state.activeTab === 'atendimento' ? 'active' : ''}" data-tab="atendimento">
                <i class="fa-solid fa-stethoscope"></i>
                <span>Atendimentos</span>
              </a>
            </li>
            <li>
              <a class="nav-item ${state.activeTab === 'relatorios' ? 'active' : ''}" data-tab="relatorios">
                <i class="fa-solid fa-file-contract"></i>
                <span>Relatórios</span>
              </a>
            </li>
            <li>
              <a class="nav-item ${state.activeTab === 'configuracoes' ? 'active' : ''}" data-tab="configuracoes">
                <i class="fa-solid fa-gear"></i>
                <span>Configurações</span>
              </a>
            </li>
          </ul>
        </nav>
        <div style="margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 16px;">
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">
            Logado como: <br><strong style="color: var(--text-primary);">${state.user ? state.user.name : ''}</strong>
          </div>
          <button id="btn-logout" class="btn" style="width: 100%; background: var(--bg-tertiary); color: var(--color-danger); border: 1px solid var(--border-color); margin-bottom: 12px;">
            <i class="fa-solid fa-arrow-right-from-bracket"></i> Sair
          </button>
          <div style="text-align: center; font-size: 0.65rem; color: var(--text-secondary); opacity: 0.6;">
            <i class="fa-solid fa-code" style="margin-right: 4px;"></i> Desenvolvido por @mazzarowysk & @_coltri_
          </div>
        </div>
      </aside>

      <!-- Cabeçalho Superior -->
      <header class="app-header">
        <h1 class="page-title" id="page-title-label">Dashboard</h1>
        <div class="header-brand-text">
          <i class="fa-solid fa-circle-nodes"></i>
          <span>Sistema de Gestão Hospitalar Health Nexus</span>
        </div>
      </header>

      <!-- Área de Conteúdo Principal -->
      <main class="app-content" id="main-content">
        <!-- O conteúdo específico da aba ativa será injetado aqui -->
      </main>
    </div>

    <!-- PEP Modal (Prontuário) -->
    <div id="pep-modal" class="pep-modal">
      <div class="pep-content">
        <div class="pep-header">
          <div class="pep-title">
            <i class="fa-solid fa-file-medical"></i>
            Prontuário Eletrônico do Paciente
          </div>
          <div class="pep-header-info">
            <span id="pep-patient-name"><i class="fa-solid fa-user"></i> -</span>
            <span id="pep-encounter-status"><i class="fa-solid fa-clock"></i> -</span>
          </div>
        </div>
        <div class="pep-body">
          <div class="pep-sidebar">
            <div class="pep-section" style="margin-bottom: 20px;">
              <label>Cor de Risco (Triagem)</label>
              <div id="pep-manchester-badge" style="font-weight:bold; font-size: 1.1rem;">-</div>
            </div>
            <div class="pep-section" style="margin-bottom: 20px;">
              <label>Sinais Vitais</label>
              <div style="font-size: 0.85rem; color: var(--text-primary);">
                <p><strong>PA:</strong> <span id="pep-bp">-</span> mmHg</p>
                <p><strong>FC:</strong> <span id="pep-hr">-</span> bpm</p>
                <p><strong>Temp:</strong> <span id="pep-temp">-</span> °C</p>
                <p><strong>Peso:</strong> <span id="pep-weight">-</span> kg</p>
              </div>
            </div>
            <div class="pep-section">
              <label>Queixa Principal (Triagem)</label>
              <p id="pep-complaints" style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.4;">-</p>
            </div>
          </div>
          <div class="pep-main">
            <div class="pep-section">
              <label for="pep-subjective">S - Subjetivo (Anamnese)</label>
              <textarea id="pep-subjective" class="pep-textarea" placeholder="Relato do paciente, histórico da moléstia atual..."></textarea>
            </div>
            <div class="pep-section">
              <label for="pep-objective">O - Objetivo (Exame Físico)</label>
              <textarea id="pep-objective" class="pep-textarea" placeholder="Achados do exame físico, resultados de exames..."></textarea>
            </div>
            <div class="pep-section autocomplete-container">
              <label for="pep-assessment">A - Avaliação (Diagnóstico / CID-10)</label>
              <input type="text" id="pep-assessment" class="form-input" style="width: 100%;" placeholder="Digite para buscar o CID-10..." autocomplete="off">
              <div id="pep-cid-dropdown" class="autocomplete-dropdown"></div>
            </div>
            <div class="pep-section" style="flex: 1;">
              <label for="pep-plan">P - Plano (Prescrição / Conduta)</label>
              <textarea id="pep-plan" class="pep-textarea" style="flex: 1;" placeholder="Conduta terapêutica, prescrição médica, orientações..."></textarea>
            </div>
          </div>
        </div>
        <div class="pep-footer">
          <span id="pep-status-badge"></span>
          <button class="btn btn-secondary" onclick="closePEPModal()">
            <i class="fa-solid fa-xmark"></i> Fechar
          </button>
          <button class="btn btn-secondary" id="btn-save-draft" onclick="savePEPDraft()">
            <i class="fa-solid fa-save"></i> Salvar Rascunho
          </button>
          <button class="btn btn-primary" id="btn-sign-pep" onclick="openSignModal()">
            <i class="fa-solid fa-file-signature"></i> Assinar e Finalizar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Assinatura -->
    <div id="sign-modal" class="modal-overlay" style="z-index: 3000;">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3>Assinatura Eletrônica</h3>
          <button class="btn-close" onclick="closeSignModal()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 16px;">
            Ao assinar este prontuário, ele será bloqueado para edições futuras. Confirme sua identidade para prosseguir.
          </p>
          <div class="form-group">
            <label for="sign-password">Senha do Profissional</label>
            <input type="password" id="sign-password" class="form-input" placeholder="Digite sua senha (admin123)">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeSignModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="confirmSignPEP()">Confirmar Assinatura</button>
        </div>
      </div>
    </div>
  `;

  // Registrar eventos de clique na navegação
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Renderizar o conteúdo da aba ativa
  renderTabContent();
}

// --- CONTROLE DE MUDANÇA DE ABA ---
function switchTab(tabName) {
  state.activeTab = tabName;
  
  // Atualiza classes ativas na barra lateral
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-tab') === tabName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Atualiza o título do cabeçalho
  const pageTitle = document.getElementById('page-title-label');
  pageTitle.textContent = tabName.charAt(0).toUpperCase() + tabName.slice(1);

  // Re-renderiza a área de conteúdo
  renderTabContent();
}

// --- CONTEÚDO DAS ABAS ---
async function renderTabContent() {
  const contentArea = document.getElementById('main-content');
  
  if (state.activeTab === 'dashboard') {
    if (state.loading) {
      contentArea.innerHTML = `
        <div class="skeleton-content" style="padding: 0;">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>
      `;
      await fetchDashboardData();
    }
    
    const data = state.dashboardData;
    contentArea.innerHTML = `
      <div class="tab-section active">
        <!-- KPI Cards Grid -->
        <div class="kpi-grid">
          <!-- Card Ocupação -->
          <div class="kpi-card">
            <div class="kpi-header">
              <span>Pacientes Ativos</span>
              <div class="kpi-icon primary"><i class="fa-solid fa-bed"></i></div>
            </div>
            <div class="kpi-value" id="kpi-active-patients">${data.activePatients}</div>
            <div class="kpi-trend trend-up">
              <i class="fa-solid fa-arrow-trend-up"></i>
              <span>Pacientes no Turso DB</span>
            </div>
          </div>

          <!-- Card Atendimentos -->
          <div class="kpi-card">
            <div class="kpi-header">
              <span>Tempo de Espera Triagem</span>
              <div class="kpi-icon warning"><i class="fa-solid fa-clock"></i></div>
            </div>
            <div class="kpi-value">${data.averageWaitTimeMinutes} min</div>
            <div class="kpi-trend trend-down">
              <i class="fa-solid fa-arrow-trend-down"></i>
              <span>-3 min vs ontem</span>
            </div>
          </div>

          <!-- Card Faturamento -->
          <div class="kpi-card">
            <div class="kpi-header">
              <span>Receita do Mês (Particulares)</span>
              <div class="kpi-icon accent"><i class="fa-solid fa-hand-holding-dollar"></i></div>
            </div>
            <div class="kpi-value">R$ ${data.billingSummary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div class="kpi-trend trend-up">
              <i class="fa-solid fa-arrow-trend-up"></i>
              <span>+12% vs mês anterior</span>
            </div>
          </div>
        </div>

        <!-- Seção de Gráficos Interativos -->
        <div class="charts-grid">
          <div class="chart-card">
            <h4 class="chart-card-title">
              <i class="fa-solid fa-chart-pie" style="color: var(--color-primary);"></i> Ocupação de Leitos por Ala
            </h4>
            <div class="chart-container">
              <canvas id="occupancyChart"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <h4 class="chart-card-title">
              <i class="fa-solid fa-chart-line" style="color: var(--color-accent);"></i> Histórico de Atendimentos Mensais
            </h4>
            <div class="chart-container">
              <canvas id="appointmentsChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    // Inicialização dos gráficos com pequeno delay para garantir montagem do canvas
    setTimeout(() => {
      initDashboardCharts(data);
    }, 50);

  } else if (state.activeTab === 'pacientes') {
    contentArea.innerHTML = `
      <div class="tab-section active">
        <div class="patients-grid">
          <!-- Coluna 1: Formulário Completo com Máscaras -->
          <div class="patients-form-container">
            <h3 id="form-title" style="margin-bottom: 20px; font-family: 'Outfit'; font-weight: 600;">Admissão de Paciente</h3>
            <form id="patient-form">
              <input type="hidden" id="editId">
              
              <div class="form-group">
                <label class="form-label" for="fullName">* Nome Completo:</label>
                <input type="text" id="fullName" class="form-input" required placeholder="Nome completo civil">
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="cpf">* CPF:</label>
                  <input type="text" id="cpf" class="form-input" required placeholder="000.000.000-00" inputmode="numeric">
                </div>
                <div class="form-group">
                  <label class="form-label" for="birthDate">* Data Nasc.:</label>
                  <input type="date" id="birthDate" class="form-input" required>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="address">Endereço:</label>
                  <input type="text" id="address" class="form-input" placeholder="Av. Paulista, 1000">
                </div>
                <div class="form-group">
                  <label class="form-label" for="city">Cidade:</label>
                  <input type="text" id="city" class="form-input" placeholder="Ex: Campinas">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="phone">Telefone Fixo:</label>
                  <input type="text" id="phone" class="form-input" placeholder="(18) 3528-5022">
                </div>
                <div class="form-group">
                  <label class="form-label" for="cellphone">Celular:</label>
                  <input type="text" id="cellphone" class="form-input" placeholder="(18) 98817-5809">
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="billingValue">Valor da Consulta/Mensalidade:</label>
                <input type="text" id="billingValue" class="form-input" placeholder="R$ 0,00">
              </div>

              <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button type="submit" id="submit-btn" class="btn btn-primary" style="flex: 1;">Registrar Paciente</button>
                <button type="button" id="cancel-edit-btn" class="btn" style="display: none; background-color: var(--bg-tertiary); color: var(--text-primary);">Cancelar</button>
              </div>
            </form>
          </div>

          <!-- Coluna 2: Lista com Busca Inteligente -->
          <div class="patients-list-container">
            <h3 style="margin-bottom: 16px; font-family: 'Outfit'; font-weight: 600;">Pacientes Cadastrados</h3>
            
            <div class="search-container">
              <div class="search-wrapper">
                <i class="fa-solid fa-magnifying-glass search-icon"></i>
                <input type="text" id="search-input" class="search-input" placeholder="Buscar paciente por nome, CPF, cidade ou ID (ignora caixa e acentos)...">
              </div>
            </div>

            <div id="patients-table-wrapper" style="overflow-x: auto;">
              <div style="text-align: center; color: var(--text-secondary); padding: 40px;">Carregando registros...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Aplicar máscaras de input
    applyInputMasks();

    let allPatients = [];

    const renderTableRows = (patientsToRender) => {
      const wrapper = document.getElementById('patients-table-wrapper');
      
      if (patientsToRender.length === 0) {
        wrapper.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 40px;">Nenhum paciente encontrado.</div>`;
        return;
      }

      let tableHtml = `
        <table class="patients-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome Completo</th>
              <th>CPF</th>
              <th>Data Nasc.</th>
              <th>Cidade</th>
              <th>Telefones</th>
              <th>Valor</th>
              <th style="text-align: right;">Ações</th>
            </tr>
          </thead>
          <tbody>
      `;

      patientsToRender.forEach(p => {
        let formattedDate = p.birthDate;
        if (p.birthDate && p.birthDate.includes('-')) {
          const [y, m, d] = p.birthDate.split('-');
          formattedDate = `${d}/${m}/${y}`;
        }
        
        // Combina telefone e celular de forma limpa
        const phones = [p.phone, p.cellphone].filter(Boolean).join(' / ');
        
        tableHtml += `
          <tr>
            <td style="font-family: monospace; font-weight: 600; color: var(--color-primary);">${p.id}</td>
            <td style="font-weight: 500;">${p.fullName}</td>
            <td style="font-family: monospace; font-size: 0.9rem;">${p.cpf}</td>
            <td>${formattedDate}</td>
            <td>${p.city || '-'}</td>
            <td style="font-size: 0.85rem; color: var(--text-secondary);">${phones || '-'}</td>
            <td style="font-family: monospace; font-weight: 500;">${p.billingValue || 'R$ 0,00'}</td>
            <td>
              <div class="actions-cell">
                <button class="btn-icon btn-icon-edit" 
                  data-edit-id="${p.id}" 
                  data-full-name="${p.fullName}" 
                  data-cpf="${p.cpf}" 
                  data-birth-date="${p.birthDate}"
                  data-address="${p.address || ''}"
                  data-city="${p.city || ''}"
                  data-phone="${p.phone || ''}"
                  data-cellphone="${p.cellphone || ''}"
                  data-billing-value="${p.billingValue || ''}"
                  title="Editar">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-icon btn-icon-delete" data-delete-id="${p.id}" title="Excluir">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      tableHtml += `</tbody></table>`;
      wrapper.innerHTML = tableHtml;

      // Registrar eventos dos botões na tabela
      document.querySelectorAll('.btn-icon-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('editId').value = btn.getAttribute('data-edit-id');
          document.getElementById('fullName').value = btn.getAttribute('data-full-name');
          document.getElementById('cpf').value = btn.getAttribute('data-cpf');
          document.getElementById('birthDate').value = btn.getAttribute('data-birth-date');
          document.getElementById('address').value = btn.getAttribute('data-address');
          document.getElementById('city').value = btn.getAttribute('data-city');
          document.getElementById('phone').value = btn.getAttribute('data-phone');
          document.getElementById('cellphone').value = btn.getAttribute('data-cellphone');
          document.getElementById('billingValue').value = btn.getAttribute('data-billing-value');

          document.getElementById('form-title').textContent = "Editar Paciente";
          document.getElementById('submit-btn').textContent = "Salvar Alterações";
          document.getElementById('cancel-edit-btn').style.display = "inline-flex";
        });
      });

      document.querySelectorAll('.btn-icon-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-delete-id');
          if (confirm('Tem certeza de que deseja excluir este paciente?')) {
            try {
              const deleteRes = await apiFetch(`${API_URL}/patients/${id}`, { method: 'DELETE' });
              if (deleteRes.ok) {
                loadAndRenderTable();
                if (document.getElementById('editId').value === id) {
                  resetForm();
                }
                state.loading = true;
              } else {
                alert('Erro ao excluir paciente.');
              }
            } catch (err) {
              alert('Erro ao conectar-se à API.');
            }
          }
        });
      });
    };

    const loadAndRenderTable = async () => {
      try {
        const res = await apiFetch(`${API_URL}/patients`);
        if (!res.ok) throw new Error();
        allPatients = await res.json();
        renderTableRows(allPatients);
      } catch (err) {
        document.getElementById('patients-table-wrapper').innerHTML = 
          `<div style="text-align: center; color: var(--text-secondary); padding: 40px;">Erro ao carregar dados do banco de dados.</div>`;
      }
    };

    const resetForm = () => {
      document.getElementById('patient-form').reset();
      document.getElementById('editId').value = "";
      document.getElementById('form-title').textContent = "Admissão de Paciente";
      document.getElementById('submit-btn').textContent = "Registrar Paciente";
      document.getElementById('cancel-edit-btn').style.display = "none";
    };

    // Registrar cancelamento
    document.getElementById('cancel-edit-btn').addEventListener('click', resetForm);

    // Registrar busca inteligente (Sem acentos / Sensível a caixa)
    document.getElementById('search-input').addEventListener('input', (e) => {
      const query = removeAccents(e.target.value.trim());
      const filtered = allPatients.filter(p => {
        return removeAccents(p.fullName).includes(query) ||
               removeAccents(p.cpf).includes(query) ||
               removeAccents(p.city || '').includes(query) ||
               removeAccents(p.id).includes(query);
      });
      renderTableRows(filtered);
    });

    // Enviar formulário CRUD
    document.getElementById('patient-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('editId').value;
      const fullName = document.getElementById('fullName').value;
      const cpf = document.getElementById('cpf').value;
      const birthDate = document.getElementById('birthDate').value;
      const address = document.getElementById('address').value;
      const city = document.getElementById('city').value;
      const phone = document.getElementById('phone').value;
      const cellphone = document.getElementById('cellphone').value;
      const billingValue = document.getElementById('billingValue').value;

      const isEdit = !!editId;
      const url = isEdit ? `${API_URL}/patients/${editId}` : `${API_URL}/patients`;
      const method = isEdit ? 'PUT' : 'POST';

      try {
        const res = await apiFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, cpf, birthDate, address, city, phone, cellphone, billingValue })
        });
        const data = await res.json();
        if (res.ok) {
          resetForm();
          loadAndRenderTable();
          state.loading = true;
        } else {
          alert(`Erro: ${data.message || 'Falha ao salvar paciente.'}`);
        }
      } catch (err) {
        alert('Erro ao conectar-se à API.');
      }
    });

    // Carregar tabela inicialmente
    loadAndRenderTable();

  } else if (state.activeTab === 'atendimento') {
    contentArea.innerHTML = `
      <div class="tab-section active">
        <div class="atendimentos-grid">
          <!-- Coluna 1: Admissão -->
          <div class="atendimentos-panel">
            <h3 class="panel-title"><i class="fa-solid fa-hospital-user" style="color: var(--color-primary);"></i> Admissão</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Selecione um paciente cadastrado:</p>
            
            <div class="search-container" style="margin-bottom: 12px;">
              <div class="search-wrapper">
                <i class="fa-solid fa-magnifying-glass search-icon"></i>
                <input type="text" id="adm-search-input" class="search-input" placeholder="Buscar por nome ou CPF...">
              </div>
            </div>
            
            <div id="adm-patient-list" class="patient-select-list">
              <div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.85rem;">Carregando pacientes...</div>
            </div>
            
            <div id="adm-actions-container" style="display: none; margin-top: 15px; display: flex; flex-direction: column; gap: 10px;">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">Paciente Selecionado:</span>
              <div id="selected-patient-preview" style="background-color: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); font-weight: 500; font-size: 0.9rem;"></div>
              
              <input type="hidden" id="selected-patient-id">
              
              <div style="display: flex; gap: 10px; margin-top: 5px;">
                <button id="btn-admit-urgencia" class="btn btn-primary" style="flex: 1; font-size: 0.85rem; padding: 10px 8px;">
                  <i class="fa-solid fa-truck-medical"></i> Urgência (PS)
                </button>
                <button id="btn-admit-ambulatorio" class="btn" style="flex: 1; font-size: 0.85rem; padding: 10px 8px; background-color: var(--bg-tertiary); border-color: var(--border-color); color: var(--text-primary);">
                  <i class="fa-solid fa-user-doctor"></i> Ambulatório
                </button>
              </div>
            </div>
          </div>
          
          <!-- Coluna 2: Fila de Triagem -->
          <div class="atendimentos-panel">
            <h3 class="panel-title"><i class="fa-solid fa-stethoscope" style="color: var(--color-warning);"></i> Fila de Triagem</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Aguardando classificação de risco:</p>
            <div id="triage-queue" class="queue-list">
              <div style="text-align: center; color: var(--text-muted); padding: 40px; font-size: 0.85rem;">Fila vazia.</div>
            </div>
          </div>
          
          <!-- Coluna 3: Fila de Consulta Médica -->
          <div class="atendimentos-panel">
            <h3 class="panel-title"><i class="fa-solid fa-user-md" style="color: var(--color-accent);"></i> Fila de Consulta Médica</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Prioridade clínica (Manchester):</p>
            <div id="medical-queue" class="queue-list">
              <div style="text-align: center; color: var(--text-muted); padding: 40px; font-size: 0.85rem;">Fila vazia.</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Modal de Triagem -->
      <div id="triage-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Realizar Triagem Manchester</h3>
            <button type="button" class="modal-close" id="close-triage-modal"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            <form id="triage-form">
              <input type="hidden" id="triage-encounter-id">
              
              <div style="background-color: rgba(0, 100, 255, 0.08); padding: 12px; border-radius: var(--radius-md); border: 1px solid rgba(0, 100, 255, 0.15); margin-bottom: 20px;">
                <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 2px;">Paciente:</span>
                <strong id="triage-patient-name" style="font-size: 1.05rem; color: var(--text-primary);">Maria de Souza</strong>
              </div>
              
              <!-- Sinais Vitais -->
              <h4 style="font-family: 'Outfit'; font-weight: 600; font-size: 0.95rem; margin-bottom: 12px; color: var(--text-primary); border-left: 3px solid var(--color-primary); padding-left: 8px;">Sinais Vitais</h4>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="triage-pa">* Pressão Arterial (mmHg):</label>
                  <input type="text" id="triage-pa" class="form-input" required placeholder="Ex: 120/80">
                </div>
                <div class="form-group">
                  <label class="form-label" for="triage-temp">* Temp. Corporal (°C):</label>
                  <input type="number" id="triage-temp" class="form-input" required step="0.1" min="30" max="45" placeholder="Ex: 36.8">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="triage-fc">Freq. Cardíaca (bpm):</label>
                  <input type="number" id="triage-fc" class="form-input" min="30" max="220" placeholder="Ex: 80">
                </div>
                <div class="form-group">
                  <label class="form-label" for="triage-peso">Peso Corporal (kg):</label>
                  <input type="number" id="triage-peso" class="form-input" step="0.1" placeholder="Ex: 75.0">
                </div>
              </div>
              
              <!-- Manchester Classificação -->
              <h4 style="font-family: 'Outfit'; font-weight: 600; font-size: 0.95rem; margin-top: 10px; margin-bottom: 12px; color: var(--text-primary); border-left: 3px solid var(--color-primary); padding-left: 8px;">* Classificação Manchester (Prioridade)</h4>
              
              <div class="manchester-selector">
                <div class="manchester-option vermelho">
                  <input type="radio" id="color-vermelho" name="manchesterColor" value="Vermelho" required>
                  <label for="color-vermelho" class="manchester-label">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>Emergência</span>
                  </label>
                </div>
                <div class="manchester-option laranja">
                  <input type="radio" id="color-laranja" name="manchesterColor" value="Laranja">
                  <label for="color-laranja" class="manchester-label">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <span>Muito Urgente</span>
                  </label>
                </div>
                <div class="manchester-option amarelo">
                  <input type="radio" id="color-amarelo" name="manchesterColor" value="Amarelo">
                  <label for="color-amarelo" class="manchester-label">
                    <i class="fa-solid fa-circle-info"></i>
                    <span>Urgente</span>
                  </label>
                </div>
                <div class="manchester-option verde">
                  <input type="radio" id="color-verde" name="manchesterColor" value="Verde">
                  <label for="color-verde" class="manchester-label">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>Pouco Urgente</span>
                  </label>
                </div>
                <div class="manchester-option azul">
                  <input type="radio" id="color-azul" name="manchesterColor" value="Azul">
                  <label for="color-azul" class="manchester-label">
                    <i class="fa-solid fa-circle"></i>
                    <span>Não Urgente</span>
                  </label>
                </div>
              </div>
              
              <!-- Queixa Principal -->
              <div class="form-group" style="margin-top: 20px;">
                <label class="form-label" for="triage-complaints">* Queixa Principal / Sintomatologia:</label>
                <textarea id="triage-complaints" class="form-input" required rows="3" placeholder="Paciente relata dor torácica..."></textarea>
              </div>
              
              <div style="display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end;">
                <button type="button" id="btn-cancel-triage" class="btn" style="background-color: var(--bg-tertiary); color: var(--text-primary); border-color: var(--border-color);">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar Classificação</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    let admissionPatients = [];
    let selectedPatient = null;

    const triagePaInput = document.getElementById('triage-pa');
    if (triagePaInput) {
      triagePaInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 6) val = val.substring(0, 6);
        if (val.length <= 3) {
          e.target.value = val;
        } else {
          e.target.value = `${val.slice(0, 3)}/${val.slice(3)}`;
        }
      });
    }

    const loadPatientsForAdmission = async () => {
      try {
        const res = await apiFetch(`${API_URL}/patients`);
        if (!res.ok) throw new Error();
        admissionPatients = await res.json();
        renderAdmissionPatientList(admissionPatients);
      } catch (err) {
        document.getElementById('adm-patient-list').innerHTML = 
          `<div style="text-align: center; color: var(--text-secondary); padding: 20px; font-size: 0.85rem;">Erro ao carregar lista de pacientes.</div>`;
      }
    };

    const renderAdmissionPatientList = (patientsToRender) => {
      const listContainer = document.getElementById('adm-patient-list');
      if (patientsToRender.length === 0) {
        listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.85rem;">Nenhum paciente encontrado.</div>`;
        return;
      }

      listContainer.innerHTML = '';
      patientsToRender.forEach(p => {
        const item = document.createElement('div');
        item.className = 'patient-select-item';
        if (selectedPatient && selectedPatient.id === p.id) {
          item.classList.add('selected');
        }
        item.innerHTML = `
          <div class="patient-select-name">${p.fullName}</div>
          <div class="patient-select-meta">CPF: ${p.cpf} | Cidade: ${p.city || '-'}</div>
        `;
        item.addEventListener('click', () => {
          document.querySelectorAll('.patient-select-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          selectPatientForAdmission(p);
        });
        listContainer.appendChild(item);
      });
    };

    const selectPatientForAdmission = (p) => {
      selectedPatient = p;
      const preview = document.getElementById('selected-patient-preview');
      const actionsContainer = document.getElementById('adm-actions-container');
      const selectedIdInput = document.getElementById('selected-patient-id');
      
      selectedIdInput.value = p.id;
      preview.innerHTML = `
        <div style="font-weight:600; color: var(--color-primary);">${p.fullName}</div>
        <div style="font-size:0.75rem; color: var(--text-secondary); margin-top:4px;">CPF: ${p.cpf}</div>
      `;
      actionsContainer.style.display = 'flex';
    };

    document.getElementById('adm-search-input').addEventListener('input', (e) => {
      const query = removeAccents(e.target.value.trim());
      const filtered = admissionPatients.filter(p => {
        return removeAccents(p.fullName).includes(query) ||
               removeAccents(p.cpf).includes(query);
      });
      renderAdmissionPatientList(filtered);
    });

    const createEncounter = async (type) => {
      const patientId = document.getElementById('selected-patient-id').value;
      if (!patientId) return;

      try {
        const res = await apiFetch(`${API_URL}/encounters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, type })
        });
        const data = await res.json();
        if (res.ok) {
          selectedPatient = null;
          document.getElementById('adm-search-input').value = '';
          document.getElementById('adm-actions-container').style.display = 'none';
          loadPatientsForAdmission();
          loadAndRenderQueue();
          showToast(`Atendimento de ${type} aberto com sucesso!`);
        } else {
          alert(`Erro: ${data.message || 'Falha ao abrir atendimento.'}`);
        }
      } catch (err) {
        alert('Erro ao conectar-se à API.');
      }
    };

    document.getElementById('btn-admit-urgencia').addEventListener('click', () => createEncounter('Urgencia'));
    document.getElementById('btn-admit-ambulatorio').addEventListener('click', () => createEncounter('Ambulatorial'));

    const closeTriageModal = () => {
      document.getElementById('triage-modal').style.display = 'none';
      document.getElementById('triage-form').reset();
    };
    document.getElementById('close-triage-modal').addEventListener('click', closeTriageModal);
    document.getElementById('btn-cancel-triage').addEventListener('click', closeTriageModal);

    document.getElementById('triage-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const encounterId = document.getElementById('triage-encounter-id').value;
      const manchesterColor = document.querySelector('input[name="manchesterColor"]:checked').value;
      const bloodPressure = document.getElementById('triage-pa').value;
      const temperatureCelsius = document.getElementById('triage-temp').value;
      const heartRateBpm = document.getElementById('triage-fc').value;
      const weightKg = document.getElementById('triage-peso').value;
      const complaints = document.getElementById('triage-complaints').value;

      try {
        const res = await apiFetch(`${API_URL}/encounters/${encounterId}/triage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manchesterColor, weightKg, bloodPressure, temperatureCelsius, heartRateBpm, complaints })
        });
        
        if (res.ok) {
          closeTriageModal();
          loadAndRenderQueue();
          showToast('Triagem Manchester salva e paciente enviado à fila médica!');
        } else {
          const data = await res.json();
          alert(`Erro: ${data.message || 'Falha ao salvar triagem.'}`);
        }
      } catch (err) {
        alert('Erro ao conectar-se à API.');
      }
    });

    const loadAndRenderQueue = async () => {
      try {
        const res = await apiFetch(`${API_URL}/encounters`);
        if (!res.ok) throw new Error();
        const encounters = await res.json();
        renderQueues(encounters);
      } catch (err) {
        document.getElementById('triage-queue').innerHTML = 
          `<div style="text-align: center; color: var(--text-secondary); padding: 20px; font-size: 0.85rem;">Erro ao carregar fila.</div>`;
        document.getElementById('medical-queue').innerHTML = 
          `<div style="text-align: center; color: var(--text-secondary); padding: 20px; font-size: 0.85rem;">Erro ao carregar fila.</div>`;
      }
    };

    const renderQueues = (encounters) => {
      const triageQueueContainer = document.getElementById('triage-queue');
      const medicalQueueContainer = document.getElementById('medical-queue');

      const triageEncounters = encounters.filter(e => e.status === 'Aguardando_Triagem');
      const medicalEncounters = encounters.filter(e => e.status === 'Aguardando_Atendimento' || e.status === 'Em_Atendimento');

      if (triageEncounters.length === 0) {
        triageQueueContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px; font-size: 0.85rem;">Nenhum paciente aguardando triagem.</div>`;
      } else {
        triageQueueContainer.innerHTML = '';
        triageEncounters.forEach(e => {
          const waitTimeText = getWaitTimeText(e.admitted_at);
          const card = document.createElement('div');
          card.className = 'queue-card';
          card.innerHTML = `
            <div class="queue-card-header">
              <span class="queue-patient-name">${e.patientName}</span>
              <span class="queue-time"><i class="fa-solid fa-clock"></i> ${waitTimeText}</span>
            </div>
            <div class="queue-card-body">
              <div>Tipo: <strong>${e.type === 'Urgencia' ? 'Urgência' : 'Ambulatório'}</strong></div>
              <div style="font-size: 0.75rem; margin-top: 4px; color: var(--text-muted);">CPF: ${e.patientCpf}</div>
            </div>
            <div class="queue-card-actions">
              <button class="btn btn-primary btn-triar" style="font-size: 0.8rem; padding: 6px 12px;" data-enc-id="${e.id}" data-patient-name="${e.patientName}">
                <i class="fa-solid fa-user-nurse"></i> Triar
              </button>
            </div>
          `;
          
          card.querySelector('.btn-triar').addEventListener('click', () => {
            openTriageModalForm(e.id, e.patientName);
          });
          
          triageQueueContainer.appendChild(card);
        });
      }

      const colorPriority = {
        'Vermelho': 5,
        'Laranja': 4,
        'Amarelo': 3,
        'Verde': 2,
        'Azul': 1
      };

      const sortedMedical = medicalEncounters.sort((a, b) => {
        if (a.status === 'Em_Atendimento' && b.status !== 'Em_Atendimento') return -1;
        if (a.status !== 'Em_Atendimento' && b.status === 'Em_Atendimento') return 1;

        const pA = colorPriority[a.manchesterColor] || 0;
        const pB = colorPriority[b.manchesterColor] || 0;
        if (pA !== pB) {
          return pB - pA;
        }
        return new Date(a.admitted_at) - new Date(b.admitted_at);
      });

      if (sortedMedical.length === 0) {
        medicalQueueContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px; font-size: 0.85rem;">Nenhum paciente na fila de consulta.</div>`;
      } else {
        medicalQueueContainer.innerHTML = '';
        sortedMedical.forEach(e => {
          const waitTimeText = getWaitTimeText(e.admitted_at);
          const badgeClass = `badge-${(e.manchesterColor || '').toLowerCase()}`;
          const isCalling = e.status === 'Em_Atendimento';
          
          const card = document.createElement('div');
          card.className = 'queue-card';
          if (isCalling) {
            card.style.borderColor = 'var(--color-primary)';
            card.style.backgroundColor = 'rgba(0, 100, 255, 0.05)';
          }
          
          card.innerHTML = `
            <div class="queue-card-header">
              <span class="queue-patient-name" style="${isCalling ? 'color: var(--color-primary); font-weight:700;' : ''}">
                ${e.patientName} ${isCalling ? ' (Em Consulta)' : ''}
              </span>
              <span class="queue-time"><i class="fa-solid fa-clock"></i> ${waitTimeText}</span>
            </div>
            <div class="queue-card-body">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="badge-manchester ${badgeClass}">${e.manchesterColor}</span>
                <span style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">PA: ${e.bloodPressure} | Temp: ${e.temperatureCelsius}°C</span>
              </div>
              <p style="margin-top: 8px; font-style: italic; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                "${e.complaints}"
              </p>
            </div>
            <div class="queue-card-actions">
              ${!isCalling ? `
                <button class="btn btn-primary btn-call-consult" style="font-size: 0.8rem; padding: 6px 12px; background: var(--color-accent);" data-enc-id="${e.id}">
                  <i class="fa-solid fa-bullhorn"></i> Chamar
                </button>
              ` : `
                <button class="btn btn-secondary btn-open-pep" style="font-size: 0.8rem; padding: 6px 12px;" data-enc-id="${e.id}">
                  <i class="fa-solid fa-file-medical"></i> PEP
                </button>
                <button class="btn btn-primary btn-finish-consult" style="font-size: 0.8rem; padding: 6px 12px; background: var(--color-danger);" data-enc-id="${e.id}">
                  <i class="fa-solid fa-circle-check"></i> Finalizar
                </button>
              `}
            </div>
          `;

          const callBtn = card.querySelector('.btn-call-consult');
          const finishBtn = card.querySelector('.btn-finish-consult');
          const pepBtn = card.querySelector('.btn-open-pep');

          if (callBtn) {
            callBtn.addEventListener('click', () => updateEncounterStatus(e.id, 'Em_Atendimento', e.patientName));
          }
          if (finishBtn) {
            finishBtn.addEventListener('click', () => updateEncounterStatus(e.id, 'Finalizado', e.patientName));
          }
          if (pepBtn) {
            pepBtn.addEventListener('click', () => window.openPEPModal(e.id));
          }

          medicalQueueContainer.appendChild(card);
        });
      }
    };

    const openTriageModalForm = (encounterId, patientName) => {
      document.getElementById('triage-encounter-id').value = encounterId;
      document.getElementById('triage-patient-name').textContent = patientName;
      document.getElementById('triage-modal').style.display = 'flex';
    };

    const updateEncounterStatus = async (id, status, patientName) => {
      try {
        const res = await apiFetch(`${API_URL}/encounters/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (res.ok) {
          loadAndRenderQueue();
          if (status === 'Em_Atendimento') {
            showToast(`Paciente ${patientName} chamado para o consultório!`);
          } else if (status === 'Finalizado') {
            showToast(`Atendimento de ${patientName} finalizado.`);
          }
          state.loading = true;
        } else {
          alert('Erro ao atualizar status do atendimento.');
        }
      } catch (err) {
        alert('Erro ao conectar-se à API.');
      }
    };

    const getWaitTimeText = (admittedAt) => {
      const diffMs = new Date() - new Date(admittedAt);
      const diffMin = Math.floor(diffMs / (60 * 1000));
      if (diffMin < 1) return 'Agora mesmo';
      if (diffMin < 60) return `${diffMin} min atrás`;
      const hrs = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      return `${hrs}h ${mins}m atrás`;
    };

    loadPatientsForAdmission();
    loadAndRenderQueue();
    } else if (state.activeTab === 'relatorios') {
      renderReportsTab(contentArea);
    } else if (state.activeTab === 'configuracoes') {
    contentArea.innerHTML = `
      <div class="tab-section active">
        <div class="settings-section">
          
          <!-- Accordion de Status -->
          <details class="settings-accordion" open>
            <summary class="settings-accordion-header">
              <i class="fa-solid fa-server"></i> Status do Sistema
            </summary>
            <div class="settings-accordion-body">
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                  <span style="color: var(--text-secondary);">Integração com Turso DB</span>
                  <span class="status-badge">
                    <span class="status-indicator success"></span>
                    Conectado (AWS Us-East-1)
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                  <span style="color: var(--text-secondary);">Servidor API Local</span>
                  <span style="color: var(--text-primary); font-family: monospace;">http://localhost:3001</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-secondary);">Ambiente Web (Vercel)</span>
                  <span style="color: var(--text-primary); font-family: monospace;">health-nexus-beryl.vercel.app</span>
                </div>
              </div>
            </div>
          </details>

          <!-- Accordion de Manutenção -->
          <details class="settings-accordion">
            <summary class="settings-accordion-header">
              <i class="fa-solid fa-database"></i> Gerenciamento de Dados de Teste
            </summary>
            <div class="settings-accordion-body">
              <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
                Utilize os botões abaixo para simular a carga de dados fictícios para testes rápidos ou zerar o banco de dados completamente.
              </p>
              <div class="settings-actions">
                <button id="btn-seed" class="btn btn-primary">
                  <i class="fa-solid fa-circle-plus"></i> Gerar Dados Fictícios
                </button>
                <button id="btn-reset" class="btn" style="background-color: rgba(255, 50, 80, 0.15); border-color: var(--color-danger); color: var(--color-danger);">
                  <i class="fa-solid fa-trash-can"></i> Limpar Banco de Dados
                </button>
              </div>
            </div>
          </details>

          <!-- Accordion de Importação e Exportação JSON -->
          <details class="settings-accordion">
            <summary class="settings-accordion-header">
              <i class="fa-solid fa-cloud-arrow-down"></i> Exportar / Importar JSON (Backup)
            </summary>
            <div class="settings-accordion-body">
              <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
                Baixe todos os dados atuais em formato JSON, ou restaure um backup. A importação irá mesclar ou sobrescrever dados existentes e sincronizará automaticamente com o Turso.
              </p>
              <div class="settings-actions">
                <button id="btn-export-json" class="btn btn-primary">
                  <i class="fa-solid fa-download"></i> Exportar Dados
                </button>
                <input type="file" id="import-json-file" accept=".json" style="display: none;" />
                <button id="btn-import-json" class="btn btn-secondary" style="border-color: #ffaa00; color: #ffaa00;">
                  <i class="fa-solid fa-upload"></i> Importar Dados
                </button>
              </div>
            </div>
          </details>

        </div>
      </div>
    `;

    document.getElementById('btn-seed').addEventListener('click', async () => {
      try {
        const res = await apiFetch(`${API_URL}/settings/seed`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          alert('Sucesso: 5 pacientes fictícios foram inseridos no banco Turso.');
          state.loading = true;
        } else {
          alert(`Erro: ${data.message || 'Falha ao popular banco.'}`);
        }
      } catch (err) {
        alert('Erro ao conectar-se à API.');
      }
    });

    document.getElementById('btn-reset').addEventListener('click', async () => {
      if (confirm('Tem certeza de que deseja APAGAR TODOS os pacientes do banco Turso? Esta ação não pode ser desfeita.')) {
        try {
          const res = await apiFetch(`${API_URL}/settings/reset`, { method: 'POST' });
          const data = await res.json();
          if (res.ok) {
            alert('Sucesso: Todos os dados de pacientes foram removidos.');
            state.loading = true;
          } else {
            alert(`Erro: ${data.message || 'Falha ao resetar banco.'}`);
          }
        } catch (err) {
          alert('Erro ao conectar-se à API.');
        }
      }
    });

    document.getElementById('btn-export-json').addEventListener('click', async () => {
      try {
        const res = await apiFetch(`${API_URL}/settings/export`);
        const data = await res.json();
        if (res.ok) {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `health_nexus_backup_${new Date().toISOString().slice(0,10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Dados exportados com sucesso!');
        } else {
          alert(`Erro: ${data.message || 'Falha ao exportar dados.'}`);
        }
      } catch (err) {
        alert('Erro ao conectar-se à API.');
      }
    });

    document.getElementById('btn-import-json').addEventListener('click', () => {
      document.getElementById('import-json-file').click();
    });

    document.getElementById('import-json-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          const res = await apiFetch(`${API_URL}/settings/import`, {
            method: 'POST',
            body: JSON.stringify(jsonData)
          });
          const data = await res.json();
          if (res.ok) {
            alert('Sucesso: Os dados foram importados e sincronizados com Turso.');
            window.location.reload(); // Recarregar para atualizar estado
          } else {
            alert(`Erro: ${data.message || 'Falha ao importar dados.'}`);
          }
        } catch (err) {
          alert('Erro ao processar arquivo JSON ou conectar-se à API.');
        }
      };
      reader.readAsText(file);
    });
  }
}

// --- CONSUMO DE APIs DO BACKEND ---
async function fetchDashboardData() {
  try {
    const response = await apiFetch(`${API_URL}/dashboard/summary`);
    if (response.ok) {
      state.dashboardData = await response.json();
    } else {
      throw new Error(`Erro da API: ${response.status}`);
    }
  } catch (error) {
    console.warn('Backend offline, utilizando dados locais para demonstração de interface.');
    state.dashboardData = {
      activePatients: 0,
      occupancyRate: 84.5,
      averageWaitTimeMinutes: 18,
      dailyAppointmentsCount: 84,
      billingSummary: { totalRevenue: 245000.00, pendingClaims: 45100.00 }
    };
  } finally {
    state.loading = false;
  }
}

// --- FUNÇÃO PARA INICIALIZAR GRÁFICOS CHART.JS ---
function initDashboardCharts(data) {
  const occupancyCtx = document.getElementById('occupancyChart');
  const appointmentsCtx = document.getElementById('appointmentsChart');

  if (occupancyCtx && data.occupancyData) {
    const labels = data.occupancyData.map(item => item.label);
    const values = data.occupancyData.map(item => item.value);
    const colors = data.occupancyData.map(item => item.color);

    new Chart(occupancyCtx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 1,
          borderColor: '#1e2229'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#a0aec0',
              font: { family: 'Outfit', size: 11 }
            }
          }
        }
      }
    });
  }

  if (appointmentsCtx && data.appointmentsHistory) {
    const labels = data.appointmentsHistory.map(item => item.label);
    // Combine both values, or just show total appointments
    const values = data.appointmentsHistory.map(item => item.urgencia + item.ambulatorial);

    new Chart(appointmentsCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Atendimentos Totais',
          data: values,
          fill: true,
          backgroundColor: 'rgba(0, 100, 255, 0.1)',
          borderColor: '#0064ff',
          borderWidth: 2,
          tension: 0.3,
          pointBackgroundColor: '#0064ff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#a0aec0', font: { family: 'Inter', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#a0aec0', font: { family: 'Inter', size: 10 } }
          }
        }
      }
    });
  }
}

// --- MÁSCARAS DE INPUT ---
function maskCPF(value) {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .substring(0, 14);
}

function maskPhone(value) {
  let v = value.replace(/\D/g, "");
  if (v.length > 11) v = v.substring(0, 11);
  if (v.length <= 2) {
    return v;
  } else if (v.length <= 6) {
    return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  } else if (v.length <= 10) {
    return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  } else {
    return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  }
}

function maskCurrency(value) {
  let v = value.replace(/\D/g, "");
  if (!v) return "R$ 0,00";
  let number = (parseInt(v, 10) / 100).toFixed(2);
  let parts = number.split(".");
  let integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  let decimalPart = parts[1];
  return `R$ ${integerPart},${decimalPart}`;
}

function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function applyInputMasks() {
  const cpfInput = document.getElementById('cpf');
  const phoneInput = document.getElementById('phone');
  const cellphoneInput = document.getElementById('cellphone');
  const billingValueInput = document.getElementById('billingValue');

  if (cpfInput) {
    cpfInput.addEventListener('input', (e) => {
      e.target.value = maskCPF(e.target.value);
    });
  }
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = maskPhone(e.target.value);
    });
  }
  if (cellphoneInput) {
    cellphoneInput.addEventListener('input', (e) => {
      e.target.value = maskPhone(e.target.value);
    });
  }
  if (billingValueInput) {
    billingValueInput.addEventListener('input', (e) => {
      e.target.value = maskCurrency(e.target.value);
    });
    billingValueInput.addEventListener('focus', (e) => {
      if (!e.target.value) e.target.value = "R$ 0,00";
    });
  }
}

// Inicializar aplicativo
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

// Heartbeat para manter o servidor rodando apenas enquanto a aba estiver aberta
setInterval(() => {
  fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
}, 3000);

// --- MÓDULO PEP (PRONTUÁRIO ELETRÔNICO DO PACIENTE) ---

let currentPEPEncounterId = null;

// Catálogo Mock de CID-10
const mockCidCatalog = [
  { code: 'A09', description: 'Diarreia e gastroenterite de origem infecciosa presumível' },
  { code: 'I10', description: 'Hipertensão essencial (primária)' },
  { code: 'J01', description: 'Sinusite aguda' },
  { code: 'J02', description: 'Faringite aguda' },
  { code: 'J03', description: 'Amigdalite aguda' },
  { code: 'J06', description: 'Infecções agudas das vias aéreas superiores de localizações múltiplas e não especificadas' },
  { code: 'J20', description: 'Bronquite aguda' },
  { code: 'N39.0', description: 'Infecção do trato urinário de localização não especificada' },
  { code: 'R07.4', description: 'Dor no peito, não especificada' },
  { code: 'R10', description: 'Dor abdominal e pélvica' },
  { code: 'R50', description: 'Febre de origem desconhecida e de outras origens' },
  { code: 'R51', description: 'Cefaleia' }
];

// Configurar Autocomplete do CID
function setupCidAutocomplete() {
  const input = document.getElementById('pep-assessment');
  const dropdown = document.getElementById('pep-cid-dropdown');
  
  if (!input || !dropdown) return;
  
  input.addEventListener('input', (e) => {
    const term = removeAccents(e.target.value.toLowerCase());
    dropdown.innerHTML = '';
    
    if (term.length < 2) {
      dropdown.classList.remove('active');
      return;
    }
    
    const matches = mockCidCatalog.filter(cid => 
      removeAccents(cid.code.toLowerCase()).includes(term) || 
      removeAccents(cid.description.toLowerCase()).includes(term)
    );
    
    if (matches.length > 0) {
      matches.forEach(cid => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.textContent = `${cid.code} - ${cid.description}`;
        div.addEventListener('click', () => {
          input.value = `${cid.code} - ${cid.description}`;
          dropdown.classList.remove('active');
        });
        dropdown.appendChild(div);
      });
      dropdown.classList.add('active');
    } else {
      dropdown.classList.remove('active');
    }
  });
  
  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

// Abrir PEP
window.openPEPModal = async function(encounterId) {
  currentPEPEncounterId = encounterId;
  const modal = document.getElementById('pep-modal');
  
  // Limpar campos
  document.getElementById('pep-subjective').value = '';
  document.getElementById('pep-objective').value = '';
  document.getElementById('pep-assessment').value = '';
  document.getElementById('pep-plan').value = '';
  document.getElementById('pep-status-badge').innerHTML = '';
  document.getElementById('pep-status-badge').className = '';
  
  try {
    // 1. Buscar detalhes do Atendimento para cabeçalho
    const encRes = await apiFetch(`${API_URL}/encounters`);
    const encounters = await encRes.json();
    const encounter = encounters.find(e => e.id === encounterId);
    
    if (encounter) {
      document.getElementById('pep-patient-name').innerHTML = `<i class="fa-solid fa-user"></i> ${encounter.patientName || 'Paciente'}`;
      document.getElementById('pep-encounter-status').innerHTML = `<i class="fa-solid fa-clock"></i> ${new Date(encounter.created_at).toLocaleString('pt-BR')}`;
    }
    
    // 2. Buscar dados da Triagem para Sidebar
    const trRes = await apiFetch(`${API_URL}/triages`);
    const triages = await trRes.json();
    const triage = triages.find(t => t.encounterId === encounterId);
    
    if (triage) {
      const badge = document.getElementById('pep-manchester-badge');
      badge.textContent = triage.manchesterColor.toUpperCase();
      badge.style.color = getManchesterColorHex(triage.manchesterColor);
      
      document.getElementById('pep-bp').textContent = triage.bloodPressure || '-';
      document.getElementById('pep-hr').textContent = triage.heartRateBpm || '-';
      document.getElementById('pep-temp').textContent = triage.temperatureCelsius || '-';
      document.getElementById('pep-weight').textContent = triage.weightKg || '-';
      document.getElementById('pep-complaints').textContent = triage.complaints || '-';
    }
    
    // 3. Buscar Nota Clínica se existir
    const noteRes = await apiFetch(`${API_URL}/encounters/${encounterId}/notes`);
    const note = await noteRes.json();
    
    const isClosed = note && note.isClosed === 1;
    
    if (note) {
      document.getElementById('pep-subjective').value = note.subjectiveContent || '';
      document.getElementById('pep-objective').value = note.objectiveContent || '';
      document.getElementById('pep-assessment').value = note.assessmentContent || '';
      document.getElementById('pep-plan').value = note.planContent || '';
      
      const badge = document.getElementById('pep-status-badge');
      if (isClosed) {
        badge.textContent = 'ASSINADO E FECHADO';
        badge.className = 'badge-signed';
      } else {
        badge.textContent = 'RASCUNHO SALVO';
        badge.className = 'badge-draft';
      }
    }
    
    // Bloquear campos se estiver assinado
    const fields = ['pep-subjective', 'pep-objective', 'pep-assessment', 'pep-plan'];
    fields.forEach(f => document.getElementById(f).disabled = isClosed);
    
    document.getElementById('btn-save-draft').style.display = isClosed ? 'none' : 'inline-flex';
    document.getElementById('btn-sign-pep').style.display = isClosed ? 'none' : 'inline-flex';
    
    // Configurar autocomplete
    setupCidAutocomplete();
    
    // Exibir modal
    modal.style.display = 'flex';
    
  } catch (err) {
    console.error('Erro ao abrir PEP:', err);
    showToast('Erro ao carregar dados do prontuário.');
  }
};

window.closePEPModal = function() {
  document.getElementById('pep-modal').style.display = 'none';
  currentPEPEncounterId = null;
};

// Salvar Rascunho
window.savePEPDraft = async function() {
  if (!currentPEPEncounterId) return;
  
  const payload = {
    noteType: 'Evolução',
    subjectiveContent: document.getElementById('pep-subjective').value,
    objectiveContent: document.getElementById('pep-objective').value,
    assessmentContent: document.getElementById('pep-assessment').value,
    planContent: document.getElementById('pep-plan').value
  };
  
  try {
    const res = await apiFetch(`${API_URL}/encounters/${currentPEPEncounterId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await res.json();
    if (res.ok) {
      showToast('Rascunho salvo com sucesso.');
      const badge = document.getElementById('pep-status-badge');
      badge.textContent = 'RASCUNHO SALVO';
      badge.className = 'badge-draft';
    } else {
      showToast(result.message || 'Erro ao salvar rascunho.');
    }
  } catch (err) {
    showToast('Erro de conexão ao salvar rascunho.');
  }
};

// Modal de Assinatura
window.openSignModal = function() {
  document.getElementById('sign-modal').style.display = 'flex';
  document.getElementById('sign-password').value = '';
};

window.closeSignModal = function() {
  document.getElementById('sign-modal').style.display = 'none';
};

window.confirmSignPEP = async function() {
  if (!currentPEPEncounterId) return;
  
  const password = document.getElementById('sign-password').value;
  if (!password) {
    showToast('Informe sua senha para assinar.');
    return;
  }
  
  // Primeiro, salvar como rascunho para garantir que o texto mais recente foi salvo
  await savePEPDraft();
  
  try {
    const res = await apiFetch(`${API_URL}/encounters/${currentPEPEncounterId}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordVerification: password })
    });
    
    const result = await res.json();
    if (res.ok) {
      showToast('Prontuário assinado e finalizado com sucesso!');
      closeSignModal();
      closePEPModal();
      renderTabContent(); // Recarregar aba de atendimentos
    } else {
      showToast(result.message || 'Erro ao assinar prontuário.');
    }
  } catch (err) {
    showToast('Erro de conexão ao assinar prontuário.');
  }
};

function getManchesterColorHex(colorName) {
  const map = {
    'vermelho': '#ff3b30',
    'laranja': '#ff9500',
    'amarelo': '#ffcc00',
    'verde': '#34c759',
    'azul': '#007aff'
  };
  return map[colorName.toLowerCase()] || 'var(--text-primary)';
}

// ==========================================
// MÓDULO DE RELATÓRIOS E EXPORTAÇÃO
// ==========================================

function renderReportsTab(contentArea) {
  contentArea.innerHTML = `
    <div class="tab-section active">
      <div class="section-header">
        <h2><i class="fa-solid fa-file-contract"></i> Relatórios e Exportação</h2>
        <p>Exporte dados do sistema em PDF, Excel (XLSX) ou CSV.</p>
      </div>

      <div class="reports-grid">
        <!-- Relatório de Pacientes -->
        <div class="report-card glass-card">
          <div class="report-icon"><i class="fa-solid fa-users"></i></div>
          <h3>Pacientes</h3>
          <p>Exportar lista completa de pacientes cadastrados no sistema.</p>
          <div class="report-actions">
            <button onclick="exportData('patients', 'pdf')" class="btn-primary" style="background: var(--danger-color)"><i class="fa-solid fa-file-pdf"></i> PDF</button>
            <button onclick="exportData('patients', 'xls')" class="btn-primary" style="background: var(--success-color)"><i class="fa-solid fa-file-excel"></i> XLS</button>
            <button onclick="exportData('patients', 'csv')" class="btn-outline"><i class="fa-solid fa-file-csv"></i> CSV</button>
          </div>
        </div>

        <!-- Relatório de Atendimentos -->
        <div class="report-card glass-card">
          <div class="report-icon"><i class="fa-solid fa-notes-medical"></i></div>
          <h3>Atendimentos</h3>
          <p>Exportar histórico de todos os atendimentos realizados.</p>
          <div class="report-actions">
            <button onclick="exportData('encounters', 'pdf')" class="btn-primary" style="background: var(--danger-color)"><i class="fa-solid fa-file-pdf"></i> PDF</button>
            <button onclick="exportData('encounters', 'xls')" class="btn-primary" style="background: var(--success-color)"><i class="fa-solid fa-file-excel"></i> XLS</button>
            <button onclick="exportData('encounters', 'csv')" class="btn-outline"><i class="fa-solid fa-file-csv"></i> CSV</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function exportData(type, format) {
  try {
    const endpoint = type === 'patients' ? '/api/patients' : '/api/encounters';
    const response = await apiFetch(endpoint);
    const data = await response.json();
    
    if (!data || data.length === 0) {
      alert('Nenhum dado encontrado para exportação.');
      return;
    }

    let columns = [];
    let rows = [];
    let title = '';
    let filename = '';

    if (type === 'patients') {
      title = 'Relatório de Pacientes';
      filename = 'pacientes';
      columns = ['ID', 'Nome', 'CPF', 'Data de Nascimento', 'Gênero'];
      rows = data.map(p => [
        p.id, 
        p.name, 
        p.cpf, 
        p.birth_date ? new Date(p.birth_date).toLocaleDateString() : '-', 
        p.gender || '-'
      ]);
    } else {
      title = 'Relatório de Atendimentos';
      filename = 'atendimentos';
      columns = ['ID', 'Paciente', 'Motivo', 'Classificação', 'Status', 'Data'];
      rows = data.map(e => [
        e.id, 
        e.patient_name || 'Desconhecido', 
        e.reason || '-', 
        e.triage_color || '-', 
        e.status, 
        new Date(e.created_at).toLocaleString()
      ]);
    }

    const timestamp = new Date().toISOString().slice(0,10);
    filename = `${filename}_${timestamp}`;

    if (format === 'pdf') {
      exportToPDF(columns, rows, title, filename);
    } else if (format === 'xls') {
      exportToXLS(columns, rows, filename);
    } else if (format === 'csv') {
      exportToCSV(columns, rows, filename);
    }
  } catch (error) {
    console.error('Erro na exportação:', error);
    alert('Erro ao exportar dados.');
  }
}

function exportToPDF(columns, rows, title, filename) {
  if (!window.jspdf) {
    alert('Biblioteca PDF não carregada.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Gerado pelo sistema Health Nexus em: ${new Date().toLocaleString()}`, 14, 30);

  doc.autoTable({
    startY: 40,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [44, 45, 52] },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  });

  doc.save(`${filename}.pdf`);
}

function exportToXLS(columns, rows, filename) {
  if (!window.XLSX) {
    alert('Biblioteca XLSX não carregada.');
    return;
  }
  const ws_data = [columns, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function exportToCSV(columns, rows, filename) {
  const csvContent = [
    columns.join(','),
    ...rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\\n');

  // Adiciona BOM para UTF-8 (corrige acentuação no Excel)
  const blob = new Blob(['\\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
