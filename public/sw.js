/**
 * Health Nexus - Service Worker de Alta Resiliência Hospitalar & Push Notifications
 * Versão: 3.15.0
 */

const CACHE_NAME = 'health-nexus-v3.15.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/logo.png',
  '/manual_do_usuario.html',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Falha não-bloqueante ao pré-carregar assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignora requisições de API, banco de dados externo e desenvolvimento local
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('turso.io') ||
    event.request.url.includes('localhost') ||
    event.request.url.includes('127.0.0.1') ||
    event.request.url.includes('/src/') ||
    event.request.url.includes('.js') ||
    event.request.url.includes('.css')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
        return networkResponse;
      }
      const responseToCache = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, responseToCache);
      });
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Suporte a Notificações Push para Médicos de Sobreaviso e Alertas de Pacientes Críticos
self.addEventListener('push', (event) => {
  let data = { title: 'Health Nexus Hospitalar', body: 'Novo alerta assistencial de plantão.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/assets/logo.png',
    badge: '/assets/logo.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Abrir Prontuário' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});
