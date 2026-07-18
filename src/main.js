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

// --// --- ESTRUTURA GERAL DA INTERFACE (TEMPLATE) ---
function renderAppStructure() {
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="app-container">
      <!-- Sidebar de Navegação -->
      <aside class="app-sidebar">
        <div class="brand-logo">
          <img src="/assets/logo.png" alt="Health Nexus" class="brand-logo-img">
          <span class="brand-logo-subtext">Desenvolvido por @mazzarowysk @_coltri_</span>
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
                <i class="fa-solid fa-gear"></i>
                <span>Configurações</span>
              </a>
            </li>
          </ul>
        </nav>
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
                  <input type="text" id="cpf" class="form-input" required placeholder="000.000.000-00">
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
              const deleteRes = await fetch(`${API_URL}/patients/${id}`, { method: 'DELETE' });
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
        const res = await fetch(`${API_URL}/patients`);
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
        const res = await fetch(url, {
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
        <h2 style="margin-bottom: 24px; font-family: 'Outfit';">Triagem Manchester e Fila de Atendimento</h2>
        <p style="color: var(--text-secondary);">Esta aba gerencia a classificação de risco e direcionamento para os consultórios médicos.</p>
      </div>
    `;
  } else if (state.activeTab === 'configuracoes') {
    contentArea.innerHTML = `
      <div class="tab-section active">
        <div class="settings-section">
          <!-- Card de Status -->
          <div class="settings-card">
            <h3 class="settings-title"><i class="fa-solid fa-server" style="color: var(--color-primary);"></i> Status do Sistema</h3>
            <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
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

          <!-- Card de Manutenção -->
          <div class="settings-card">
            <h3 class="settings-title"><i class="fa-solid fa-database" style="color: var(--color-accent);"></i> Gerenciamento de Dados de Teste</h3>
            <p style="color: var(--text-secondary); line-height: 1.6;">
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
        </div>
      </div>
    `;

    document.getElementById('btn-seed').addEventListener('click', async () => {
      try {
        const res = await fetch(`${API_URL}/settings/seed`, { method: 'POST' });
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
          const res = await fetch(`${API_URL}/settings/reset`, { method: 'POST' });
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

  if (occupancyCtx) {
    new Chart(occupancyCtx, {
      type: 'doughnut',
      data: {
        labels: ['Urgência', 'Maternidade', 'UTI Geral', 'Pediatria', 'Clínica Médica'],
        datasets: [{
          data: [25, 15, 30, 10, 20],
          backgroundColor: [
            '#0064ff', // Urgência
            '#00d2fc', // Maternidade
            '#ff3b30', // UTI Geral
            '#34c759', // Pediatria
            '#af52de'  // Clínica Médica
          ],
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

  if (appointmentsCtx) {
    new Chart(appointmentsCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'],
        datasets: [{
          label: 'Atendimentos',
          data: [540, 620, 780, 710, 890, 940, 1020],
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
  renderAppStructure();
});
