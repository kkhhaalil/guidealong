#!/usr/bin/env python3
"""Generate sw.js with a complete precache list of every app asset."""
import os, json, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INCLUDE_DIRS = ["css", "js", "assets", "tiles", "vendor"]
FILES = ["index.html", "manifest.webmanifest"]

paths = list(FILES)
for d in INCLUDE_DIRS:
    for base, _, names in os.walk(os.path.join(ROOT, d)):
        for n in sorted(names):
            p = os.path.relpath(os.path.join(base, n), ROOT)
            paths.append(p.replace(os.sep, "/"))
paths = sorted(set(paths))

# content hash of everything -> cache version changes when any asset changes
h = hashlib.sha1()
for p in paths:
    h.update(p.encode())
    with open(os.path.join(ROOT, p), "rb") as f:
        h.update(f.read())
version = h.hexdigest()[:10]

sw = """/* 自动生成：完整预缓存清单（%d 个文件） */
const CACHE = "ynp-tour-%s";
const ASSETS = %s;

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 分批缓存，单个失败重试一次，避免 700 个请求一损俱损
    const chunk = 20;
    for (let i = 0; i < ASSETS.length; i += chunk) {
      await Promise.all(ASSETS.slice(i, i + chunk).map(async (u) => {
        try { await cache.add(u); }
        catch (err) { await cache.add(u); }
      }));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k !== CACHE) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith((async () => {
    const hit = await caches.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(e.request); }
    catch (err) {
      if (e.request.mode === "navigate") {
        return caches.match("index.html");
      }
      throw err;
    }
  })());
});
""" % (len(paths), version, json.dumps(paths, ensure_ascii=False, indent=0))

with open(os.path.join(ROOT, "sw.js"), "w", encoding="utf-8") as f:
    f.write(sw)
print(f"sw.js written: {len(paths)} assets, cache version {version}")
