import { apiFetch, showToast, abbreviateName, switchTab, setupCustomSelect, anonymizeCPF, exportToPDF, formatSyncDate, showCustomAlert, renderTabContent, cachedApiGet, getRolePermissions, loadConsultingRooms, openRoomModal, deleteRoom, saveRoom } from '../main.js';
import { state, dataCache, dataCacheTimestamps } from '../state.js';

async function renderConsultingRoomsTab() {
  const contentArea = document.getElementById('main-content');
  contentArea.innerHTML = `
    <div class="tab-section active">
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0;"><i class="fa-solid fa-door-open" style="color: var(--primary);"></i> Painel de Consultórios</h2>
        <button id="btn-new-room" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Novo Consultório</button>
      </div>

      <div id="rooms-dashboard" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
        <div style="text-align: center; grid-column: 1 / -1; padding: 40px;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--color-primary);"></i>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-new-room').addEventListener('click', () => openRoomModal());
  await loadConsultingRooms();
}
window.renderConsultingRoomsTab = renderConsultingRoomsTab;
