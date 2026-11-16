// ─── MÓDULO DE REAL-TIME PUSH COM SERVER-SENT EVENTS (SSE) ──────────────────────
// Sincroniza instantaneamente chamadas do Painel TV, filas de triagem e consultórios

class RealtimeHub {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000;
    this.isConnected = false;
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    // Escutar eventos locais de Storage para redundância multi-abas no mesmo navegador
    window.addEventListener('storage', (e) => {
      if (e.key === 'nexus_realtime_event' && e.newValue) {
        try {
          const { type, payload } = JSON.parse(e.newValue);
          this.emit(type, payload, false);
        } catch (err) {}
      }
    });

    this.connect();
  }

  connect() {
    if (typeof EventSource === 'undefined') {
      console.warn('[RealtimeHub] EventSource não suportado neste navegador. Utilizando fallback local.');
      return;
    }

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource('/api/events');

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('[RealtimeHub] 🟢 Conectado ao canal de eventos SSE em tempo real.');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type) {
            this.emit(data.type, data.payload, false);
          }
        } catch (err) {
          console.warn('[RealtimeHub] Mensagem recebida inválida:', event.data);
        }
      };

      this.eventSource.onerror = (err) => {
        this.isConnected = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        // Reconexão com backoff exponencial
        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), delay);
      };
    } catch (e) {
      console.warn('[RealtimeHub] Falha ao iniciar EventSource:', e);
    }
  }

  // Inscrever-se em um tipo de evento (ex: 'tv_call', 'encounter_updated', 'patient_admitted')
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
    return () => this.off(type, callback);
  }

  off(type, callback) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(callback);
    }
  }

  // Emitir evento localmente e propagar para outras abas
  emit(type, payload, broadcastLocal = true) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[RealtimeHub] Erro no listener do evento ${type}:`, err);
        }
      });
    }

    if (broadcastLocal && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          'nexus_realtime_event',
          JSON.stringify({ type, payload, timestamp: Date.now() })
        );
      } catch (e) {}
    }
  }

  // Notificar chamada no Painel TV
  broadcastTVCall(callData) {
    this.emit('tv_call', callData, true);
  }
}

export const realtimeHub = new RealtimeHub();
if (typeof window !== 'undefined') {
  window.realtimeHub = realtimeHub;
}
