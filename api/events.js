export default async function handler(req, res) {
  // Configuração Serverless para EventSource
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.write(`data: ${JSON.stringify({ type: 'connected', payload: { server: 'Vercel Serverless Edge' } })}\n\n`);

  // Em ambiente serverless stateless, manter por alguns ciclos antes de fechar
  res.end();
}
