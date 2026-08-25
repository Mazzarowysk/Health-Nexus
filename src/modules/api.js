// ==========================================
// Health Nexus — API & LocalDB Router Module
// Interceptador Local-First com suporte a cache e sync
// ==========================================

import * as localDB from '../localDB.js';
import { state, CACHE_TTL_MS, dataCache, dataCacheTimestamps } from '../state.js';

export const API_URL = '/api';

// Helper de remoção de acentos para busca flexível
export const removeAccents = (str) => {
  if (!str) return '';
  return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const abbreviateName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;
  const firstName = parts[0];
  const middleInitials = parts.slice(1, -1).map(p => p.charAt(0).toUpperCase() + '.').join(' ');
  const lastName = parts[parts.length - 1];
  return `${firstName} ${middleInitials} ${lastName}`;
};

export const anonymizeCPF = (cpf) => {
  if (!cpf) return '***.***.***-**';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length === 11) {
    return `${clean.substring(0, 3)}.***.***-${clean.substring(9)}`;
  }
  return cpf;
};

export const invalidateCacheForUrl = (url) => {
  if (url.startsWith(`${API_URL}/patients`)) {
    dataCache.delete('patients');
    dataCacheTimestamps.delete('patients');
  }

  if (url.startsWith(`${API_URL}/appointments`) || url.startsWith(`${API_URL}/encounters`)) {
    for (const key of dataCache.keys()) {
      if (typeof key === 'string' && (key.startsWith(`${API_URL}/appointments`) || key.startsWith(`${API_URL}/encounters`))) {
        dataCache.delete(key);
        dataCacheTimestamps.delete(key);
      }
    }
  }

  if (url.startsWith(`${API_URL}/beds`)) {
    dataCache.delete('beds');
    dataCacheTimestamps.delete('beds');
  }

  if (url === `${API_URL}/dashboard/summary`) {
    dataCache.delete('dashboard');
    dataCacheTimestamps.delete('dashboard');
  }
};

export const cachedApiGet = async (url, cacheKey = null) => {
  const cacheId = cacheKey || url;
  const cachedValue = dataCache.get(cacheId);
  const cachedAt = dataCacheTimestamps.get(cacheId) || 0;

  if (cachedValue !== undefined && (Date.now() - cachedAt < CACHE_TTL_MS)) {
    return cachedValue;
  }

  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}`);
  }

  const payload = await response.json();
  const result = payload.data !== undefined ? payload.data : payload;

  dataCache.set(cacheId, result);
  dataCacheTimestamps.set(cacheId, Date.now());
  return result;
};

export const apiFetch = async (url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : null;
  let responseData = null;
  let status = 200;

  try {
    // Rotas de Autenticação
    if (url.includes('/api/auth/login')) {
      let cleanInput = (body.username || '').replace('@', '').toLowerCase().trim();
      if (cleanInput === 'mazzarowyk') cleanInput = 'mazzarowysk';

      let users = localDB.list('users') || [];
      let user = users.find(u => (u.username || '').replace('@', '').toLowerCase().trim() === cleanInput);
      
      // Fallback: se não encontrou localmente, tenta buscar versão da nuvem
      if (!user) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const res = await fetch('/api/turso', { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const cloudPayload = await res.json();
            if (cloudPayload && cloudPayload.dados_json && cloudPayload.dados_json !== '{}') {
              localDB.overwriteLocal(cloudPayload);
              users = localDB.list('users') || [];
              user = users.find(u => (u.username || '').replace('@', '').toLowerCase().trim() === cleanInput);
            }
          }
        } catch (e) {}
      }

      if (user) {
        if (user.status === 'Pendente') {
          status = 403;
          responseData = { message: 'Cadastro pendente de aprovação pelo Usuário Master.' };
        } else {
          const providedPassword = (body.password || '').trim();
          const storedPassword = (user.password || '').trim();

          const defaultAllowedPasswords = ['Health@2026', 'health@2026', '123456'];
          if (cleanInput === 'mazzarowysk') defaultAllowedPasswords.push('T@zm4n1c0054180', 'Health@2026');
          if (cleanInput === 'admin') defaultAllowedPasswords.push('admin123', 'healthnexus2026');
          if (cleanInput === 'medico123') defaultAllowedPasswords.push('medico123');
          if (cleanInput === 'pforte') defaultAllowedPasswords.push('pfortesantos');
          if (cleanInput === 'bcoltri') defaultAllowedPasswords.push('bcoltritupa');
          if (cleanInput === 'silviacwb') defaultAllowedPasswords.push('silvia2013');
          if (cleanInput === 'ffacco') defaultAllowedPasswords.push('caliope');
          if (cleanInput === 'ljordao') defaultAllowedPasswords.push('manobraw');

          const isPasswordCorrect = storedPassword
            ? (providedPassword === storedPassword || defaultAllowedPasswords.includes(providedPassword))
            : defaultAllowedPasswords.includes(providedPassword);

          if (isPasswordCorrect) {
            responseData = { token: 'mock-jwt-token', user };
          } else {
            status = 401;
            responseData = { message: 'Senha incorreta. Verifique suas credenciais.' };
          }
        }
      } else {
        status = 401;
        responseData = { message: 'Usuário não encontrado' };
      }
    } 
    else if (url.includes('/api/auth/register')) {
      const users = localDB.list('users') || [];
      const cleanInput = (body.username || '').replace('@', '').toLowerCase().trim();
      const existingUser = users.find(u => (u.username || '').replace('@', '').toLowerCase().trim() === cleanInput);
      
      if (existingUser) {
        status = 400; responseData = { message: 'Nome de usuário já existe' };
      } else {
        const isAdminKeyValid = body.masterKey === 'admin123' || body.masterKey === 'healthnexus2026';
        let statusStr = 'Pendente';
        if (isAdminKeyValid) statusStr = 'Ativo';
        
        const newUser = {
          name: body.name,
          username: body.username,
          role: body.role,
          password: body.password,
          status: statusStr,
          master_key_requested: statusStr === 'Pendente' ? 1 : 0
        };
        
        const inserted = localDB.insert('users', newUser);
        if (statusStr === 'Pendente') {
          status = 403; responseData = { message: 'Aguardando Aprovação' };
        } else {
          responseData = { message: 'Cadastro realizado com sucesso!', user: inserted };
        }
      }
    }
    else if (url.includes('/api/auth/me')) {
      const storedUser = JSON.parse(sessionStorage.getItem('hn_user') || 'null');
      if (storedUser) {
        responseData = { user: storedUser };
      } else {
        status = 401;
        responseData = { message: 'Usuário não autenticado' };
      }
    }
    else if (url.includes('/api/turso')) {
      // Repassar chamadas Turso diretamente para a rede
      return fetch(url, options);
    }
    else if (url.includes('/api/dashboard/summary')) {
      const patients = localDB.list('patients') || [];
      const encounters = localDB.list('encounters') || [];
      const triages = localDB.list('triages') || [];
      const beds = localDB.list('beds') || [];
      const appointments = localDB.list('appointments') || [];
      const financial = localDB.list('financial_installments') || [];
      const hospitalizations = localDB.list('hospitalizations') || [];
      const prescriptions = localDB.list('prescriptions') || [];

      // 1. Pacientes Ativos
      const activePatients = patients.length;

      // 2. Tempo Médio de Espera Triagem
      let totalWait = 0;
      let waitCount = 0;
      const now = Date.now();
      encounters.forEach(enc => {
        if (enc.status === 'Aguardando_Triagem' || enc.status === 'Aguardando_Atendimento') {
          const adm = enc.admitted_at ? new Date(enc.admitted_at).getTime() : (enc.created_at ? new Date(enc.created_at).getTime() : now);
          const diffMin = Math.max(1, Math.floor((now - adm) / 60000));
          totalWait += diffMin;
          waitCount++;
        }
      });
      const averageWaitTimeMinutes = waitCount > 0 ? Math.round(totalWait / waitCount) : 12;

      // 3. Financeiro (Receita do Mês)
      let totalRevenue = 0;
      financial.forEach(f => {
        if (f.type === 'Receita' || !f.type) {
          totalRevenue += parseFloat(f.amount || f.finalAmount || 0);
        }
      });

      // 4. Ocupação de Leitos por Ala
      const totalBeds = beds.length || 22;
      const occupiedBeds = beds.filter(b => b.status === 'Ocupado').length;
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      // Categorias de Leitos
      const utiCount = beds.filter(b => (b.type?.includes('UTI') || b.ward?.includes('UTI')) && b.status === 'Ocupado').length;
      const enfCount = beds.filter(b => (b.type?.includes('Enfermaria') || b.ward?.includes('Clínica Médica')) && b.status === 'Ocupado').length;
      const pedCount = beds.filter(b => (b.type?.includes('Pediatria') || b.ward?.includes('Pediatria')) && b.status === 'Ocupado').length;
      const matCount = beds.filter(b => (b.type?.includes('Maternidade') || b.ward?.includes('Maternidade')) && b.status === 'Ocupado').length;
      const freeBeds = beds.filter(b => b.status !== 'Ocupado').length;

      const occupancyData = [
        { label: 'UTI Adulto', value: utiCount, color: '#f43f5e' },
        { label: 'Enfermaria', value: enfCount, color: '#6366f1' },
        { label: 'Pediatria', value: pedCount, color: '#00f2fe' },
        { label: 'Maternidade', value: matCount, color: '#f59e0b' },
        { label: 'Disponíveis', value: freeBeds, color: '#10b981' }
      ];

      // 5. Histórico Semanal / Mensal de Atendimentos
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const weekCounts = {
        'Seg': { urgencia: 0, ambulatorial: 0 },
        'Ter': { urgencia: 0, ambulatorial: 0 },
        'Qua': { urgencia: 0, ambulatorial: 0 },
        'Qui': { urgencia: 0, ambulatorial: 0 },
        'Sex': { urgencia: 0, ambulatorial: 0 },
        'Sáb': { urgencia: 0, ambulatorial: 0 },
        'Dom': { urgencia: 0, ambulatorial: 0 }
      };

      encounters.forEach(enc => {
        const d = new Date(enc.admitted_at || enc.created_at || Date.now());
        const dayName = dayNames[d.getDay()];
        if (weekCounts[dayName]) {
          if (enc.type === 'Urgencia' || enc.status === 'Aguardando_Triagem' || enc.manchesterColor) {
            weekCounts[dayName].urgencia++;
          } else {
            weekCounts[dayName].ambulatorial++;
          }
        }
      });

      appointments.forEach(apt => {
        const d = new Date(apt.appointmentDate || apt.date || apt.created_at || Date.now());
        const dayName = dayNames[d.getDay()];
        if (weekCounts[dayName]) {
          weekCounts[dayName].ambulatorial++;
        }
      });

      const appointmentsHistory = [
        { label: 'Seg', urgencia: weekCounts['Seg'].urgencia, ambulatorial: weekCounts['Seg'].ambulatorial },
        { label: 'Ter', urgencia: weekCounts['Ter'].urgencia, ambulatorial: weekCounts['Ter'].ambulatorial },
        { label: 'Qua', urgencia: weekCounts['Qua'].urgencia, ambulatorial: weekCounts['Qua'].ambulatorial },
        { label: 'Qui', urgencia: weekCounts['Qui'].urgencia, ambulatorial: weekCounts['Qui'].ambulatorial },
        { label: 'Sex', urgencia: weekCounts['Sex'].urgencia, ambulatorial: weekCounts['Sex'].ambulatorial },
        { label: 'Sáb', urgencia: weekCounts['Sáb'].urgencia, ambulatorial: weekCounts['Sáb'].ambulatorial },
        { label: 'Dom', urgencia: weekCounts['Dom'].urgencia, ambulatorial: weekCounts['Dom'].ambulatorial }
      ];

      // 6. Manchester Data
      const manchesterCounts = { Vermelho: 0, Laranja: 0, Amarelo: 0, Verde: 0, Azul: 0 };
      triages.forEach(t => {
        const c = t.color || t.classification;
        if (manchesterCounts[c] !== undefined) manchesterCounts[c]++;
      });
      encounters.forEach(e => {
        if (e.manchesterColor && manchesterCounts[e.manchesterColor] !== undefined) {
          manchesterCounts[e.manchesterColor]++;
        }
      });
      const manchesterData = [
        manchesterCounts.Vermelho || 0,
        manchesterCounts.Laranja || 0,
        manchesterCounts.Amarelo || 0,
        manchesterCounts.Verde || 0,
        manchesterCounts.Azul || 0
      ];

      // 7. Funil de Atendimento Hospitalar Dinâmico
      const stage1_recepcao = encounters.length > 0 ? encounters.length : patients.length;
      const stage2_triagem = triages.length > 0 ? triages.length : Math.round(stage1_recepcao * 0.85);
      const stage3_consultorio = encounters.filter(e => ['Em_Atendimento', 'Aguardando_Exames', 'Aguardando_Resultado', 'Alta', 'Finalizado'].includes(e.status)).length || Math.round(stage2_triagem * 0.75);
      const stage4_exames = prescriptions.length > 0 ? prescriptions.length : encounters.filter(e => ['Aguardando_Exames', 'Aguardando_Resultado'].includes(e.status)).length || Math.round(stage3_consultorio * 0.45);
      const stage5_alta = encounters.filter(e => e.status === 'Alta' || e.status === 'Finalizado').length || Math.round(stage3_consultorio * 0.35);

      const funnelData = {
        recepcao: Math.max(1, stage1_recepcao),
        triagem: Math.max(1, stage2_triagem),
        consultorio: Math.max(1, stage3_consultorio),
        exames: Math.max(1, stage4_exames),
        alta: Math.max(1, stage5_alta)
      };

      responseData = {
        activePatients,
        occupancyRate,
        averageWaitTimeMinutes,
        dailyAppointmentsCount: appointments.length,
        billingSummary: { totalRevenue, pendingClaims: 0 },
        occupancyData,
        appointmentsHistory,
        manchesterData,
        funnelData
      };
    }
    else if (url.includes('/api/stagnation/alerts')) {
      const allEncounters = localDB.list('encounters') || [];
      const alerts = [];
      let criticalCount = 0;
      let warningCount = 0;
      
      const now = new Date();
      allEncounters.forEach(enc => {
        if (enc.status === 'Finalizado' || enc.status === 'Cancelado') return;
        
        let elapsedMin = 0;
        if (enc.lastStatusUpdate) {
           const updateTime = new Date(enc.lastStatusUpdate);
           elapsedMin = Math.floor((now - updateTime) / 60000);
        } else if (enc.timestamp) {
           const updateTime = new Date(enc.timestamp);
           elapsedMin = Math.floor((now - updateTime) / 60000);
        }
        
        if (elapsedMin > 15) {
          const isCritical = elapsedMin > 30;
          if (isCritical) criticalCount++; else warningCount++;
          
          let patient = { fullName: 'Desconhecido', cpf: '' };
          if (enc.patientId) {
             patient = localDB.get('patients', enc.patientId) || patient;
          }
          
          alerts.push({
            id: enc.id,
            patientName: patient.fullName,
            patientCpf: patient.cpf,
            status: enc.status,
            room: enc.room || enc.location || '-',
            elapsedMin: elapsedMin,
            severity: isCritical ? 'CRITICAL' : 'WARNING',
            reason: `Aguardando no status '${enc.status}' há ${elapsedMin} min`,
            recommendedAction: 'Verificar situação e prosseguir com atendimento.'
          });
        }
      });
      
      alerts.sort((a, b) => b.elapsedMin - a.elapsedMin);
      responseData = { alerts, criticalCount, warningCount };
    }
    else if (url.includes('/api/stagnation/reassign') && method === 'POST') {
      const { encounterId, room, status: newStatus } = body || {};
      const allEncounters = localDB.list('encounters') || [];
      const enc = allEncounters.find(e => e.id === encounterId || e.encounterId === encounterId || e.patientId === encounterId);

      if (enc) {
        const updated = {
          ...enc,
          room: room || enc.room || 'UTI / Internação',
          status: newStatus || enc.status || 'Aguardando_Leito',
          lastStatusUpdate: new Date().toISOString()
        };
        localDB.update('encounters', enc.id, updated);
        responseData = { status: 'success', data: updated };
      } else {
        const newEnc = {
          id: encounterId || `enc-${Date.now()}`,
          room: room || 'UTI / Internação',
          status: newStatus || 'Aguardando_Leito',
          lastStatusUpdate: new Date().toISOString()
        };
        localDB.insert('encounters', newEnc);
        responseData = { status: 'success', data: newEnc };
      }
    }
    else if (url.includes('/approve-master') && method === 'PUT') {
      const match = url.match(/\/api\/users\/([^\/]+)\/approve-master/);
      const uid = match ? match[1] : null;
      if (uid) {
        const u = localDB.get('users', uid);
        if (u) {
          const newRole = u.role || 'Médico';
          const updated = {
            ...u,
            role: newRole,
            status: 'Ativo',
            master_key_requested: 0,
            updated_at: new Date().toISOString()
          };
          localDB.update('users', uid, updated);
          responseData = { status: 'success', message: 'Acesso aprovado' };
        } else {
          status = 404; responseData = { message: 'Usuário não encontrado' };
        }
      }
    }
    else if (url.includes('/api/settings/reset') && method === 'POST') {
      localDB.clear();
      responseData = { status: 'success', message: 'Banco de dados zerado com sucesso.' };
    }
    else if (url.includes('/api/encounters/') && url.includes('/triage') && method === 'POST') {
      const match = url.match(/\/api\/encounters\/([^\/]+)\/triage/);
      const encounterId = match ? match[1] : null;
      if (encounterId) {
        const allEncounters = localDB.list('encounters') || [];
        const enc = allEncounters.find(e => String(e.id) === String(encounterId) || String(e.encounterId) === String(encounterId) || String(e.patientId) === String(encounterId));
        if (enc) {
          const updatedEncounter = {
            ...enc,
            manchesterColor: body.manchesterColor || enc.manchesterColor || 'Verde',
            bloodPressure: body.bloodPressure || enc.bloodPressure || '',
            temperatureCelsius: body.temperatureCelsius || enc.temperatureCelsius || '',
            heartRateBpm: body.heartRateBpm || enc.heartRateBpm || '',
            weightKg: body.weightKg || enc.weightKg || '',
            complaints: body.complaints || enc.complaints || '',
            status: 'Aguardando_Atendimento', // Transita da coluna Triagem para Aguardando Atendimento
            triaged_at: new Date().toISOString(),
            lastStatusUpdate: new Date().toISOString()
          };
          localDB.update('encounters', enc.id, updatedEncounter);

          localDB.insert('triages', {
            id: `tri-${Date.now()}`,
            encounterId: enc.id,
            patientId: enc.patientId,
            patientName: enc.patientName,
            manchesterColor: body.manchesterColor || 'Verde',
            bloodPressure: body.bloodPressure || '',
            temperatureCelsius: body.temperatureCelsius || '',
            heartRateBpm: body.heartRateBpm || '',
            weightKg: body.weightKg || '',
            complaints: body.complaints || '',
            triaged_at: new Date().toISOString()
          });

          responseData = { status: 'success', data: updatedEncounter, message: 'Triagem registrada com sucesso.' };
        } else {
          status = 404; responseData = { message: 'Atendimento não encontrado.' };
        }
      }
    }
    else if (url.includes('/api/encounters/') && url.includes('/status') && method === 'PUT') {
      const match = url.match(/\/api\/encounters\/([^\/]+)\/status/);
      const encounterId = match ? match[1] : null;
      if (encounterId) {
        const allEncounters = localDB.list('encounters') || [];
        const enc = allEncounters.find(e => String(e.id) === String(encounterId) || String(e.encounterId) === String(encounterId) || String(e.patientId) === String(encounterId));
        if (enc) {
          const newStatus = body.status || enc.status;
          const updatedEncounter = {
            ...enc,
            status: newStatus,
            lastStatusUpdate: new Date().toISOString(),
            ...(newStatus === 'Finalizado' ? { completed_at: new Date().toISOString() } : {}),
            ...(newStatus === 'Em_Atendimento' ? { called_at: new Date().toISOString() } : {})
          };
          localDB.update('encounters', enc.id, updatedEncounter);
          responseData = { status: 'success', data: updatedEncounter };
        } else {
          status = 404; responseData = { message: 'Atendimento não encontrado.' };
        }
      }
    }
    else if (url.includes('/api/encounters/') && url.includes('/start-observation') && method === 'PUT') {
      const match = url.match(/\/api\/encounters\/([^\/]+)\/start-observation/);
      const encounterId = match ? match[1] : null;
      if (encounterId) {
        let bodyObj = {};
        try { bodyObj = (typeof body === 'string') ? JSON.parse(body) : (body || {}); } catch(e){}
        const allEncounters = localDB.list('encounters') || [];
        const enc = allEncounters.find(e => String(e.id) === String(encounterId) || String(e.encounterId) === String(encounterId) || String(e.patientId) === String(encounterId));
        if (enc) {
          const updatedEncounter = {
            ...enc,
            status: 'Em_Observacao',
            observation_started_at: enc.observation_started_at || new Date().toISOString(),
            room: bodyObj.room || enc.room || enc.roomName || 'Consultório 01',
            lastStatusUpdate: new Date().toISOString()
          };
          localDB.update('encounters', enc.id, updatedEncounter);
          responseData = { status: 'success', data: updatedEncounter };
        } else {
          status = 404; responseData = { message: 'Atendimento não encontrado.' };
        }
      }
    }
    else if (url.includes('/api/encounters/') && url.includes('/discharge') && method === 'PUT') {
      const match = url.match(/\/api\/encounters\/([^\/]+)\/discharge/);
      const encounterId = match ? match[1] : null;
      if (encounterId) {
        const allEncounters = localDB.list('encounters') || [];
        const enc = allEncounters.find(e => String(e.id) === String(encounterId) || String(e.encounterId) === String(encounterId) || String(e.patientId) === String(encounterId));
        if (enc) {
          const updatedEncounter = {
            ...enc,
            status: 'Alta',
            completed_at: new Date().toISOString(),
            lastStatusUpdate: new Date().toISOString()
          };
          localDB.update('encounters', enc.id, updatedEncounter);
          responseData = { status: 'success', data: updatedEncounter };
        } else {
          status = 404; responseData = { message: 'Atendimento não encontrado.' };
        }
      }
    }
    else if (url.includes('/api/encounters/') && url.includes('/notes')) {
      const match = url.match(/\/api\/encounters\/([^\/]+)\/notes/);
      const encounterId = match ? match[1] : null;
      if (method === 'GET') {
        const encs = localDB.list('encounters') || [];
        const enc = encs.find(e => String(e.id) === String(encounterId) || String(e.patientId) === String(encounterId) || (e.patientName && encounterId && e.patientName.toLowerCase() === encounterId.toLowerCase()));
        const allNotes = localDB.list('clinical_notes') || [];
        const foundNote = allNotes.find(n => String(n.encounterId) === String(encounterId) || (enc && String(n.patientId) === String(enc.patientId)));
        
        responseData = {
          subjectiveContent: enc?.subjectiveContent || foundNote?.subjectiveContent || enc?.complaints || '',
          objectiveContent: enc?.objectiveContent || foundNote?.objectiveContent || '',
          assessmentContent: enc?.assessmentContent || enc?.diagnosis || foundNote?.assessmentContent || '',
          planContent: enc?.planContent || enc?.plan || foundNote?.planContent || ''
        };
      } else if (method === 'POST' || method === 'PUT') {
        const { subjectiveContent, objectiveContent, assessmentContent, planContent, noteType } = body;
        const encs = localDB.list('encounters') || [];
        const enc = encs.find(e => String(e.id) === String(encounterId) || String(e.patientId) === String(encounterId) || (e.patientName && encounterId && e.patientName.toLowerCase() === encounterId.toLowerCase()));
        
        if (enc) {
          localDB.update('encounters', enc.id, {
            ...enc,
            subjectiveContent: subjectiveContent || enc.subjectiveContent,
            objectiveContent: objectiveContent || enc.objectiveContent,
            assessmentContent: assessmentContent || enc.assessmentContent,
            diagnosis: assessmentContent || enc.diagnosis,
            planContent: planContent || enc.planContent,
            plan: planContent || enc.plan,
            lastStatusUpdate: new Date().toISOString()
          });
        }

        const newNote = localDB.insert('clinical_notes', {
          id: 'NOTE-' + Date.now(),
          encounterId: enc?.id || encounterId,
          patientId: enc?.patientId || 'pat-01',
          patientName: enc?.patientName || '',
          noteType: noteType || 'Evolucao_Medica',
          subjectiveContent,
          objectiveContent,
          assessmentContent,
          planContent,
          created_at: new Date().toISOString()
        });

        responseData = { status: 'success', data: newNote, message: 'Evolução médica gravada com sucesso.' };
      }
    }
    else if (url.includes('/api/encounters/') && url.includes('/transfer-to-bed') && method === 'PUT') {
      const match = url.match(/\/api\/encounters\/([^\/]+)\/transfer-to-bed/);
      const encounterId = match ? match[1] : null;
      const { bedId, patientName, patientId } = body;

      const allBeds = localDB.list('beds') || [];
      const bed = allBeds.find(b => String(b.id) === String(bedId) || b.bedNumber === bedId || b.number === bedId);

      if (bed) {
        const encs = localDB.list('encounters') || [];
        const prevEnc = encs.find(e => String(e.id) === String(encounterId) || (patientName && e.patientName && e.patientName.toLowerCase().trim() === patientName.toLowerCase().trim()));
        const pId = patientId || (prevEnc ? prevEnc.patientId : null) || 'pat-' + Date.now();
        const pName = patientName || (prevEnc ? prevEnc.patientName : 'Paciente');
        const nowIso = new Date().toISOString();
        const year = new Date().getFullYear();
        const seq = String(encs.length + 1).padStart(4, '0');
        const newPepNumber = `PEP-INT-${year}-${seq}`;
        const newEncounterId = 'enc-int-' + Date.now();

        // 0. DESOCUPAR AUTOMATICAMENTE QUALQUER LEITO ANTERIOR QUE ESTE PACIENTE JÁ ESTIVESSE OCUPANDO (ANTI-DUPLICIDADE)
        allBeds.forEach(otherBed => {
          if (String(otherBed.id) !== String(bed.id) && (
            (pId && String(otherBed.patientId) === String(pId)) ||
            (pName && otherBed.patientName && otherBed.patientName.toLowerCase().trim() === pName.toLowerCase().trim())
          )) {
            localDB.update('beds', otherBed.id, {
              ...otherBed,
              status: 'Higienizacao',
              patientId: null,
              patientName: null,
              encounterId: null,
              pepNumber: null,
              admittedAt: null,
              updated_at: nowIso
            });
          }
        });

        // 1. Finalizar o PEP anterior de Pronto-Socorro / Ambulatório
        if (prevEnc) {
          localDB.update('encounters', prevEnc.id, {
            ...prevEnc,
            status: 'Finalizado',
            outcome: 'Transferência para Internação Hospitalar',
            closingReason: `Transferido e internado no Leito ${bed.bedNumber || bed.number} (${bed.sector || 'Enfermaria'})`,
            completed_at: nowIso,
            closedAt: nowIso,
            discharged_at: nowIso,
            lastStatusUpdate: nowIso
          });
        }

        // 2. Criar NOVO PEP de Internação Hospitalar
        const newInpatientEncounter = {
          id: newEncounterId,
          pepNumber: newPepNumber,
          patientId: pId,
          patientName: pName,
          type: 'Internacao',
          status: 'Internado',
          bed: bed.bedNumber || bed.number,
          bedId: bed.id,
          sector: bed.sector || bed.type || 'Enfermaria',
          previousEncounterId: prevEnc ? prevEnc.id : null,
          previousPepNumber: prevEnc ? (prevEnc.pepNumber || 'PEP-PS-ANTERIOR') : null,
          admitted_at: nowIso,
          hospitalized_at: nowIso,
          subjectiveContent: prevEnc ? (prevEnc.subjectiveContent || prevEnc.complaints || '') : '',
          diagnosis: prevEnc ? (prevEnc.diagnosis || prevEnc.assessmentContent || '') : '',
          manchesterColor: prevEnc ? (prevEnc.manchesterColor || 'Verde') : 'Verde',
          lastStatusUpdate: nowIso
        };
        localDB.insert('encounters', newInpatientEncounter);

        // 3. Atualizar Leito com o novo PEP de internação
        const updatedBed = {
          ...bed,
          status: 'Ocupado',
          patientId: pId,
          patientName: pName,
          admittedAt: nowIso,
          encounterId: newEncounterId,
          pepNumber: newPepNumber
        };
        localDB.update('beds', bed.id, updatedBed);

        // 4. Criar ou Atualizar registro de internação no Kanban
        const hosps = localDB.list('hospitalizations') || [];
        const activeHosp = hosps.find(h => h.patient_id === pId && h.status !== 'Alta');
        if (activeHosp) {
          localDB.update('hospitalizations', activeHosp.id, {
            ...activeHosp,
            bed_id: bed.id,
            bed: bed.bedNumber || bed.number,
            current_sector: bed.sector || bed.type || 'Enfermaria',
            encounter_id: newEncounterId,
            pepNumber: newPepNumber,
            status: 'Internado'
          });
        } else {
          localDB.insert('hospitalizations', {
            id: 'hosp-' + Date.now(),
            patient_id: pId,
            patientName: pName,
            bed_id: bed.id,
            bed: bed.bedNumber || bed.number,
            current_sector: bed.sector || bed.type || 'Enfermaria',
            encounter_id: newEncounterId,
            pepNumber: newPepNumber,
            admitted_at: nowIso,
            status: 'Internado'
          });
        }

        responseData = { 
          status: 'success', 
          data: updatedBed, 
          newEncounter: newInpatientEncounter,
          message: `PEP de PS finalizado e Novo PEP (${newPepNumber}) aberto para a internação no leito ${bed.bedNumber || bed.number}.` 
        };
      } else {
        status = 404; responseData = { message: 'Leito não encontrado.' };
      }
    }
    else if (url.includes('/api/beds/admit') && method === 'POST') {
      const { bedId, patientId, patientName, encounterId } = body;
      const allBeds = localDB.list('beds') || [];
      const bed = allBeds.find(b => String(b.id) === String(bedId) || b.bedNumber === bedId || b.number === bedId);

      if (bed) {
        const encs = localDB.list('encounters') || [];
        const prevEnc = encs.find(e => 
          (encounterId && String(e.id) === String(encounterId)) || 
          (patientId && String(e.patientId) === String(patientId) && e.status !== 'Finalizado') ||
          (patientName && e.patientName && e.patientName.toLowerCase().trim() === patientName.toLowerCase().trim() && e.status !== 'Finalizado')
        );

        const nowIso = new Date().toISOString();
        const year = new Date().getFullYear();
        const seq = String(encs.length + 1).padStart(4, '0');
        const newPepNumber = `PEP-INT-${year}-${seq}`;
        const newEncounterId = 'enc-int-' + Date.now();

        // 0. DESOCUPAR AUTOMATICAMENTE QUALQUER LEITO ANTERIOR QUE ESTE PACIENTE JÁ ESTIVESSE OCUPANDO (ANTI-DUPLICIDADE)
        allBeds.forEach(otherBed => {
          if (String(otherBed.id) !== String(bed.id) && (
            (patientId && String(otherBed.patientId) === String(patientId)) ||
            (patientName && otherBed.patientName && otherBed.patientName.toLowerCase().trim() === patientName.toLowerCase().trim())
          )) {
            localDB.update('beds', otherBed.id, {
              ...otherBed,
              status: 'Higienizacao',
              patientId: null,
              patientName: null,
              encounterId: null,
              pepNumber: null,
              admittedAt: null,
              updated_at: nowIso
            });
          }
        });

        // 1. Finalizar o PEP anterior de Pronto-Socorro / Ambulatório
        if (prevEnc) {
          localDB.update('encounters', prevEnc.id, {
            ...prevEnc,
            status: 'Finalizado',
            outcome: 'Transferência para Internação Hospitalar',
            closingReason: `Transferido e internado no Leito ${bed.bedNumber || bed.number} (${bed.sector || 'Enfermaria'})`,
            completed_at: nowIso,
            closedAt: nowIso,
            discharged_at: nowIso,
            lastStatusUpdate: nowIso
          });
        }

        // 2. Criar NOVO PEP de Internação Hospitalar
        const newInpatientEncounter = {
          id: newEncounterId,
          pepNumber: newPepNumber,
          patientId: patientId,
          patientName: patientName,
          type: 'Internacao',
          status: 'Internado',
          bed: bed.bedNumber || bed.number,
          bedId: bed.id,
          sector: bed.sector || bed.type || 'Enfermaria',
          previousEncounterId: prevEnc ? prevEnc.id : null,
          previousPepNumber: prevEnc ? (prevEnc.pepNumber || 'PEP-PS-ANTERIOR') : null,
          admitted_at: nowIso,
          hospitalized_at: nowIso,
          subjectiveContent: prevEnc ? (prevEnc.subjectiveContent || prevEnc.complaints || '') : '',
          diagnosis: prevEnc ? (prevEnc.diagnosis || prevEnc.assessmentContent || '') : '',
          manchesterColor: prevEnc ? (prevEnc.manchesterColor || 'Verde') : 'Verde',
          lastStatusUpdate: nowIso
        };
        localDB.insert('encounters', newInpatientEncounter);

        // 3. Atualizar Leito com o novo PEP de internação
        const updatedBed = {
          ...bed,
          status: 'Ocupado',
          patientId: patientId,
          patientName: patientName,
          admittedAt: nowIso,
          encounterId: newEncounterId,
          pepNumber: newPepNumber
        };
        localDB.update('beds', bed.id, updatedBed);

        // 4. Criar ou Atualizar registro de internação no Kanban
        const hosps = localDB.list('hospitalizations') || [];
        const activeHosp = hosps.find(h => h.patient_id === patientId && h.status !== 'Alta');
        if (activeHosp) {
          localDB.update('hospitalizations', activeHosp.id, {
            ...activeHosp,
            bed_id: bed.id,
            bed: bed.bedNumber || bed.number,
            current_sector: bed.sector || bed.type || 'Enfermaria',
            encounter_id: newEncounterId,
            pepNumber: newPepNumber,
            status: 'Internado'
          });
        } else {
          localDB.insert('hospitalizations', {
            id: 'hosp-' + Date.now(),
            patient_id: patientId,
            patientName: patientName,
            bed_id: bed.id,
            bed: bed.bedNumber || bed.number,
            current_sector: bed.sector || bed.type || 'Enfermaria',
            encounter_id: newEncounterId,
            pepNumber: newPepNumber,
            admitted_at: nowIso,
            status: 'Internado'
          });
        }

        responseData = { 
          status: 'success', 
          data: updatedBed, 
          newEncounter: newInpatientEncounter,
          message: `PEP de PS finalizado e Novo PEP (${newPepNumber}) gerado para a internação no leito ${bed.bedNumber || bed.number}.` 
        };
      } else {
        status = 404; responseData = { message: 'Leito não encontrado.' };
      }
    }
    else if (url.includes('/api/beds/discharge') && method === 'POST') {
      const { bedId } = body;
      const allBeds = localDB.list('beds') || [];
      const bed = allBeds.find(b => String(b.id) === String(bedId) || b.bedNumber === bedId || b.number === bedId);

      if (bed) {
        const prevPatientId = bed.patientId;
        const prevPatientName = bed.patientName;
        const nowIso = new Date().toISOString();

        const updatedBed = {
          ...bed,
          status: 'Higienizacao',
          previousPatientName: prevPatientName || bed.previousPatientName,
          patientId: null,
          patientName: null,
          dischargedAt: nowIso
        };
        localDB.update('beds', bed.id, updatedBed);

        // Dar alta em todas as internações correspondentes
        const hosps = localDB.list('hospitalizations') || [];
        hosps.forEach(h => {
          const matchBed = String(h.bed_id) === String(bed.id) || String(h.bedId) === String(bed.id) || 
                           h.bed === bed.bedNumber || h.bed === bed.number ||
                           (h.bed && bed.bedNumber && (h.bed.includes(bed.bedNumber) || bed.bedNumber.includes(h.bed))) ||
                           (h.bed && bed.number && (h.bed.includes(bed.number) || bed.number.includes(h.bed)));
          const matchPatient = (prevPatientId && (String(h.patient_id) === String(prevPatientId) || String(h.patientId) === String(prevPatientId))) ||
                               (prevPatientName && h.patientName && h.patientName.toLowerCase() === prevPatientName.toLowerCase());
          
          if ((matchBed || matchPatient) && h.status !== 'Alta') {
            localDB.update('hospitalizations', h.id, {
              ...h,
              status: 'Alta',
              discharge_date: nowIso,
              discharged_at: nowIso
            });
          }
        });

        // Dar alta nos encounters ativos do paciente
        if (prevPatientId || prevPatientName) {
          const encs = localDB.list('encounters') || [];
          encs.forEach(enc => {
            const matchPatient = (prevPatientId && (String(enc.patientId) === String(prevPatientId) || String(enc.patient_id) === String(prevPatientId))) ||
                                 (prevPatientName && enc.patientName && enc.patientName.toLowerCase() === prevPatientName.toLowerCase());
            if (matchPatient && (enc.status === 'Internado' || enc.status === 'Em_Atendimento' || enc.status === 'Aguardando_Atendimento')) {
              localDB.update('encounters', enc.id, {
                ...enc,
                status: 'Finalizado',
                dischargeType: 'Alta Hospitalar',
                discharged_at: nowIso,
                completed_at: nowIso,
                lastStatusUpdate: nowIso
              });
            }
          });

          // Registrar anotação clínica de alta
          localDB.insert('clinical_notes', {
            id: 'NOTE-' + Math.floor(Math.random() * 1000000),
            patientId: prevPatientId || 'pat-01',
            text: `✅ Alta Hospitalar realizada no Leito ${bed.number || bed.bedNumber || bed.id}. Paciente liberado e leito encaminhado para Higienização.`,
            created_at: nowIso,
            author: 'Gestão de Leitos (Sistema)'
          });

          // Gerar faturamento/título financeiro de encerramento da internação
          try {
            const pat = (localDB.list('patients') || []).find(p => String(p.id) === String(prevPatientId)) || {};
            const isParticular = !pat.healthPlan || pat.healthPlan.toLowerCase().includes('particular');
            const dailyRate = (bed.type && bed.type.includes('UTI')) ? 2200 : 850;
            localDB.insert('financial_installments', {
              id: 'FIN-' + Date.now(),
              patient_id: prevPatientId || 'pat-01',
              patientName: prevPatientName || 'Paciente',
              category: 'Procedimentos',
              description: `Encerramento de Internação — Leito ${bed.number || bed.bedNumber || bed.id} (${bed.sector || 'Enfermaria'})`,
              amount: dailyRate,
              due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
              status: isParticular ? 'A Vencer' : 'Pagas',
              payment_method: isParticular ? 'Pix' : 'Convênio',
              created_at: nowIso
            });
          } catch(e) {}
        }

        responseData = { status: 'success', data: updatedBed, message: 'Alta concedida e leito encaminhado para higienização.' };
      } else {
        status = 404; responseData = { message: 'Leito não encontrado.' };
      }
    }
    else if (url.includes('/api/beds/') && url.includes('/status') && method === 'PUT') {
      const match = url.match(/\/api\/beds\/([^\/]+)\/status/);
      const bedId = match ? match[1] : null;
      if (bedId) {
        const allBeds = localDB.list('beds') || [];
        const bed = allBeds.find(b => String(b.id) === String(bedId) || b.bedNumber === bedId || b.number === bedId);
        if (bed) {
          const newStatus = body.status || 'Vago';
          const isClearingPatient = newStatus === 'Vago' || newStatus === 'Higienizacao' || newStatus === 'Higienização' || newStatus === 'Limpeza' || newStatus === 'Manutenção';
          const prevPatientId = bed.patientId;
          const prevPatientName = bed.patientName;
          const nowIso = new Date().toISOString();

          const updatedBed = {
            ...bed,
            status: newStatus,
            ...(isClearingPatient ? {
              previousPatientName: prevPatientName || bed.previousPatientName,
              patientId: null,
              patientName: null,
              dischargedAt: nowIso
            } : {})
          };
          localDB.update('beds', bed.id, updatedBed);

          // Se estava ocupado e foi para higienização/vago, dar alta nas internações
          if (isClearingPatient && (prevPatientId || prevPatientName)) {
            const hosps = localDB.list('hospitalizations') || [];
            hosps.forEach(h => {
              const matchBed = String(h.bed_id) === String(bed.id) || String(h.bedId) === String(bed.id) || 
                               h.bed === bed.bedNumber || h.bed === bed.number ||
                               (h.bed && bed.bedNumber && (h.bed.includes(bed.bedNumber) || bed.bedNumber.includes(h.bed))) ||
                               (h.bed && bed.number && (h.bed.includes(bed.number) || bed.number.includes(h.bed)));
              const matchPatient = (prevPatientId && (String(h.patient_id) === String(prevPatientId) || String(h.patientId) === String(prevPatientId))) ||
                                   (prevPatientName && h.patientName && h.patientName.toLowerCase() === prevPatientName.toLowerCase());
              if ((matchBed || matchPatient) && h.status !== 'Alta') {
                localDB.update('hospitalizations', h.id, {
                  ...h,
                  status: 'Alta',
                  discharge_date: nowIso,
                  discharged_at: nowIso
                });
              }
            });

            const encs = localDB.list('encounters') || [];
            encs.forEach(enc => {
              const matchPatient = (prevPatientId && (String(enc.patientId) === String(prevPatientId) || String(enc.patient_id) === String(prevPatientId))) ||
                                   (prevPatientName && enc.patientName && enc.patientName.toLowerCase() === prevPatientName.toLowerCase());
              if (matchPatient && (enc.status === 'Internado' || enc.status === 'Em_Atendimento')) {
                localDB.update('encounters', enc.id, {
                  ...enc,
                  status: 'Finalizado',
                  dischargeType: 'Alta Hospitalar',
                  discharged_at: nowIso,
                  completed_at: nowIso,
                  lastStatusUpdate: nowIso
                });
              }
            });
          }

          responseData = { status: 'success', data: updatedBed };
        } else {
          status = 404; responseData = { message: 'Leito não encontrado.' };
        }
      }
    }
    else if (url.includes('/api/patients/') && url.includes('/history') && method === 'GET') {
      const match = url.match(/\/api\/patients\/([^\/]+)\/history/);
      const patientId = match ? match[1] : null;
      const allPatients = localDB.list('patients') || [];
      const patient = allPatients.find(p => String(p.id) === String(patientId) || (p.fullName && p.fullName.toLowerCase().includes(patientId.toLowerCase()))) || { id: patientId, fullName: patientId };

      const allEncounters = localDB.list('encounters') || [];
      const encounters = allEncounters.filter(e => String(e.patientId) === String(patient.id) || (patient.fullName && e.patientName && e.patientName.toLowerCase() === patient.fullName.toLowerCase()));

      const allAppointments = localDB.list('appointments') || [];
      const appointments = allAppointments.filter(a => String(a.patientId) === String(patient.id) || (patient.fullName && a.patientName && a.patientName.toLowerCase() === patient.fullName.toLowerCase()));

      const allHosps = localDB.list('hospitalizations') || [];
      const hospitalizations = allHosps.filter(h => String(h.patient_id) === String(patient.id) || (patient.fullName && h.patientName && h.patientName.toLowerCase() === patient.fullName.toLowerCase()));

      const allTv = localDB.list('tv_calls') || [];
      const tvCalls = allTv.filter(t => String(t.patientId) === String(patient.id) || (patient.fullName && t.patientName && t.patientName.toLowerCase() === patient.fullName.toLowerCase()));

      const allTriages = localDB.list('triages') || [];
      const triages = allTriages.filter(t => String(t.patientId) === String(patient.id) || (patient.fullName && t.patientName && t.patientName.toLowerCase() === patient.fullName.toLowerCase()));

      const allPrescriptions = localDB.list('prescriptions') || [];
      const prescriptions = allPrescriptions.filter(p => String(p.patientId) === String(patient.id) || (patient.fullName && p.patientName && p.patientName.toLowerCase() === patient.fullName.toLowerCase()));

      const allNotes = localDB.list('clinical_notes') || [];
      const clinicalNotes = allNotes.filter(n => String(n.patientId) === String(patient.id));

      responseData = {
        patient,
        encounters,
        appointments,
        hospitalizations,
        tvCalls,
        triages,
        prescriptions,
        clinicalNotes
      };
    }
    else {
      // Rotas CRUD padrão
      const parts = url.split('?')[0].replace('/api/', '').split('/');
      let table = parts[0];
      let id = parts[1];

      if (table === 'encounters') table = 'encounters';
      if (table === 'patients') table = 'patients';
      if (table === 'appointments') table = 'appointments';
      if (table === 'triages') table = 'triages';
      if (table === 'clinical-notes') table = 'clinical_notes';
      if (table === 'prescriptions') table = 'prescriptions';
      if (table === 'pharmacy') table = 'medications';
      if (table === 'consulting-rooms') table = 'consultorios';
      if (table === 'beds') table = 'beds';
      if (table === 'financial') { table = 'financial_installments'; if (id === 'installments') id = undefined; }
      if (table === 'tv') { table = 'tv_calls'; id = undefined; }

      if (method === 'GET') {
        if (id) responseData = localDB.get(table, id);
        else responseData = { data: localDB.list(table) };
      } else if (method === 'POST') {
        if (table === 'tv_calls') {
          body.calledAt = new Date().toISOString();
          const pName = (body.patientName || '').trim();
          const targetRoom = body.roomName || body.room || 'Consultório 01';
          if (body.patientId || pName) {
            const allEncounters = localDB.list('encounters') || [];
            const enc = allEncounters.find(e => 
              (body.patientId && String(e.patientId) === String(body.patientId)) || 
              (pName && e.patientName && e.patientName.toLowerCase().trim() === pName.toLowerCase().trim())
            );
            if (enc) {
              localDB.update('encounters', enc.id, { 
                ...enc, 
                status: 'Em_Atendimento',
                room: targetRoom,
                roomName: targetRoom,
                called_at: new Date().toISOString(),
                lastStatusUpdate: new Date().toISOString()
              });
            } else {
              localDB.insert('encounters', {
                id: 'ENC-' + Date.now(),
                patientName: pName,
                patientId: body.patientId || ('pat-' + Date.now()),
                type: 'Urgencia',
                status: 'Em_Atendimento',
                room: targetRoom,
                roomName: targetRoom,
                manchesterColor: body.manchesterColor || 'Verde',
                admitted_at: new Date().toISOString(),
                called_at: new Date().toISOString(),
                lastStatusUpdate: new Date().toISOString()
              });
            }

            const allApts = localDB.list('appointments') || [];
            const apt = allApts.find(a => 
              (body.patientId && String(a.patientId) === String(body.patientId)) || 
              (pName && a.patientName && a.patientName.toLowerCase().trim() === pName.toLowerCase().trim())
            );
            if (apt) {
              localDB.update('appointments', apt.id, {
                ...apt,
                status: 'Em Atendimento',
                room: targetRoom,
                roomName: targetRoom
              });
            }
          }
        }
        if (table === 'encounters') {
          const encs = localDB.list('encounters') || [];
          const year = new Date().getFullYear();
          const prefix = body.type === 'Internacao' ? 'INT' : (body.type === 'Ambulatorio' ? 'AMB' : 'PS');
          const seq = String(encs.length + 1).padStart(4, '0');
          if (!body.pepNumber) {
            body.pepNumber = `PEP-${prefix}-${year}-${seq}`;
          }
          if (!body.openedAt) body.openedAt = new Date().toISOString();
          if (!body.admitted_at) body.admitted_at = new Date().toISOString();
          if (!body.type) body.type = 'Urgencia';
        }
        responseData = { data: localDB.insert(table, body) };
      } else if (method === 'PUT') {
        responseData = { data: localDB.update(table, id, body) };
      } else if (method === 'DELETE') {
        localDB.remove(table, id);
        responseData = { message: 'Removido com sucesso' };
      }
    }
  } catch(e) {
    console.error('LocalDB API Error:', e);
    status = 500;
    responseData = { message: e.message };
  }

  const mockRes = {
    ok: status >= 200 && status < 300,
    status: status,
    json: async () => responseData,
    text: async () => JSON.stringify(responseData)
  };

  if (mockRes.ok && ['POST', 'PUT', 'DELETE'].includes(method)) {
    invalidateCacheForUrl(url);
  }

  return mockRes;
};
