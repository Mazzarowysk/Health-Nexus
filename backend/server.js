import dns from 'dns';
import app, { init } from './app.js';

dns.setDefaultResultOrder('ipv4first');

const PORT = process.env.PORT || 3001;

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
    console.error('[INIT] Erro na inicialização do banco:', err);
  });
};

start();
