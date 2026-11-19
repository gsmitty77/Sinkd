// sinkd-shell-v2 replaces the previous unversioned worker so installed apps update on the next visit.
const CACHE_VERSION = "sinkd-shell-v2";

function appScopeUrl() {
  return new URL("./", self.registration.scope);
}

function safeLinkTarget(value) {
  const target = String(value || "notifications").replace(/^#/, "");
  return /^[a-z0-9_-]{1,40}$/i.test(target) ? target : "notifications";
}

function isAppClient(client) {
  try {
    const url = new URL(client.url);
    const scope = appScopeUrl();
    return url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
  } catch {
    return false;
  }
}

self.addEventListener("install", (event) => {
  const shellUrl = appScopeUrl().href;
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.add(new Request(shellUrl, { cache: "reload" })))
      .catch((error) => {
        console.warn("Sinkd app shell could not be cached", error);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  const requestUrl = new URL(event.request.url);
  const scope = appScopeUrl();
  if (requestUrl.origin !== scope.origin) return;

  event.respondWith(navigationResponse(event.request, scope));
});

async function navigationResponse(request, scope) {
  const cache = await caches.open(CACHE_VERSION);
  const shellRequest = scope.href;
  try {
    const response = await fetch(request);
    const landedOffApp = response.redirected && new URL(response.url).origin !== scope.origin;
    if (landedOffApp || response.type === "opaqueredirect") {
      const shell = await cache.match(shellRequest);
      if (shell) return shell;
    }
    if (response.ok && (request.url === shellRequest || new URL(request.url).pathname === "/index.html")) {
      await cache.put(shellRequest, response.clone()).catch((error) => {
        console.warn("Sinkd app shell could not be updated", error);
      });
    }
    return response;
  } catch (error) {
    const shell = await cache.match(shellRequest);
    if (shell) return shell;
    console.warn("Sinkd navigation fallback missed the app shell", error);
    return Response.error();
  }
}

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Sinkd", {
      body: data.body || "New notification",
      icon: data.icon || "assets/app-icon.png",
      badge: data.badge || "assets/app-icon.png",
      tag: data.tag,
      data: data.data || { linkTarget: "notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = safeLinkTarget(event.notification?.data?.linkTarget);
  const targetUrl = appScopeUrl();
  targetUrl.hash = target;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => isAppClient(client));
      if (existing) {
        return existing.focus().then(() => {
          existing.postMessage({ type: "sinkd-notification-target", target });
        });
      }
      return self.clients.openWindow(targetUrl.href);
    }),
  );
});
