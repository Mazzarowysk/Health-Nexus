import dns from 'dns';
import app, { init } from './app.js';

dns.setDefaultResultOrder('ipv4first');

const PORT = process.env.PORT || 3001;

process.on('unhandledRejection', (reason) => {
  console.warn('[Backend] Rejeição de Promise não tratada evitada:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.warn('[Backend] Exceção não tratada evitada:', err?.message || err);
});

const start = async () => {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` Health Nexus API rodando no Localhost!`);
    console.log(` Endpoint: http://localhost:${PORT}`);
    console.log(` Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=========================================`);
  });

  // Inicializa o banco de dados em segundo plano sem bloquear as rotas
  init().then(() => {
    console.log('[INIT] Banco de dados inicializado com sucesso.');
  }).catch((err) => {
    console.warn('[INIT] Aviso na inicialização do banco local/nuvem:', err?.message || err);
  });
};

start();
