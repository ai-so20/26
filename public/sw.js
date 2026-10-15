const VIP_PRIVATE_URL = "/?tab=private&from=push";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = {
      body: event.data ? event.data.text() : "새 1:1 메시지가 도착했습니다.",
    };
  }

  const targetUrl = new URL(
    data.url || VIP_PRIVATE_URL,
    self.location.origin
  ).href;

  event.waitUntil((async () => {
    const badgeCount = Math.max(0, Number(data.badgeCount || 0));
    try {
      if (badgeCount > 0 && typeof self.navigator?.setAppBadge === "function") {
        await self.navigator.setAppBadge(badgeCount);
      } else if (badgeCount === 0 && typeof self.navigator?.clearAppBadge === "function") {
        await self.navigator.clearAppBadge();
      }
    } catch (_) {}

    await self.registration.showNotification(
      data.title || "(EVENT) 1:1고객센터",
      {
        body: data.body || "새 1:1 메시지가 도착했습니다.",
        icon: "/avatars/admin.png.png",
        badge: "/avatars/admin.png.png",
        tag: data.tag || "vip-private-message",
        renotify: true,
        silent: false,
        data: {
          url: targetUrl,
        },
      }
    );
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification?.data?.url || VIP_PRIVATE_URL,
    self.location.origin
  );
  targetUrl.searchParams.set("tab", "private");
  targetUrl.searchParams.set("from", "push");

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // 열려 있는 VIP 창/PWA가 있으면 해당 창을 직접 딥링크로 이동하고 포커스합니다.
      for (const client of windowClients) {
        try {
          const current = new URL(client.url);
          if (current.origin !== self.location.origin) continue;

          let targetClient = client;

          if ("navigate" in client) {
            targetClient = (await client.navigate(targetUrl.href)) || client;
          }

          if ("focus" in targetClient) {
            await targetClient.focus();
          }

          try {
            targetClient.postMessage({
              type: "VIP_OPEN_PRIVATE",
              url: targetUrl.href,
            });
          } catch (_) {}

          return;
        } catch (_) {}
      }

      // 앱/브라우저가 완전히 닫혀 있으면 새 WindowClient를 엽니다.
      if (self.clients.openWindow) {
        const opened = await self.clients.openWindow(targetUrl.href);

        if (opened) {
          try {
            await opened.focus();
          } catch (_) {}

          // iOS WebKit에서 첫 WindowClient가 바로 메시지를 못 받는 경우가 있으므로
          // URL 자체에도 딥링크 정보를 남겨 page.js가 시작 시 처리하게 합니다.
          try {
            opened.postMessage({
              type: "VIP_OPEN_PRIVATE",
              url: targetUrl.href,
            });
          } catch (_) {}
        }
      }
    })()
  );
});
