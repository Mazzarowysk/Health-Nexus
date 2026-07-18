// --- CONFIGURAÇÃO DA SPA E ROTAS ---
const API_URL = '/api';

// Elementos de Estado
let state = {
  activeTab: 'dashboard',
  dashboardData: {
    activePatients: 0,
    occupancyRate: 0,
    averageWaitTimeMinutes: 0,
    dailyAppointmentsCount: 0,
    billingSummary: { totalRevenue: 0, pendingClaims: 0 }
  },
  loading: true
};

// --- ESTRUTURA GERAL DA INTERFACE (TEMPLATE) ---
function renderAppStructure() {
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="app-container">
      <!-- Sidebar de Navegação -->
      <aside class="app-sidebar">
        <div class="brand-logo">
          <i class="fa-solid fa-heart-pulse"></i>
          <span>Health Nexus</span>
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
              <a class="nav-item ${state.activeTab === 'configuracoes' ? 'active' : ''}" data-tab="configuracoes">
                <i class="fa-solid fa-gears"></i>
                <span>Configurações</span>
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Cabeçalho Superior -->
      <header class="app-header">
        <h1 class="page-title" id="page-title-label">Dashboard</h1>
        <div class="user-profile">
          <div class="user-info">
            <p class="user-name">Dr. João Silva</p>
            <p class="user-role">Diretor Clínico</p>
          </div>
          <div class="user-avatar">JS</div>
        </div>
      </header>

      <!-- Área de Conteúdo Principal -->
      <main class="app-content" id="main-content">
        <!-- O conteúdo específico da aba ativa será injetado aqui -->
      </main>
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
              <span>Taxa de Ocupação</span>
              <div class="kpi-icon primary"><i class="fa-solid fa-bed"></i></div>
            </div>
            <div class="kpi-value">${data.occupancyRate}%</div>
            <div class="kpi-trend trend-up">
              <i class="fa-solid fa-arrow-trend-up"></i>
              <span>+2.4% vs semana anterior</span>
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
      </div>
    `;
  } else if (state.activeTab === 'pacientes') {
    contentArea.innerHTML = `
      <div class="tab-section active" style="max-width: 600px;">
        <h2 style="margin-bottom: 24px; font-family: 'Outfit';">Admissão Rápida de Paciente</h2>
        <form id="patient-form" style="background-color: var(--bg-secondary); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
          <div class="form-group">
            <label class="form-label" for="fullName">* Nome Completo:</label>
            <input type="text" id="fullName" class="form-input" required placeholder="Digite o nome completo civil">
          </div>
          <div class="form-group">
            <label class="form-label" for="cpf">* CPF:</label>
            <input type="text" id="cpf" class="form-input" required placeholder="000.000.000-00">
          </div>
          <div class="form-group">
            <label class="form-label" for="birthDate">* Data de Nascimento:</label>
            <input type="date" id="birthDate" class="form-input" required>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top: 16px; width: 100%;">Registrar Paciente</button>
        </form>
      </div>
    `;

    document.getElementById('patient-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('fullName').value;
      const cpf = document.getElementById('cpf').value;
      const birthDate = document.getElementById('birthDate').value;

      try {
        const res = await fetch(`${API_URL}/patients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, cpf, birthDate })
        });
        const data = await res.json();
        if (res.ok) {
          alert(`Sucesso! Paciente cadastrado com ID: ${data.patientId}`);
          document.getElementById('patient-form').reset();
        } else {
          alert(`Erro: ${data.message || 'Falha ao registrar'}`);
        }
      } catch (err) {
        alert('Erro ao conectar-se à API.');
      }
    });
  } else if (state.activeTab === 'atendimento') {
    contentArea.innerHTML = `
      <div class="tab-section active">
        <h2 style="margin-bottom: 24px; font-family: 'Outfit';">Triagem Manchester e Fila de Atendimento</h2>
        <p style="color: var(--text-secondary);">Esta aba gerencia a classificação de risco e direcionamento para os consultórios médicos.</p>
      </div>
    `;
  } else if (state.activeTab === 'configuracoes') {
    contentArea.innerHTML = `
      <div class="tab-section active">
        <h2 style="margin-bottom: 24px; font-family: 'Outfit';">Configurações Gerais do Sistema</h2>
        <p style="color: var(--text-secondary);">Parametrização global e gerenciamento de permissões RBAC.</p>
      </div>
    `;
  }
}

// --- CONSUMO DE APIs DO BACKEND ---
async function fetchDashboardData() {
  try {
    const response = await fetch(`${API_URL}/dashboard/summary`);
    if (response.ok) {
      state.dashboardData = await response.json();
    }
  } catch (error) {
    console.warn('Backend offline, utilizando dados locais para demonstração de interface.');
    // Mock de fallback se estiver desconectado do backend
    state.dashboardData = {
      activePatients: 142,
      occupancyRate: 84.5,
      averageWaitTimeMinutes: 18,
      dailyAppointmentsCount: 84,
      billingSummary: { totalRevenue: 245000.00, pendingClaims: 45100.00 }
    };
  } finally {
    state.loading = false;
  }
}

// Inicializar aplicativo
document.addEventListener('DOMContentLoaded', () => {
  renderAppStructure();
});
