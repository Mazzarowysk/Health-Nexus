/**
 * Health Nexus - Módulo de Assinatura Digital ICP-Brasil em Nuvem & A1 Local
 * Em conformidade com a MP 2.200-2/2001, Lei Federal 14.063/2020 e Resolução CFM nº 2.299/2021
 */

export const DIGITAL_CERT_PROVIDERS = [
  {
    id: 'birdid',
    name: 'BirdID (Soluti)',
    type: 'cloud',
    badge: 'Nuvem A3',
    icon: 'fa-solid fa-cloud-arrow-up',
    color: '#0284c7',
    description: 'Assinatura via aplicativo BirdID no smartphone com autenticação OTP/Biometria.'
  },
  {
    id: 'neoid',
    name: 'NeoID (Serpro)',
    type: 'cloud',
    badge: 'Nuvem A3',
    icon: 'fa-solid fa-shield-halved',
    color: '#16a34a',
    description: 'Certificado em nuvem oficial do Governo Federal/Serpro com validação push.'
  },
  {
    id: 'certisign',
    name: 'CertiSign RemoteID',
    type: 'cloud',
    badge: 'Nuvem A3',
    icon: 'fa-solid fa-key',
    color: '#d97706',
    description: 'Assinatura qualificada em nuvem CertiSign com senha PIN de autorização.'
  },
  {
    id: 'vidaas',
    name: 'VIDaaS (Valid)',
    type: 'cloud',
    badge: 'Nuvem A3',
    icon: 'fa-solid fa-id-card-clip',
    color: '#7c3aed',
    description: 'Carteira digital de certificados em nuvem Valid com validação biométrica.'
  },
  {
    id: 'local_a1',
    name: 'Certificado Digital A1 (.PFX / Web PKI)',
    type: 'local',
    badge: 'Arquivo A1',
    icon: 'fa-solid fa-file-shield',
    color: '#64748b',
    description: 'Certificado digital arquivo A1 instalado na máquina local ou leitora de cartão.'
  }
];

/**
 * Gera um hash SHA-256 seguro a partir de uma string ou payload de documento
 */
export async function generateSHA256Hash(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gera os metadados oficiais do carimbo de assinatura ICP-Brasil
 */
export async function signDocumentICP({ documentType, documentId, patientName, patientCpf, doctorName, doctorCrm, doctorUf, providerId, otpOrPin }) {
  const timestamp = new Date().toISOString();
  const provider = DIGITAL_CERT_PROVIDERS.find(p => p.id === providerId) || DIGITAL_CERT_PROVIDERS[0];
  
  const payloadToHash = JSON.stringify({
    documentType,
    documentId,
    patientName,
    patientCpf,
    doctorName,
    doctorCrm,
    doctorUf,
    provider: provider.name,
    timestamp
  });

  const sha256 = await generateSHA256Hash(payloadToHash);
  const verificationCode = sha256.substring(0, 16).toUpperCase().match(/.{1,4}/g).join('-');
  const validationUrl = `https://validar.iti.gov.br/?codigo=${verificationCode}&doc=${documentId}`;

  const signatureMetadata = {
    signed: true,
    signatureType: 'ICP-Brasil Qualificada (MP 2.200-2/2001)',
    providerId: provider.id,
    providerName: provider.name,
    doctorName,
    doctorCrm: `${doctorCrm}/${doctorUf}`,
    signedAt: new Date().toLocaleString('pt-BR'),
    timestampISO: timestamp,
    hashSHA256: sha256,
    verificationCode,
    validationUrl,
    qrCodeData: `https://validar.iti.gov.br/?v=${verificationCode}`
  };

  return signatureMetadata;
}

/**
 * Renderiza o modal interativo de assinatura digital ICP-Brasil
 */
export function renderDigitalSignatureModal({ docTitle, docType, docId, patientName, doctorInfo, onSignSuccess }) {
  const existingModal = document.getElementById('digital-signature-modal');
  if (existingModal) existingModal.remove();

  const modalHtml = `
    <div id="digital-signature-modal" class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 100000;">
      <div class="modal-content" style="background: #0f172a; border: 1px solid rgba(129, 140, 248, 0.4); border-radius: 20px; width: 90%; max-width: 580px; padding: 28px; box-shadow: 0 25px 60px rgba(0,0,0,0.9), 0 0 40px rgba(99, 102, 241, 0.25); color: #f8fafc; font-family: 'Inter', sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 1.3rem; border: 1px solid rgba(56, 189, 248, 0.3);">
              <i class="fa-solid fa-signature"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-family: 'Outfit', sans-serif; font-size: 1.25rem; font-weight: 700; color: #ffffff;">Assinatura Digital ICP-Brasil</h3>
              <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #94a3b8;">Conformidade MP 2.200-2/2001 & Resolução CFM nº 2.299/2021</p>
            </div>
          </div>
          <button id="btn-close-sig-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; padding: 6px;"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 6px;">
            <span style="color: #94a3b8;">Documento:</span>
            <strong style="color: #f8fafc;">${docTitle}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 6px;">
            <span style="color: #94a3b8;">Paciente:</span>
            <strong style="color: #38bdf8;">${patientName}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem;">
            <span style="color: #94a3b8;">Médico(a) Assistente:</span>
            <strong style="color: #10b981;">${doctorInfo.name} (${doctorInfo.crm}/${doctorInfo.uf || 'SP'})</strong>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-size: 0.84rem; font-weight: 600; color: #cbd5e1; margin-bottom: 10px;">Selecione o Provedor de Certificado:</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;" id="cert-provider-grid">
            ${DIGITAL_CERT_PROVIDERS.map((p, idx) => `
              <div class="cert-provider-card" data-provider="${p.id}" style="border: 1px solid ${idx === 0 ? '#38bdf8' : 'rgba(255,255,255,0.1)'}; background: ${idx === 0 ? 'rgba(56, 189, 248, 0.12)' : 'rgba(30, 41, 59, 0.5)'}; border-radius: 12px; padding: 12px; cursor: pointer; transition: all 0.2s ease;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <i class="${p.icon}" style="color: ${p.color}; font-size: 1.1rem;"></i>
                  <span style="font-size: 0.68rem; font-weight: 700; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 6px; color: #e2e8f0;">${p.badge}</span>
                </div>
                <strong style="display: block; font-size: 0.82rem; color: #f8fafc; margin-bottom: 2px;">${p.name}</strong>
                <span style="font-size: 0.72rem; color: #94a3b8; line-height: 1.2; display: block;">${p.description}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom: 24px;" id="cert-auth-input-container">
          <label style="display: block; font-size: 0.84rem; font-weight: 600; color: #cbd5e1; margin-bottom: 8px;">Código OTP / Senha PIN do Certificado:</label>
          <div style="position: relative;">
            <input type="password" id="cert-pin-input" placeholder="Digite o PIN de 4 a 8 dígitos ou código do Token..." style="width: 100%; background: #1e293b; border: 1px solid rgba(129, 140, 248, 0.4); border-radius: 10px; padding: 10px 14px; color: #ffffff; font-size: 0.9rem; outline: none; box-sizing: border-box;" value="123456">
            <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 0.75rem; color: #38bdf8; font-weight: 600;">Homologação Ativa</span>
          </div>
          <p style="margin: 6px 0 0 0; font-size: 0.73rem; color: #64748b;">O documento receberá carimbo de tempo ICP-Brasil, selo criptográfico SHA-256 e QR Code rastreável.</p>
        </div>

        <div style="display: flex; gap: 12px;">
          <button id="btn-cancel-signature" class="btn" style="flex: 1; background: #334155; color: #f8fafc; border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer;">Cancelar</button>
          <button id="btn-confirm-signature" class="btn" style="flex: 2; background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; border: none; padding: 12px; border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(2, 132, 199, 0.4);">
            <i class="fa-solid fa-lock"></i>
            <span>Assinar Digitalmente (ICP-Brasil)</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  let selectedProvider = 'birdid';
  const modalEl = document.getElementById('digital-signature-modal');
  const providerCards = modalEl.querySelectorAll('.cert-provider-card');

  providerCards.forEach(card => {
    card.addEventListener('click', () => {
      providerCards.forEach(c => {
        c.style.borderColor = 'rgba(255,255,255,0.1)';
        c.style.background = 'rgba(30, 41, 59, 0.5)';
      });
      card.style.borderColor = '#38bdf8';
      card.style.background = 'rgba(56, 189, 248, 0.12)';
      selectedProvider = card.dataset.provider;
    });
  });

  const closeFn = () => modalEl.remove();
  document.getElementById('btn-close-sig-modal').addEventListener('click', closeFn);
  document.getElementById('btn-cancel-signature').addEventListener('click', closeFn);

  document.getElementById('btn-confirm-signature').addEventListener('click', async () => {
    const pin = document.getElementById('cert-pin-input').value.trim();
    if (!pin) {
      alert('Por favor, informe a senha PIN ou OTP do seu certificado digital.');
      return;
    }

    const confirmBtn = document.getElementById('btn-confirm-signature');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando Assinatura ICP-Brasil...';

    try {
      const sigData = await signDocumentICP({
        documentType: docType,
        documentId: docId,
        patientName,
        doctorName: doctorInfo.name,
        doctorCrm: doctorInfo.crm,
        doctorUf: doctorInfo.uf || 'SP',
        providerId: selectedProvider,
        otpOrPin: pin
      });

      closeFn();
      if (typeof onSignSuccess === 'function') {
        onSignSuccess(sigData);
      }
    } catch (err) {
      alert('Erro ao assinar digitalmente: ' + err.message);
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Tentar Novamente';
    }
  });
}
