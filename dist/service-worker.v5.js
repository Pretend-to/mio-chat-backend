const CACHE_VERSION = "v22";
const SHELL_CACHE = `mio-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `mio-assets-${CACHE_VERSION}`;
const MIO_CACHE_PREFIX = "mio-";
const APP_SHELL_URL = "/index.html";
const PRECACHE_URLS = ["/", APP_SHELL_URL, "/manifest.json"];

let isDevMode = false;

async function putIfCacheable(cacheName, request, response) {
  if (!response || !response.ok || response.type === "opaque") return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

async function fetchAndUpdateShell(request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all([
      cache.put(APP_SHELL_URL, response.clone()),
      cache.put(request, response.clone()),
    ]);
  }
  return response;
}

async function handleNavigation(event) {
  // network-first：每次导航都先拿最新 shell（离线再回落缓存）。
  // 曾经的 cache-first 会让「只被恢复、不重新导航」的移动端 PWA 永远停在旧 shell。
  try {
    return await fetchAndUpdateShell(event.request);
  } catch (error) {
    const cache = await caches.open(SHELL_CACHE);
    const fallback =
      (await cache.match(event.request)) || (await cache.match(APP_SHELL_URL));
    if (fallback) return fallback;
    throw error;
  }
}

async function handleStaticAsset(event) {
  const cached = await caches.match(event.request);
  if (cached) return cached;

  const response = await fetch(event.request);
  if (response.ok) {
    event.waitUntil(
      putIfCacheable(ASSET_CACHE, event.request, response).catch((error) => {
        console.warn("[SW] Failed to cache asset:", event.request.url, error);
      }),
    );
  }
  return response;
}

function isStaticAsset(request, url) {
  if (
    ["script", "style", "font", "image", "worker", "manifest"].includes(
      request.destination,
    )
  ) {
    return true;
  }
  return (
    url.pathname.startsWith("/assets/") || url.pathname.startsWith("/static/")
  );
}

function deleteLegacyIndexedDb() {
  return new Promise((resolve) => {
    if (!("indexedDB" in self)) {
      resolve();
      return;
    }
    const request = indexedDB.deleteDatabase("my-cache-db");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          const response = await fetch(url, { cache: "reload" });
          if (response.ok) await cache.put(url, response);
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          const isCurrent =
            cacheName === SHELL_CACHE || cacheName === ASSET_CACHE;
          const isLegacy =
            cacheName === "html-cache" ||
            cacheName.startsWith(MIO_CACHE_PREFIX);
          return isLegacy && !isCurrent
            ? caches.delete(cacheName)
            : Promise.resolve(false);
        }),
      );
      await deleteLegacyIndexedDb();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isDevMode) {
    event.respondWith(fetch(request));
    return;
  }

  // Network traffic must never wait for cache initialization or cache I/O.
  // File storage (/f/), plugins (/p/), API, and WebSocket must bypass Service Worker.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io/") ||
    url.pathname.startsWith("/f/") ||
    url.pathname.startsWith("/p/")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(handleStaticAsset(event));
  }
});

async function clearRuntimeCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(
        (cacheName) =>
          cacheName === "html-cache" || cacheName.startsWith(MIO_CACHE_PREFIX),
      )
      .map((cacheName) => caches.delete(cacheName)),
  );
  await deleteLegacyIndexedDb();
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_IDB_CACHE") {
    event.waitUntil(
      clearRuntimeCaches()
        .then(() => {
          event.ports[0]?.postMessage({ type: "IDB_CACHE_CLEARED" });
        })
        .catch((error) => {
          event.ports[0]?.postMessage({
            type: "IDB_CACHE_CLEAR_FAILED",
            error: String(error),
          });
        }),
    );
  }

  if (event.data?.type === "SET_DEV_MODE") {
    isDevMode = Boolean(event.data.isDevMode);
  }
});

// ==========================================
// Web Push & PWA Notification Handlers
// ==========================================
self.addEventListener("push", (event) => {
  let title = "Mio-Chat 提醒";
  let body = "您有新的消息或任务进展";
  let url = "/";

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload) {
        if (payload.title) title = String(payload.title);
        if (payload.body) body = String(payload.body);
        if (payload.url) url = String(payload.url);
      }
    } catch {
      try {
        const text = event.data.text();
        if (text) body = text;
      } catch {}
    }
  }

  event.waitUntil(
    self.registration
      .showNotification(title, { body, data: { url } })
      .catch((error) => console.error("[SW] showNotification error:", error)),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client && targetUrl) client.navigate(targetUrl);
            return;
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      }),
  );
});
