import os

file_path = 'src/tabs/kanban.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add kanbanChartInstance
if 'let kanbanChartInstance = null;' not in content:
    content = content.replace("let currentFilter = 'all';", "let currentFilter = 'all';\nlet kanbanChartInstance = null;")

# 2. Add chart layout
old_grid = """      <div style="display:grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; flex-shrink:0;">
        ${filtersHtml}
      </div>"""

new_grid = """      <!-- Chart Area & Filters -->
      <div style="display:flex; gap: 16px; margin-bottom: 20px; flex-shrink:0; flex-wrap:wrap;">
        
        <!-- Kanban Overview Chart -->
        <div class="kanban-chart-card" style="flex: 1; min-width: 250px; max-width: 300px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.1); display: flex; flex-direction: column; position: relative;">
          <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin: 0 0 10px 0; text-align: center;"><i class="fa-solid fa-chart-pie" style="color: var(--color-primary); margin-right: 6px;"></i> Distribuição Geral</h4>
          <div style="flex-grow: 1; position: relative; height: 160px;">
            <canvas id="kanbanSectorChart"></canvas>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;">
              <span id="kanban-chart-center-val" style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">0</span>
              <br>
              <span style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Pacientes</span>
            </div>
          </div>
        </div>

        <!-- Filters Grid -->
        <div style="flex: 3; display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px;">
          ${filtersHtml}
        </div>
      </div>"""

if old_grid in content:
    content = content.replace(old_grid, new_grid)

# 3. Add init call
old_setup = """  }).join('');
  setupDND();
}"""
new_setup = """  }).join('');
  setupDND();
  setTimeout(() => initKanbanChart(active), 50);
}"""

if old_setup in content:
    content = content.replace(old_setup, new_setup)

# 4. Add initKanbanChart implementation
init_func = """
function initKanbanChart(activePatients) {
  const ChartClass = window.Chart || (typeof Chart !== 'undefined' ? Chart : null);
  if (!ChartClass) return;

  const ctx = document.getElementById('kanbanSectorChart');
  if (!ctx) return;

  if (kanbanChartInstance) {
    kanbanChartInstance.destroy();
  }

  const dataMap = {};
  KANBAN_COLUMNS.forEach(col => dataMap[col.id] = 0);
  activePatients.forEach(p => {
    if (dataMap[p.current_sector] !== undefined) {
      dataMap[p.current_sector]++;
    }
  });

  const labels = KANBAN_COLUMNS.map(c => c.shortLabel);
  const data = KANBAN_COLUMNS.map(c => dataMap[c.id]);
  const bgColors = KANBAN_COLUMNS.map(c => c.color);

  const centerVal = document.getElementById('kanban-chart-center-val');
  if (centerVal) {
    centerVal.textContent = activePatients.length;
  }

  kanbanChartInstance = new ChartClass(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: bgColors,
        borderWidth: 2,
        borderColor: 'rgba(11, 8, 22, 0.95)',
        borderRadius: 4,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(18, 14, 34, 0.94)',
          titleColor: '#00f2fe',
          bodyColor: '#f8fafc',
          borderColor: 'rgba(0, 242, 254, 0.35)',
          borderWidth: 1,
          padding: 8,
          usePointStyle: true,
          callbacks: {
            label: function(context) {
              return ` ${context.raw} pacientes`;
            }
          }
        }
      }
    }
  });
}
"""

if 'function initKanbanChart' not in content:
    content += init_func

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Modification complete.")
