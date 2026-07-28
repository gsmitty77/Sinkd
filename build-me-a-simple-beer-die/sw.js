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
  const target = event.notification?.data?.linkTarget || "notifications";
  const targetUrl = new URL(`./index.html#${target}`, self.location).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.includes("index.html") || client.url.endsWith("/"));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: "sinkd-notification-target", target });
        return;
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
