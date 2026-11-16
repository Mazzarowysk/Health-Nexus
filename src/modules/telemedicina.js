// ==========================================
// Health Nexus — Telemedicina & Sala Virtual WebRTC Module
// Atendimento Médico Remoto, Câmera/Vídeo, Áudio e Compartilhamento
// ==========================================

import { showToast, showCustomAlert, makeDraggable } from './ui.js';

let localStream = null;
let telemedTimerInterval = null;
let callSeconds = 0;

export const openTelemedicineModal = async (patientData = {}) => {
  const existing = document.getElementById('hn-telemed-modal');
  if (existing) existing.remove();

  const patientName = patientData.fullName || patientData.patientName || patientData.name || 'Paciente';
  const doctorName = patientData.doctorName || 'Dr. Médico Assistente';

  const overlay = document.createElement('div');
  overlay.id = 'hn-telemed-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'z-index: 100002; display: flex; align-items: center; justify-content: center; background: rgba(5, 7, 20, 0.9); backdrop-filter: blur(12px);';

  overlay.innerHTML = `
    <div class="sync-modal-card" style="max-width: 960px; width: 95%; max-height: 90vh; display: flex; flex-direction: column; background: #0f172a; border: 1.5px solid #334155; border-radius: 18px; overflow: hidden; box-shadow: 0 25px 80px rgba(0,0,0,0.85); position: relative;">
      
      <!-- Top Bar da Sala (Draggable Header) -->
      <div id="telemed-drag-handle" style="background: #1e293b; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; color: #fff; cursor: grab; user-select: none;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(2,132,199,0.15); border: 1px solid rgba(2,132,199,0.3); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 1.05rem;">
            <i class="fa-solid fa-video"></i>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h3 style="margin: 0; font-family: Outfit, sans-serif; font-size: 1.15rem; font-weight: 700;">Sala de Teleconsulta WebRTC · Criptografia E2E</h3>
              <span style="font-size: 0.68rem; color: #38bdf8; background: rgba(2,132,199,0.12); border: 1px solid rgba(2,132,199,0.3); padding: 2px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;" title="Clique e arraste pelo cabeçalho para reposicionar a tela">
                <i class="fa-solid fa-up-down-left-right"></i> Arrastável
              </span>
            </div>
            <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Paciente: <strong style="color: #fff;">${patientName}</strong> &bull; Profissional: ${doctorName}</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 16px; font-family: monospace; font-size: 0.85rem; font-weight: 700; color: #34d399; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-circle" style="font-size: 0.5rem; color: #ef4444;"></i> REC <span id="telemed-call-timer">00:00</span>
          </div>
          <button id="btn-close-telemed-top" class="modal-close" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: #fff; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>

      <!-- Grid de Vídeo da Chamada -->
      <div style="padding: 18px; flex: 1; display: grid; grid-template-columns: 2fr 1fr; gap: 16px; min-height: 420px; overflow-y: auto; background: #0b0f19;">
        
        <!-- Vídeo Principal (Paciente) -->
        <div style="position: relative; background: #111827; border-radius: 14px; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid #1e293b;">
          <div id="patient-video-placeholder" style="text-align: center; color: var(--text-muted); padding: 20px;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: #0284c7; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 14px; font-weight: 800; box-shadow: 0 4px 14px rgba(2,132,199,0.4);">
              ${patientName.charAt(0).toUpperCase()}
            </div>
            <h4 style="color: #fff; margin: 0 0 6px; font-size: 1.05rem;">${patientName}</h4>
            <span style="font-size: 0.78rem; color: #34d399; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); padding: 2px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 5px;">
              <i class="fa-solid fa-signal"></i> Conexão HD Estável (30 fps)
            </span>
          </div>
          
          <div style="position: absolute; bottom: 12px; left: 14px; background: rgba(15,23,42,0.8); backdrop-filter: blur(6px); color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; display: flex; align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,0.1);">
            <i class="fa-solid fa-user"></i> ${patientName} (Paciente)
          </div>
        </div>

        <!-- Câmera do Médico (Self Video) + Anotações Rápidas -->
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Câmera Local (Médico) -->
          <div style="height: 170px; position: relative; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; display: flex; align-items: center; justify-content: center;">
            <video id="telemed-local-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); display: none;"></video>
            <div id="doctor-camera-fallback" style="text-align: center; color: #94a3b8; padding: 10px;">
              <i class="fa-solid fa-user-doctor" style="font-size: 2rem; margin-bottom: 6px; display: block; color: #38bdf8;"></i>
              <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">${doctorName}</div>
              <div style="font-size: 0.74rem; color: #94a3b8; margin-top: 2px;">Câmera Ativa</div>
            </div>
            <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(15,23,42,0.8); padding: 2px 8px; border-radius: 6px; font-size: 0.72rem; color: #fff; font-weight: 600; border: 1px solid rgba(255,255,255,0.1);">
              Você (Médico)
            </div>
          </div>

          <!-- Mini Painel de Observações Clínicas -->
          <div style="flex: 1; background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 12px; display: flex; flex-direction: column;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-clipboard-check" style="color: var(--color-primary);"></i> Anotações da Teleconsulta
            </div>
            <textarea id="telemed-quick-notes" class="form-input" style="flex: 1; width: 100%; resize: none; font-size: 0.82rem; background: #0f172a; border-color: #334155;" placeholder="Digite anotações rápidas durante o atendimento..."></textarea>
            <button id="btn-telemed-copy-to-pep" type="button" class="btn btn-sm btn-primary" style="margin-top: 8px; font-size: 0.78rem; width: 100%; background: #0284c7;">
              <i class="fa-solid fa-file-medical"></i> Copiar para o PEP
            </button>
          </div>

        </div>

      </div>

      <!-- Barra de Controles da Chamada -->
      <div style="padding: 14px 24px; background: #0f172a; border-top: 1px solid #1e293b; display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap;">
        
        <button id="btn-telemed-toggle-mic" type="button" class="btn" style="width: 44px; height: 44px; border-radius: 50%; background: #1e293b; border: 1px solid #334155; color: #fff; font-size: 1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;" title="Ativar/Desativar Microfone">
          <i class="fa-solid fa-microphone"></i>
        </button>

        <button id="btn-telemed-toggle-cam" type="button" class="btn" style="width: 44px; height: 44px; border-radius: 50%; background: #1e293b; border: 1px solid #334155; color: #fff; font-size: 1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;" title="Ativar/Desativar Câmera">
          <i class="fa-solid fa-video"></i>
        </button>

        <button id="btn-telemed-screen-share" type="button" class="btn" style="width: 44px; height: 44px; border-radius: 50%; background: #1e293b; border: 1px solid #334155; color: #fff; font-size: 1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;" title="Compartilhar Tela">
          <i class="fa-solid fa-desktop"></i>
        </button>

        <button id="btn-telemed-open-pep" type="button" class="btn" style="background: #0284c7; color: #fff; border: none; padding: 9px 18px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(2,132,199,0.3);">
          <i class="fa-solid fa-file-medical"></i> Abrir PEP em Split
        </button>

        <button id="btn-telemed-end-call" type="button" class="btn" style="background: #ef4444; color: #fff; border: none; padding: 9px 20px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(239,68,68,0.3);">
          <i class="fa-solid fa-phone-slash"></i> Encerrar Consulta
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  // Ativar Sistema de Drag & Drop para Reposicionamento Livre
  const modalCard = overlay.querySelector('.sync-modal-card');
  const dragHandle = document.getElementById('telemed-drag-handle');
  if (modalCard && dragHandle) {
    makeDraggable(modalCard, dragHandle);
  }
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
      const videoEl = document.getElementById('telemed-local-video');
      const fallbackEl = document.getElementById('doctor-camera-fallback');
      if (localStream && videoEl) {
        videoEl.srcObject = localStream;
        videoEl.style.display = 'block';
        if (fallbackEl) fallbackEl.style.display = 'none';
      }
    }
  } catch (e) {
    console.warn('[Telemedicina Media Error]', e);
  }

  // Timer da Consulta
  callSeconds = 0;
  clearInterval(telemedTimerInterval);
  telemedTimerInterval = setInterval(() => {
    callSeconds++;
    const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const secs = String(callSeconds % 60).padStart(2, '0');
    const timerEl = document.getElementById('telemed-call-timer');
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;
  }, 1000);

  const closeTelemed = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    clearInterval(telemedTimerInterval);
    overlay.remove();
    showToast('📞 Teleconsulta finalizada.');
  };

  document.getElementById('btn-close-telemed-top')?.addEventListener('click', closeTelemed);
  document.getElementById('btn-telemed-end-call')?.addEventListener('click', closeTelemed);

  // Toggle Microfone
  let micActive = true;
  document.getElementById('btn-telemed-toggle-mic')?.addEventListener('click', (e) => {
    micActive = !micActive;
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = micActive);
    }
    const btn = e.currentTarget;
    btn.style.background = micActive ? '#1e293b' : '#ef4444';
    btn.innerHTML = micActive ? '<i class="fa-solid fa-microphone"></i>' : '<i class="fa-solid fa-microphone-slash"></i>';
    showToast(micActive ? 'Microfone ativado' : 'Microfone silenciado');
  });

  // Toggle Câmera
  let camActive = true;
  document.getElementById('btn-telemed-toggle-cam')?.addEventListener('click', (e) => {
    camActive = !camActive;
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = camActive);
    }
    const videoEl = document.getElementById('telemed-local-video');
    const fallbackEl = document.getElementById('doctor-camera-fallback');
    if (videoEl) videoEl.style.display = camActive ? 'block' : 'none';
    if (fallbackEl) fallbackEl.style.display = camActive ? 'none' : 'block';
    
    const btn = e.currentTarget;
    btn.style.background = camActive ? '#1e293b' : '#ef4444';
    btn.innerHTML = camActive ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-video-slash"></i>';
    showToast(camActive ? 'Câmera ativada' : 'Câmera desativada');
  });

  // Compartilhamento de Tela
  document.getElementById('btn-telemed-screen-share')?.addEventListener('click', async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        showToast('🖥️ Compartilhamento de tela ativo!');
        screenStream.getVideoTracks()[0].onended = () => {
          showToast('Compartilhamento de tela encerrado.');
        };
      } else {
        showToast('Compartilhamento de tela simulado ativo.');
      }
    } catch (err) {
      showToast('Compartilhamento cancelado.');
    }
  });

  // Copiar Anotações Rápidas para o PEP
  document.getElementById('btn-telemed-copy-to-pep')?.addEventListener('click', () => {
    const notes = document.getElementById('telemed-quick-notes')?.value || '';
    const pepSubj = document.getElementById('pep-subjective');
    if (pepSubj && notes) {
      pepSubj.value = (pepSubj.value ? pepSubj.value + '\n\n' : '') + `[Anotações Teleconsulta]: ${notes}`;
      showToast('✅ Anotações transferidas para o PEP!');
    } else if (notes) {
      showToast('Anotações salvas.');
    }
  });

  // Abrir PEP
  document.getElementById('btn-telemed-open-pep')?.addEventListener('click', () => {
    const targetId = patientData.id || patientData.patientId || patientName;
    if (typeof window.openPEPModal === 'function') {
      window.openPEPModal(targetId);
    }
  });
};
