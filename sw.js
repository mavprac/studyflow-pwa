const CACHE_NAME = "studyflow-shell-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached || caches.match("/index.html"));
      return cached || network;
    })
  );
});

async function showDueNotification(count) {
  if (!count || count < 1) return;
  await self.registration.showNotification("StudyFlow revision reminder", {
    body: `${count} topic${count === 1 ? " is" : "s are"} due for revision today.`,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "studyflow-daily-due",
    renotify: false,
    data: { url: "/" },
    actions: [{ action: "open", title: "Open StudyFlow" }]
  });
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_DUE_NOTIFICATION") {
    event.waitUntil(showDueNotification(Number(event.data.count || 0)));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.focus();
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow("/");
  })());
});

async function countDueTopicsInIndexedDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open("StudyFlowDB", 1);
    request.onerror = () => resolve(0);
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("topics")) {
        database.close();
        resolve(0);
        return;
      }
      const transaction = database.transaction("topics", "readonly");
      const store = transaction.objectStore("topics");
      const cursorRequest = store.openCursor();
      let count = 0;
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        if (cursor.value.nextReviewDate && cursor.value.nextReviewDate <= todayKey) count++;
        cursor.continue();
      };
      transaction.oncomplete = () => { database.close(); resolve(count); };
      transaction.onerror = () => { database.close(); resolve(0); };
    };
  });
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "studyflow-daily-check") {
    event.waitUntil((async () => {
      const count = await countDueTopicsInIndexedDB();
      await showDueNotification(count);
      const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) client.postMessage({ type: "CHECK_DUE_TOPICS" });
    })());
  }
});
