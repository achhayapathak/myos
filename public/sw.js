// ==============================================================================
// MyOS Service Worker (PWA Shell & Offline Support)
// ==============================================================================

const CACHE_NAME = "myos-cache-v1"
const OFFLINE_URL = "/offline"

// Static Application Shell Assets to Pre-cache
const PRECACHE_ASSETS = [
  "/",
  "/today",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
]

// Install Event: Pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // Cache assets safely without failing installation if any individual route returns redirect
        await Promise.allSettled(
          PRECACHE_ASSETS.map((asset) =>
            fetch(asset)
              .then((response) => {
                if (response.ok && response.status === 200) {
                  return cache.put(asset, response)
                }
              })
              .catch(() => {
                // Ignore transient network or redirect errors during installation
              })
          )
        )
      })
      .then(() => self.skipWaiting())
  )
})

// Activate Event: Clean up stale caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch Event: Explicit routing
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. Non-GET requests (database mutations / server actions)
  // Per architectural rule: database mutations require connectivity.
  if (request.method !== "GET") {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Offline: Database mutations require active network connectivity.",
          }),
          {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "application/json" },
          }
        )
      })
    )
    return
  }

  // 2. Navigation requests (HTML pages)
  // Network-first with cache fallback and offline application shell fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // If network fetch succeeds, cache the page clone
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return networkResponse
        })
        .catch(async () => {
          // Attempt to serve previously cached page
          const cachedPage = await caches.match(request)
          if (cachedPage) {
            return cachedPage
          }
          // Fall back to pre-cached offline application shell
          const offlineShell = await caches.match(OFFLINE_URL)
          if (offlineShell) {
            return offlineShell
          }
          return new Response("You are currently offline. Please reconnect.", {
            headers: { "Content-Type": "text/plain" },
          })
        })
    )
    return
  }

  // 3. Static Assets (_next/static, fonts, icons, images)
  // Stale-While-Revalidate: serve cached version immediately, update cache in background
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone)
              })
            }
            return networkResponse
          })
          .catch(() => cachedResponse)

        return cachedResponse || fetchPromise
      })
    )
    return
  }

  // 4. Default: Try network first, fall back to cache
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        return networkResponse
      })
      .catch(() => caches.match(request))
  )
})

// Listen for skip waiting messages from client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

// ==============================================================================
// Web Push Notifications Handling
// ==============================================================================

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {
      title: "MyOS Notification",
      body: event.data ? event.data.text() : "",
    }
  }

  const title = data.title || "MyOS Notification"
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-192x192.png",
    data: {
      url: data.url || "/today",
      ...data.data,
    },
    tag: data.tag || "myos-notification",
    renotify: true,
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/today"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If an existing MyOS tab is open, focus it and navigate
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl)
          }
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})

