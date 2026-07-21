import dns from 'dns';
import app, { init } from './app.js';
import dotenv from 'dotenv';

dns.setDefaultResultOrder('ipv4first');

// Carrega as variáveis do arquivo .env
dotenv.config();

const PORT = process.env.PORT || 3001;

const start = async () => {
  await init();
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` Health Nexus API rodando no Localhost!`);
    console.log(` Endpoint: http://localhost:${PORT}`);
    console.log(` Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=========================================`);
  });
};

start();
