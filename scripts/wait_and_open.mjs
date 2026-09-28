import { exec } from 'child_process';

const TARGET_URL = 'http://localhost:5173';
const CHECK_URLS = ['http://127.0.0.1:5173', 'http://localhost:5173'];

const checkReady = async () => {
  for (const url of CHECK_URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(800) });
      if (res.ok || res.status < 500) {
        return true;
      }
    } catch (_) {}
  }
  return false;
};

const run = async () => {
  const maxAttempts = 60; // até 30 segundos
  for (let i = 0; i < maxAttempts; i++) {
    const isReady = await checkReady();
    if (isReady) {
      console.log('\n[Health Nexus] Servidor pronto! Abrindo navegador...');
      exec(`start ${TARGET_URL}`);
      process.exit(0);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Fallback caso demore muito: tenta abrir mesmo assim
  console.log('\n[Health Nexus] Tempo limite atingido, abrindo navegador...');
  exec(`start ${TARGET_URL}`);
  process.exit(0);
};

run();
