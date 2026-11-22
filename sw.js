/* Service worker — Riftbound VN
   - App (html, dữ liệu dịch): lấy mạng trước, mất mạng thì dùng bản đã lưu
   - Ảnh thẻ nén (img/*.webp, cùng chỗ với app): lấy bản đã lưu trước, chưa có mới tải rồi lưu
   - Ảnh Riot (set chưa dịch): để trình duyệt tự xử lý, KHÔNG lưu — ảnh không có CORS,
     Chrome sẽ tính mỗi ảnh ~7 MB vào bộ nhớ
   - Font Google: lưu lại sau lần đầu
   Khi phát hành bản mới: tăng VER. Khi thêm set dịch: thêm file vào SHELL. */
const VER = "v5.7";
const APP = "rb-app-" + VER, IMG = "rb-img", FONT = "rb-font";
const SHELL = ["./", "index.html", "manifest.webmanifest",
  "data/cards.js", "data/glossary.js", "data/banned.js", "data/vi_05_radiance.js", "data/vi_04_vendetta.js", "data/vi_03_unleashed.js", "data/vi_02_spiritforged.js", "data/vi_01_origins.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("rb-app-") && k !== APP).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === location.origin && u.pathname.includes("/img/")) e.respondWith(cacheFirst(IMG, req));
  else if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") e.respondWith(cacheFirst(FONT, req));
  else if (u.origin === location.origin) e.respondWith(networkFirst(req));
});

async function cacheFirst(name, req){
  const c = await caches.open(name);
  const hit = await c.match(req.url);
  if (hit) return hit;
  try {
    const r = await fetch(req);
    if (r.ok) await c.put(req.url, r.clone());                  // lưu xong rồi mới trả, để bộ đếm ảnh luôn đúng
    return r;
  } catch (err) { return Response.error(); }
}
async function networkFirst(req){
  const c = await caches.open(APP);
  const cached = () => c.match(req, { ignoreSearch: true }).then(r => r || c.match("index.html"));
  try {
    const r = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no("timeout"), 4000))]);
    if (r.ok) c.put(req, r.clone());
    return r;
  } catch (err) { return (await cached()) || Response.error(); }
}
