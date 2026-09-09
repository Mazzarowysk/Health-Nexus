import { state } from '../state.js';
import { apiFetch } from '../modules/api.js';
import * as localDB from '../localDB.js';
import { generateHospitalizations } from '../mockDataGenerator.js';

export async function fetchDashboardData() {
  state.loading = true;
  let d = {};

  try {
    const res = await apiFetch(`/api/dashboard/summary`);
    if (res.ok) {
      d = await res.json();
    }
  } catch (err) {
    console.warn('[fetchDashboardData] Erro ao buscar summary da API:', err);
  }

  let totalRealRevenue = d.billingSummary?.totalRevenue ?? 0;
  let realActivePatients = d.activePatients ?? null;

  if (realActivePatients === null) {
    try {
      const resP = await apiFetch(`/api/patients`);
      if (resP.ok) {
        const pList = await resP.json();
        realActivePatients = (Array.isArray(pList) ? pList : (pList.data || [])).length;
      }
    } catch (e) {}
  }

  if (totalRealRevenue === 0) {
    try {
      const resF = await apiFetch(`/api/financial`);
      if (resF.ok) {
        const fList = await resF.json();
        const arrF = Array.isArray(fList) ? fList : (fList.data || []);
        totalRealRevenue = arrF
          .filter(item => item.type === 'Receita' || !item.type)
          .reduce((sum, item) => sum + (parseFloat(item.amount || item.finalAmount) || 0), 0);
      }
    } catch (e) {}
  }

  const billingSum = {
    totalRevenue: totalRealRevenue,
    pendingClaims: d.billingSummary?.pendingClaims ?? 0
  };

  state.dashboardData = {
    activePatients: d.activePatients ?? (realActivePatients ?? 0),
    occupancyRate: d.occupancyRate ?? 0,
    averageWaitTimeMinutes: d.averageWaitTimeMinutes ?? 12,
    dailyAppointmentsCount: d.dailyAppointmentsCount ?? 0,
    billingSummary: billingSum,
    occupancyData: (d.occupancyData && d.occupancyData.length > 0) ? d.occupancyData : [
      { label: 'UTI Adulto', value: 0, color: '#818cf8' },
      { label: 'Enfermaria', value: 0, color: '#f472b6' },
      { label: 'Pediatria', value: 0, color: '#38bdf8' },
      { label: 'Maternidade', value: 0, color: '#fbbf24' },
      { label: 'Disponíveis', value: 100, color: '#34d399' }
    ],
    appointmentsHistory: (d.appointmentsHistory && d.appointmentsHistory.length > 0) ? d.appointmentsHistory : [
      { label: 'Seg', urgencia: 0, ambulatorial: 0 },
      { label: 'Ter', urgencia: 0, ambulatorial: 0 },
      { label: 'Qua', urgencia: 0, ambulatorial: 0 },
      { label: 'Qui', urgencia: 0, ambulatorial: 0 },
      { label: 'Sex', urgencia: 0, ambulatorial: 0 },
      { label: 'Sáb', urgencia: 0, ambulatorial: 0 },
      { label: 'Dom', urgencia: 0, ambulatorial: 0 }
    ],
    manchesterData: d.manchesterData || [0, 0, 0, 0, 0],
    funnelData: d.funnelData || null,
    kanbanData: d.kanbanData || null
  };

  state.loading = false;
}

if (typeof window !== 'undefined') {
  window.initDashboardCharts = initDashboardCharts;
}

export function initInteractiveFunnel(funnelData) {
  const periodPills = document.querySelectorAll('.funnel-period-pill');
  const stageEls = document.querySelectorAll('.funnel-stage, .funnel-legend-item');

  const fd = funnelData || {
    recepcao: 0, triagem: 0, consultorio: 0, exames: 0, alta: 0
  };
  const totR = fd.recepcao || 0;
  const totT = fd.triagem || 0;
  const totC = fd.consultorio || 0;
  const totE = fd.exames || 0;
  const totA = fd.alta || 0;

  const buildPeriod = (factor) => {
    if (totR === 0) {
      return {
        nums: ['0 (0%)', '0 (0%)', '0 (0%)', '0 (0%)', '0 (0%)'],
        legs: ['0', '0', '0', '0', '0'],
        resRate: '0,0%',
        goalText: '(0% da meta)',
        goalWidth: '0%'
      };
    }

    const r = Math.max(1, Math.round(totR * factor));
    const t = Math.round(totT * factor);
    const c = Math.round(totC * factor);
    const e = Math.round(totE * factor);
    const a = Math.round(totA * factor);

    const pT = r > 0 ? (t / r * 100).toFixed(1).replace('.', ',') : '0';
    const pC = r > 0 ? (c / r * 100).toFixed(1).replace('.', ',') : '0';
    const pE = r > 0 ? (e / r * 100).toFixed(1).replace('.', ',') : '0';
    const pA = r > 0 ? (a / r * 100).toFixed(1).replace('.', ',') : '0';

    const rateNum = r > 0 ? (a / r * 100) : 0;
    const resRate = `${rateNum.toFixed(1).replace('.', ',')}%`;
    const meta = 35.0;
    const goalPct = Math.min(100, Math.max(0, Math.round((rateNum / meta) * 100)));

    return {
      nums: [
        `${r.toLocaleString('pt-BR')} (100%)`,
        `${t.toLocaleString('pt-BR')} (${pT}%)`,
        `${c.toLocaleString('pt-BR')} (${pC}%)`,
        `${e.toLocaleString('pt-BR')} (${pE}%)`,
        `${a.toLocaleString('pt-BR')} (${pA}%)`
      ],
      legs: [
        r.toLocaleString('pt-BR'),
        t.toLocaleString('pt-BR'),
        c.toLocaleString('pt-BR'),
        e.toLocaleString('pt-BR'),
        a.toLocaleString('pt-BR')
      ],
      resRate,
      goalText: `(${goalPct}% da meta)`,
      goalWidth: `${goalPct}%`
    };
  };

  const periodData = {
    hoje: buildPeriod(0.15),
    semana: buildPeriod(0.65),
    mes: buildPeriod(1.0)
  };

  const activePill = document.querySelector('.funnel-period-pill.active');
  const initialPeriod = activePill?.dataset?.period || 'hoje';
  const initialData = periodData[initialPeriod] || periodData['hoje'];

  initialData.nums.forEach((val, idx) => {
    const el = document.getElementById(`funnel-num-${idx + 1}`);
    if (el) el.textContent = val;
  });
  initialData.legs.forEach((val, idx) => {
    const el = document.getElementById(`funnel-leg-${idx + 1}`);
    if (el) el.textContent = val;
  });
  const resRateEl = document.getElementById('funnel-res-rate');
  if (resRateEl) resRateEl.textContent = initialData.resRate;
  const goalTextEl = document.getElementById('funnel-goal-text');
  if (goalTextEl) goalTextEl.textContent = initialData.goalText;
  const goalBarEl = document.getElementById('funnel-goal-bar');
  if (goalBarEl) goalBarEl.style.width = initialData.goalWidth;

  periodPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      periodPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const period = pill.dataset.period;
      const data = periodData[period];
      if (!data) return;

      data.nums.forEach((val, idx) => {
        const el = document.getElementById(`funnel-num-${idx + 1}`);
        if (el) {
          el.style.opacity = '0';
          setTimeout(() => {
            el.textContent = val;
            el.style.opacity = '1';
          }, 150);
        }
      });

      data.legs.forEach((val, idx) => {
        const el = document.getElementById(`funnel-leg-${idx + 1}`);
        if (el) {
          el.style.opacity = '0';
          setTimeout(() => {
            el.textContent = val;
            el.style.opacity = '1';
          }, 150);
        }
      });

      if (resRateEl) {
        resRateEl.style.opacity = '0';
        setTimeout(() => {
          resRateEl.textContent = data.resRate;
          resRateEl.style.opacity = '1';
        }, 150);
      }

      if (goalTextEl) goalTextEl.textContent = data.goalText;
      if (goalBarEl) goalBarEl.style.width = data.goalWidth;
    });
  });

  stageEls.forEach(el => {
    el.addEventListener('click', () => {
      const targetTab = el.dataset.targetTab;
      const stageName = el.dataset.stageName || 'Etapa do Funil';
      if (targetTab && typeof window.switchTab === 'function') {
        window.switchTab(targetTab);
        if (typeof window.showToast === 'function') {
          window.showToast(`📊 Funil Hospitalar: Direcionando para "${stageName}"...`);
        }
      }
    });
  });
}

export function initDashboardCharts(data) {
  if (!data) return;

  const occupancyCtx = document.getElementById('occupancyChart');
  const appointmentsCtx = document.getElementById('appointmentsChart');

  const occupancyData = (data.occupancyData && data.occupancyData.length > 0) ? data.occupancyData : [
    { label: 'UTI Adulto', value: 0, color: '#f43f5e' },
    { label: 'Enfermaria', value: 0, color: '#6366f1' },
    { label: 'Pediatria', value: 0, color: '#00f2fe' },
    { label: 'Maternidade', value: 0, color: '#f59e0b' },
    { label: 'Disponíveis', value: 100, color: '#10b981' }
  ];

  const apptHistory = (data.appointmentsHistory && data.appointmentsHistory.length > 0) ? data.appointmentsHistory : [
    { label: 'Seg', urgencia: 0, ambulatorial: 0 },
    { label: 'Ter', urgencia: 0, ambulatorial: 0 },
    { label: 'Qua', urgencia: 0, ambulatorial: 0 },
    { label: 'Qui', urgencia: 0, ambulatorial: 0 },
    { label: 'Sex', urgencia: 0, ambulatorial: 0 },
    { label: 'Sáb', urgencia: 0, ambulatorial: 0 },
    { label: 'Dom', urgencia: 0, ambulatorial: 0 }
  ];

  const ChartClass = window.Chart || (typeof Chart !== 'undefined' ? Chart : null);
  if (!ChartClass) {
    console.warn('[DashboardCharts] Chart.js não encontrado no ambiente.');
    return;
  }

  // 1. Gráfico Híbrido de Ocupação de Leitos (Doughnut Neon + KPI Central + Progress Bars)
  if (occupancyCtx) {
    if (occupancyCtx._chartInstance) occupancyCtx._chartInstance.destroy();
    occupancyCtx.style.cursor = 'pointer';

    const ctx = occupancyCtx.getContext('2d');

    const neonColors = [
      '#f43f5e', '#6366f1', '#00f2fe', '#f59e0b', '#10b981'
    ];

    let totalBeds = 0;
    let occupiedBeds = 0;
    occupancyData.forEach(item => {
      totalBeds += item.value;
      if (item.label !== 'Disponíveis') {
        occupiedBeds += item.value;
      }
    });
    const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    const donutCenterNum = document.getElementById('donut-center-percentage');
    if (donutCenterNum) donutCenterNum.textContent = `${occupancyPct}%`;

    const statusBadge = document.getElementById('occupancy-total-badge');
    if (statusBadge) {
      const statusColor = occupancyPct > 85 ? '#f43f5e' : (occupancyPct > 70 ? '#f59e0b' : '#10b981');
      const statusText = occupancyPct > 85 ? 'Lotação Crítica' : (occupancyPct > 70 ? 'Alta Demanda' : 'Estável');
      statusBadge.style.borderColor = statusColor;
      statusBadge.style.color = statusColor;
      statusBadge.innerHTML = `<i class="fa-solid fa-bed-pulse"></i> ${occupancyPct}% Ocupado (${statusText})`;
    }

    const progressListEl = document.getElementById('ward-progress-list');
    if (progressListEl) {
      progressListEl.innerHTML = '';
      const wardIcons = {
        'UTI Adulto': 'fa-heart-pulse',
        'Enfermaria': 'fa-hospital-user',
        'Pediatria': 'fa-baby',
        'Maternidade': 'fa-person-breastfeeding',
        'Disponíveis': 'fa-bed'
      };

      occupancyData.forEach((item, idx) => {
        const color = item.color || neonColors[idx % neonColors.length];
        const pct = totalBeds > 0 ? Math.round((item.value / totalBeds) * 100) : 0;
        const icon = wardIcons[item.label] || 'fa-procedures';

        const wardItem = document.createElement('div');
        wardItem.className = 'ward-progress-item';
        wardItem.style.cursor = 'pointer';
        wardItem.onclick = () => {
          if (item.label === 'Disponíveis') {
            window.currentLeitosStatusFilter = 'Vago';
          } else {
            window.currentLeitosStatusFilter = 'Ocupado';
          }
          if (typeof window.switchTab === 'function') window.switchTab('leitos'); 
        };

        wardItem.innerHTML = `
          <div class="ward-progress-header">
            <span class="ward-name">
              <i class="fa-solid ${icon}" style="color: ${color}; width: 14px;"></i>
              ${item.label}
            </span>
            <span class="ward-stats">
              <strong style="color: ${color}; font-size: 0.88rem;">${item.value}</strong> leitos <span style="opacity: 0.65; font-size: 0.75rem;">(${pct}%)</span>
            </span>
          </div>
          <div class="ward-bar-track">
            <div class="ward-bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, ${color}, ${color}dd); box-shadow: 0 0 10px ${color}88;"></div>
          </div>
        `;
        progressListEl.appendChild(wardItem);
      });
    }

    const inst = new ChartClass(ctx, {
      type: 'doughnut',
      data: {
        labels: occupancyData.map(item => item.label),
        datasets: [{
          data: occupancyData.map(item => item.value),
          backgroundColor: occupancyData.map((item, idx) => window.createChartGradient ? window.createChartGradient(ctx, item.color || neonColors[idx % neonColors.length], 'ee', '33') : item.color),
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          spacing: 4,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '78%',
        animation: { animateScale: true, animateRotate: true, duration: 1200, easing: 'easeOutQuart' },
        onClick: (e, elements) => {
          if (elements && elements.length > 0) {
            const index = elements[0].index;
            const label = occupancyData[index].label;
            if (label === 'Disponíveis') {
              window.currentLeitosStatusFilter = 'Vago';
            } else {
              window.currentLeitosStatusFilter = 'Ocupado';
            }
          } else {
            window.currentLeitosStatusFilter = 'Todos';
          }
          if (typeof window.switchTab === 'function') window.switchTab('leitos');
        },
        onHover: (event) => {
          if (event.native && event.native.target) event.native.target.style.cursor = 'pointer';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18, 14, 34, 0.94)',
            titleColor: '#00f2fe',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(0, 242, 254, 0.35)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
            bodyFont: { family: 'Plus Jakarta Sans', size: 11 },
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const val = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = Math.round((val / total) * 100);
                return ` ${label}: ${val} leitos (${pct}%)`;
              }
            }
          }
        }
      }
    });
    occupancyCtx._chartInstance = inst;
  }

  // 2. Gráfico de Histórico Mensal/Semanal (Line Area Wave Neon)
  if (appointmentsCtx) {
    if (appointmentsCtx._chartInstance) appointmentsCtx._chartInstance.destroy();
    appointmentsCtx.style.cursor = 'pointer';

    const ctx2 = appointmentsCtx.getContext('2d');
    const fillGradient = ctx2.createLinearGradient(0, 0, 0, 220);
    fillGradient.addColorStop(0, 'rgba(0, 242, 254, 0.38)');
    fillGradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
    fillGradient.addColorStop(1, 'rgba(11, 8, 22, 0.0)');

    const labels = apptHistory.map(item => item.label);
    const valuesTotal = apptHistory.map(item => (item.urgencia || 0) + (item.ambulatorial || 0));
    const valuesUrgencia = apptHistory.map(item => item.urgencia || 0);

    const inst2 = new ChartClass(ctx2, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Atendimentos Totais',
            data: valuesTotal,
            fill: true,
            backgroundColor: fillGradient,
            borderColor: '#00f2fe',
            borderWidth: 3.5,
            tension: 0.4,
            pointBackgroundColor: '#00f2fe',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#00f2fe',
            pointHoverBorderWidth: 3
          },
          {
            label: 'Urgência (Triagem)',
            data: valuesUrgencia,
            fill: false,
            borderColor: '#e026b8',
            borderWidth: 2.5,
            borderDash: [5, 5],
            tension: 0.4,
            pointBackgroundColor: '#e026b8',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            pointRadius: 3.5,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1200, easing: 'easeOutQuart' },
        onClick: () => {
          if (typeof window.switchTab === 'function') window.switchTab('atendimento');
        },
        onHover: (event) => {
          if (event.native && event.native.target) event.native.target.style.cursor = 'pointer';
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: '#cbd5e1',
              font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
              usePointStyle: true,
              boxWidth: 8,
              padding: 14
            }
          },
          tooltip: {
            backgroundColor: 'rgba(18, 14, 34, 0.92)',
            titleColor: '#00f2fe',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(0, 242, 254, 0.35)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
            bodyFont: { family: 'Plus Jakarta Sans', size: 11 }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' } }
          }
        }
      }
    });
    appointmentsCtx._chartInstance = inst2;
  }

  // 3. Gráfico de Classificação de Risco Manchester (Doughnut Risco PS Dinâmico)
  const manchesterCtx = document.getElementById('manchesterChart');
  if (manchesterCtx) {
    if (manchesterCtx._chartInstance) manchesterCtx._chartInstance.destroy();
    const ctxM = manchesterCtx.getContext('2d');
    
    const isManchesterEmpty = !data.manchesterData || data.manchesterData.every(v => v === 0);
    const mData = isManchesterEmpty ? [0, 0, 0, 0, 0] : data.manchesterData;

    const manchesterEmptyMsg = document.getElementById('dashboard-manchester-empty-msg');
    if (manchesterEmptyMsg) {
      manchesterEmptyMsg.style.display = isManchesterEmpty ? 'flex' : 'none';
    }

    const instM = new ChartClass(ctxM, {
      type: 'doughnut',
      data: {
        labels: isManchesterEmpty
          ? ['Sem Atendimentos Triados']
          : ['Vermelho (Emergência)', 'Laranja (Muito Urgente)', 'Amarelo (Urgente)', 'Verde (Pouco Urgente)', 'Azul (Não Urgente)'],
        datasets: [{
          data: isManchesterEmpty ? [1] : mData,
          backgroundColor: isManchesterEmpty
            ? ['rgba(255, 255, 255, 0.05)']
            : ['#ef4444', '#f97316', '#eab308', '#10b981', '#3b82f6'].map(c => window.createChartGradient ? window.createChartGradient(ctxM, c, 'ee', '33') : c),
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          spacing: isManchesterEmpty ? 0 : 4,
          hoverOffset: isManchesterEmpty ? 0 : 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        animation: { duration: 1200, easing: 'easeOutQuart' },
        onClick: () => {
          if (typeof window.switchTab === 'function') window.switchTab('estagnacao');
        },
        onHover: (event) => {
          if (event.native && event.native.target) event.native.target.style.cursor = 'pointer';
        },
        plugins: {
          legend: {
            display: !isManchesterEmpty,
            position: 'right',
            labels: {
              color: '#cbd5e1',
              font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' },
              usePointStyle: true,
              boxWidth: 8,
              padding: 10
            }
          },
          tooltip: {
            enabled: !isManchesterEmpty,
            backgroundColor: 'rgba(18, 14, 34, 0.92)',
            titleColor: '#00f2fe',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(239, 68, 68, 0.35)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const val = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return ` ${label}: ${val} pacientes (${pct}%)`;
              }
            }
          }
        }
      }
    });
    manchesterCtx._chartInstance = instM;
  }

  // 4. Gráfico de Fluxo Kanban de Internação
  const dashboardKanbanCtx = document.getElementById('dashboardKanbanChart');
  if (dashboardKanbanCtx) {
    if (dashboardKanbanCtx._chartInstance) {
      try { dashboardKanbanCtx._chartInstance.destroy(); } catch(e) {}
    }
    
    let activeHosps = [];
    try {
      const db = (typeof localDB !== 'undefined' && localDB.list) ? localDB : (window.localDB || null);
      if (db && db.list) {
        let allHosps = db.list('hospitalizations') || [];
        const fullDB = db.getFullDB ? db.getFullDB() : {};
        const beds = fullDB.beds || (db.list('beds') || []);

        activeHosps = allHosps.filter(h => {
          const st = (h.status || '').toLowerCase().trim();
          return st !== 'alta' && st !== 'cancelado' && st !== 'finalizado' && st !== 'óbito';
        });

        // Fallback complementar: se activeHosps estiver vazio mas há leitos ocupados reais, deriva das ocupações
        if (activeHosps.length === 0 && beds.length > 0) {
          const occupiedBeds = beds.filter(b => b.status === 'Ocupado');
          if (occupiedBeds.length > 0) {
            activeHosps = occupiedBeds.map(b => {
              let sec = 'clinica_medica';
              const typeStr = (b.type || b.ward || '').toLowerCase();
              if (typeStr.includes('uti')) sec = 'uti';
              else if (typeStr.includes('cirurg')) sec = 'clinica_cirurgica';
              else if (typeStr.includes('pronto') || typeStr.includes('obs') || typeStr.includes('ps')) sec = 'pronto_socorro';
              else if (typeStr.includes('corredor')) sec = 'corredor_internacao';
              return {
                id: 'bed-hosp-' + b.id,
                patientName: b.patientName || 'Paciente Internado',
                current_sector: sec,
                status: 'Internado'
              };
            });
          }
        }
      }
    } catch(e) {
      console.warn('Erro ao carregar dados do Kanban para o dashboard:', e);
    }
    
    const sectors = [
      { id: 'pronto_socorro', label: 'PS (Obs)', color: '#3b82f6' },
      { id: 'corredor_internacao', label: 'Corredor', color: '#f59e0b' },
      { id: 'clinica_cirurgica', label: 'Cirúrgica', color: '#8b5cf6' },
      { id: 'clinica_medica', label: 'Clínica Médica', color: '#10b981' },
      { id: 'uti', label: 'UTI', color: '#ef4444' }
    ];

    const matchKanbanSector = (sectorStr, targetId) => {
      if (!sectorStr) return false;
      const s = String(sectorStr).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const t = String(targetId).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (s === t || s === t.replace(/_/g, '') || s === t.replace(/_/g, ' ')) return true;

      switch (targetId) {
        case 'pronto_socorro':
          return s.includes('pronto') || s.includes('socorro') || s === 'ps' || s.startsWith('ps') || s.includes('(ps)') || s.includes('obs');
        case 'corredor_internacao':
          return s.includes('corredor');
        case 'clinica_cirurgica':
          return s.includes('cirurg') || s.includes('cirurgia');
        case 'clinica_medica':
          return s.includes('medic') || s.includes('enferm') || s.includes('sus') || s === 'clinica';
        case 'uti':
          return s.includes('uti') || s.includes('intensiv');
        default:
          return s.includes(targetId);
      }
    };

    let sectorCounts = sectors.map(s => {
      return activeHosps.filter(h => matchKanbanSector(h.current_sector || h.sector || h.currentSector || h.ward || '', s.id)).length;
    });

    // Se data.kanbanData veio da API, utiliza como fonte prioritária
    if (data && data.kanbanData && Array.isArray(data.kanbanData.counts)) {
      sectorCounts = data.kanbanData.counts;
    }

    const totalActive = sectorCounts.reduce((acc, c) => acc + c, 0);

    // Atualizar badge no cabeçalho do card
    const kanbanTotalBadge = document.getElementById('dashboard-kanban-total-badge');
    if (kanbanTotalBadge) {
      kanbanTotalBadge.innerHTML = `<i class="fa-solid fa-bed-pulse"></i> ${totalActive} Internados`;
      kanbanTotalBadge.style.color = totalActive > 0 ? '#38bdf8' : '#94a3b8';
      kanbanTotalBadge.style.borderColor = totalActive > 0 ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.15)';
      kanbanTotalBadge.style.background = totalActive > 0 ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.05)';
    }

    // Toggle mensagem de estado vazio
    const emptyMsg = document.getElementById('dashboard-kanban-empty-msg');
    if (emptyMsg) {
      emptyMsg.style.display = totalActive === 0 ? 'flex' : 'none';
    }

    const maxCount = Math.max(...sectorCounts, 0);

    const instK = new ChartClass(dashboardKanbanCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: sectors.map(s => s.label),
        datasets: [{
          label: 'Pacientes no Kanban',
          data: sectorCounts,
          backgroundColor: sectors.map(s => window.createChartGradient ? window.createChartGradient(dashboardKanbanCtx.getContext('2d'), s.color, 'ff', '44', 300) : s.color),
          borderColor: sectors.map(s => s.color),
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: () => { if (typeof window.switchTab === 'function') window.switchTab('kanban'); },
        onHover: (event) => {
          if (event.native && event.native.target) event.native.target.style.cursor = 'pointer';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18, 14, 34, 0.94)',
            titleColor: '#818cf8',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(99, 102, 241, 0.35)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const count = context.raw || 0;
                const pct = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;
                return ` ${count} pacientes no setor (${pct}%)`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 }, precision: 0, stepSize: 1 },
            beginAtZero: true,
            suggestedMax: Math.max(5, maxCount + 1)
          }
        }
      }
    });
    dashboardKanbanCtx._chartInstance = instK;
  }

  initInteractiveFunnel(data.funnelData);
}

export async function renderDashboardTab(contentArea) {
  if (!state.dashboardData || !state.dashboardData.occupancyData) {
    contentArea.innerHTML = `
      <div class="skeleton-content" style="padding: 0;">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>
    `;
  }
  await fetchDashboardData();
  
  const data = state.dashboardData;
  contentArea.innerHTML = `
    <div class="tab-section active">
      <!-- KPI Cards Grid -->
      <div class="kpi-grid">
        <!-- Card Ocupação -->
        <div class="kpi-card interactive-card" id="dash-card-patients" onclick="handleCardClick('pacientes', null, 'Atalho: Abrindo lista de Pacientes Ativos')" title="Clique para ver a lista de Pacientes">
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
        <div class="kpi-card interactive-card" id="dash-card-triage" onclick="handleCardClick('atendimento', null, 'Atalho: Acessando Fila de Triagem')" title="Clique para ir à Fila de Triagem">
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
        <div class="kpi-card interactive-card" id="dash-card-revenue" onclick="handleCardClick('relatorios', 'tab-btn-financial', 'Atalho: Gerando Relatório Financeiro')" title="Clique para ver o Relatório Financeiro">
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

      <!-- Seção de Gráficos Interativos (Layout Híbrido Neon Glass) -->
      <div class="charts-grid">
        <!-- Card 1: FUNIL DE ATENDIMENTO HOSPITALAR -->
        <div class="chart-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <h4 class="chart-card-title" style="margin-bottom: 0;">
              <i class="fa-solid fa-filter" style="color: #3b82f6;"></i> Funil de Atendimento Hospitalar
            </h4>
            <div style="display: flex; gap: 6px;">
              <button class="funnel-period-pill active" data-period="hoje">Hoje</button>
              <button class="funnel-period-pill" data-period="semana">Semana</button>
              <button class="funnel-period-pill" data-period="mes">Mês</button>
            </div>
          </div>

          <div class="funnel-card-body">
            <div class="funnel-wrapper">
              <div class="funnel-stage funnel-stage-1" data-target-tab="atendimento" data-stage-name="Recepção" title="Clique para ver os Pacientes na Recepção (1.250)">
                <i class="fa-solid fa-users" style="margin-right: 6px;"></i> <span id="funnel-num-1">1.250 (100%)</span>
              </div>
              <div class="funnel-stage funnel-stage-2" data-target-tab="estagnacao" data-stage-name="Triagem Manchester" title="Clique para ver os Pacientes Triados (1.080)">
                <i class="fa-solid fa-clipboard-check" style="margin-right: 6px;"></i> <span id="funnel-num-2">1.080 (86,4%)</span>
              </div>
              <div class="funnel-stage funnel-stage-3" data-target-tab="consultorios" data-stage-name="Consultórios" title="Clique para ver os Consultórios (890)">
                <i class="fa-solid fa-user-doctor" style="margin-right: 6px;"></i> <span id="funnel-num-3">890 (71,2%)</span>
              </div>
              <div class="funnel-stage funnel-stage-4" data-target-tab="farmacia" data-stage-name="Exames / Medicação" title="Clique para ver a Farmácia (420)">
                <i class="fa-solid fa-vial" style="margin-right: 6px;"></i> <span id="funnel-num-4">420 (33,6%)</span>
              </div>
              <div class="funnel-stage funnel-stage-5" data-target-tab="relatorios" data-stage-name="Alta Médica" title="Clique para ver Relatório de Altas (385)">
                <i class="fa-solid fa-circle-check" style="margin-right: 6px;"></i> <span id="funnel-num-5">385 (30,8%)</span>
              </div>
            </div>

            <div class="funnel-legend-list">
              <div class="funnel-legend-item" data-target-tab="atendimento" data-stage-name="Recepção">
                <span style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center;">
                  <span class="funnel-dot" style="background: #3b82f6; color: #3b82f6;"></span> Recepção / Entrada
                </span>
                <span style="font-weight: 700; color: #ffffff; font-size: 0.85rem;"><span id="funnel-leg-1">1.250</span> <small style="color: #3b82f6; font-size: 0.72rem;">100%</small></span>
              </div>
              <div class="funnel-legend-item" data-target-tab="estagnacao" data-stage-name="Triagem Manchester">
                <span style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center;">
                  <span class="funnel-dot" style="background: #10b981; color: #10b981;"></span> Triados Manchester
                </span>
                <span style="font-weight: 700; color: #ffffff; font-size: 0.85rem;"><span id="funnel-leg-2">1.080</span> <small style="color: #10b981; font-size: 0.72rem;">86,4%</small></span>
              </div>
              <div class="funnel-legend-item" data-target-tab="consultorios" data-stage-name="Consultórios">
                <span style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center;">
                  <span class="funnel-dot" style="background: #f59e0b; color: #f59e0b;"></span> Atendidos Consultório
                </span>
                <span style="font-weight: 700; color: #ffffff; font-size: 0.85rem;"><span id="funnel-leg-3">890</span> <small style="color: #f59e0b; font-size: 0.72rem;">71,2%</small></span>
              </div>
              <div class="funnel-legend-item" data-target-tab="farmacia" data-stage-name="Exames / Medicação">
                <span style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center;">
                  <span class="funnel-dot" style="background: #f97316; color: #f97316;"></span> Exames & Medicação
                </span>
                <span style="font-weight: 700; color: #ffffff; font-size: 0.85rem;"><span id="funnel-leg-4">420</span> <small style="color: #f97316; font-size: 0.72rem;">33,6%</small></span>
              </div>
              <div class="funnel-legend-item" data-target-tab="relatorios" data-stage-name="Alta Médica">
                <span style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: center;">
                  <span class="funnel-dot" style="background: #34d399; color: #34d399;"></span> Alta / Resolvidos
                </span>
                <span style="font-weight: 700; color: #ffffff; font-size: 0.85rem;"><span id="funnel-leg-5">385</span> <small style="color: #34d399; font-size: 0.72rem;">30,8%</small></span>
              </div>
            </div>
          </div>

          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700;">Taxa de Resolutividade Final</div>
              <div style="font-size: 1.25rem; font-weight: 800; color: #34d399; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-arrow-trend-up"></i> <span id="funnel-res-rate">30,8%</span>
              </div>
            </div>
            <div style="text-align: right; width: 45%;">
              <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 4px;">Meta: <strong>35,0%</strong> <span style="color: #34d399; font-size: 0.7rem;" id="funnel-goal-text">(88% da meta)</span></div>
              <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden;">
                <div id="funnel-goal-bar" style="width: 88%; height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 10px; transition: width 0.4s ease;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 2: Ocupação Híbrida de Leitos -->
        <div class="chart-card hybrid-occupancy-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <h4 class="chart-card-title" style="margin-bottom: 0;">
              <i class="fa-solid fa-bed-pulse" style="color: var(--color-primary);"></i> Ocupação de Leitos por Ala
            </h4>
            <span id="occupancy-total-badge" class="badge-status-pill" style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(129, 140, 248, 0.35); color: #818cf8; font-weight: 700; padding: 4px 11px; border-radius: 20px; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-chart-line"></i> 82% Ocupado
            </span>
          </div>

          <div class="hybrid-occupancy-body">
            <div class="doughnut-center-wrap">
              <div class="chart-container-donut">
                <canvas id="occupancyChart"></canvas>
              </div>
              <div class="donut-center-kpi">
                <span id="donut-center-percentage" class="donut-kpi-num">82%</span>
                <span class="donut-kpi-label">Ocupação Geral</span>
              </div>
            </div>

            <div id="ward-progress-list" class="ward-progress-list"></div>
          </div>
        </div>

        <!-- Card 3: Classificação de Risco Manchester -->
        <div class="chart-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <h4 class="chart-card-title" style="margin-bottom: 0;">
              <i class="fa-solid fa-shield-halved" style="color: #ef4444;"></i> Risco Manchester (Gravidade)
            </h4>
            <span class="badge-status-pill" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; font-weight: 700; padding: 4px 11px; border-radius: 20px; font-size: 0.78rem;">
              <i class="fa-solid fa-triangle-exclamation"></i> Triagem PS
            </span>
          </div>
          <div class="chart-container" style="height: 240px; position: relative;">
            <canvas id="manchesterChart"></canvas>
            <div id="dashboard-manchester-empty-msg" style="display: none; position: absolute; inset: 0; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: rgba(15, 23, 42, 0.75); border-radius: 8px; backdrop-filter: blur(4px);">
              <i class="fa-solid fa-shield-halved" style="font-size: 2rem; color: #f87171; margin-bottom: 8px; opacity: 0.8;"></i>
              <p style="margin: 0; font-size: 0.9rem; color: #f8fafc; font-weight: 600;">Nenhum paciente classificado</p>
              <span style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">Aguardando atendimentos na Triagem Manchester</span>
            </div>
          </div>
        </div>

        <!-- Card 4: Histórico de Atendimentos Mensais -->
        <div class="chart-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <h4 class="chart-card-title" style="margin-bottom: 0;">
              <i class="fa-solid fa-chart-line" style="color: var(--color-accent);"></i> Histórico de Atendimentos Mensais
            </h4>
            <span class="badge-status-pill" style="background: rgba(0, 242, 254, 0.15); border: 1px solid rgba(0, 242, 254, 0.35); color: #00f2fe; font-weight: 700; padding: 4px 11px; border-radius: 20px; font-size: 0.78rem;">
              <i class="fa-solid fa-calendar-days"></i> Mês Atual
            </span>
          </div>
          <div class="chart-container" style="height: 240px;">
            <canvas id="appointmentsChart"></canvas>
          </div>
        </div>

        <!-- Card 5: Kanban de Internação -->
        <div class="chart-card" onclick="if(typeof window.switchTab==='function') window.switchTab('kanban')" style="grid-column: 1 / -1; cursor: pointer; transition: transform 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform='none'" title="Clique para abrir a aba Kanban de Internação">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <h4 class="chart-card-title" style="margin-bottom: 0;">
              <i class="fa-solid fa-table-columns" style="color: #6366f1;"></i> Fluxo Kanban de Internação
            </h4>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="dashboard-kanban-total-badge" class="badge-status-pill" style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.35); color: #818cf8; font-weight: 700; padding: 4px 11px; border-radius: 20px; font-size: 0.78rem;">
                <i class="fa-solid fa-bed-pulse"></i> Calculando...
              </span>
              <span class="badge-status-pill" style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.35); color: #818cf8; font-weight: 700; padding: 4px 11px; border-radius: 20px; font-size: 0.78rem;">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver Kanban
              </span>
            </div>
          </div>
          <div class="chart-container" style="height: 240px; position: relative;">
            <canvas id="dashboardKanbanChart"></canvas>
            <div id="dashboard-kanban-empty-msg" style="display: none; position: absolute; inset: 0; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: rgba(15, 23, 42, 0.75); border-radius: 8px; backdrop-filter: blur(4px);">
              <i class="fa-solid fa-bed-pulse" style="font-size: 2rem; color: #818cf8; margin-bottom: 8px; opacity: 0.8;"></i>
              <p style="margin: 0; font-size: 0.9rem; color: #f8fafc; font-weight: 600;">Nenhum paciente internado no momento</p>
              <span style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">Clique para abrir a aba Kanban e gerenciar o fluxo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    initDashboardCharts(data);
  }, 50);
  setTimeout(() => {
    initDashboardCharts(data);
    if (typeof window.ensureSmartFlowGuideMounted === 'function') {
      window.ensureSmartFlowGuideMounted('dashboard');
    }
  }, 220);
}
