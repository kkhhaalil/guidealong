/* 黄石 GPS 语音导览 — 主逻辑（完全离线，无任何网络请求） */
(function () {
  "use strict";

  var CAT_ICON = { geyser: "⛲", spring: "♨️", falls: "🌊", wildlife: "🦬", landmark: "🏞️", info: "ℹ️", story: "📖" };
  var SIM_SPEEDS = [1, 2, 4, 8, 16, 32];  // 倍速档位（基准 60 km/h）
  var BASE_KMH = 60;
  var STORE_KEY = "ynp-tour-visited";

  /* ---------- 状态 ---------- */
  var mode = null;              // "sim" | "gps"
  var simIdx = 0;               // 路线点索引（可为小数）
  var simSpeedIdx = 3;          // 默认 ×8
  var simPaused = false;
  var simTimer = null;
  var follow = true;
  var pos = null;               // {lat, lng}
  var visited = loadVisited();
  var playingStop = null;
  var playingTriggered = false;  // 当前播放是否为到站自动触发
  var queue = [];
  var geoWatch = null;

  /* ---------- DOM ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var audio = $("narrator");

  /* ---------- 工具 ---------- */
  function haversine(a, b) {
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var s = Math.sin(dLat / 2), t = Math.sin(dLng / 2);
    var h = s * s + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * t * t;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function fmtDist(m) {
    return m >= 1000 ? (m / 1000).toFixed(1) + " 公里" : Math.round(m) + " 米";
  }
  function loadVisited() {
    try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || "[]")); }
    catch (e) { return new Set(); }
  }
  function saveVisited() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(visited))); } catch (e) {}
  }

  /* ---------- 地图 ---------- */
  var map = L.map("map", { zoomControl: false, attributionControl: true })
    .setView([44.66, -110.55], 10);
  map.attributionControl.setPrefix(false);
  L.tileLayer("tiles/{z}/{x}/{y}.png", {
    minZoom: 9, maxZoom: 13,
    attribution: "USGS The National Map（离线瓦片）",
    errorTileUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGPiBAAAJwAjfKcXwQAAAABJRU5ErkJggg=="
  }).addTo(map);

  L.polyline(TOUR_ROUTE, { color: "#e8743d", weight: 4, opacity: 0.85 }).addTo(map);

  var markers = {};
  TOUR_STOPS.forEach(function (s, i) {
    var m = L.marker([s.lat, s.lng], { icon: poiIcon(s, i) }).addTo(map);
    m.on("click", function () {
      focusStop(s, false);
      queue = [];
      playStop(s, false);
    });
    markers[s.id] = m;
  });
  function poiIcon(s, i) {
    var cls = "poi-marker" + (visited.has(s.id) ? " visited" : "") +
      (playingStop && playingStop.id === s.id ? " playing" : "");
    return L.divIcon({
      className: "", iconSize: [34, 34], iconAnchor: [17, 30],
      html: '<div class="' + cls + '">' + (CAT_ICON[s.category] || "📍") + "</div>"
    });
  }
  function refreshMarker(s) {
    markers[s.id].setIcon(poiIcon(s, 0));
  }

  var carMarker = L.marker([44.6586, -111.094], {
    icon: L.divIcon({ className: "", iconSize: [38, 38], iconAnchor: [19, 19], html: '<div class="car-marker">🚗</div>' }),
    zIndexOffset: 1000
  }).addTo(map);

  map.on("dragstart", function () { follow = false; $("btn-locate").classList.remove("active"); });

  /* ---------- 位置更新与触发 ---------- */
  function updatePosition(lat, lng) {
    pos = { lat: lat, lng: lng };
    carMarker.setLatLng([lat, lng]);
    if (follow) map.panTo([lat, lng], { animate: true, duration: 0.4 });
    checkTriggers();
    updateNextHint();
    updateListDistances();
  }

  function checkTriggers() {
    if (!pos) return;
    TOUR_STOPS.forEach(function (s) {
      if (visited.has(s.id)) return;
      if (playingStop && playingStop.id === s.id) return;
      if (queue.indexOf(s) !== -1) return;
      if (haversine(pos, s) <= s.radius) {
        if (playingStop) queue.push(s);
        else playStop(s, true);
      }
    });
  }

  function updateNextHint() {
    if (!pos) return;
    var best = null, bestD = Infinity;
    TOUR_STOPS.forEach(function (s) {
      if (visited.has(s.id)) return;
      var d = haversine(pos, s);
      if (d < bestD) { bestD = d; best = s; }
    });
    $("next-stop-hint").textContent = best
      ? "下一站：" + best.name + " · " + fmtDist(bestD)
      : "全部站点已收听完毕 🎉";
  }

  /* ---------- 播放 ---------- */
  var audioCtx = null;
  function chime(done) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var t = audioCtx.currentTime;
      [523.25, 783.99].forEach(function (f, i) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.frequency.value = f; o.type = "sine";
        g.gain.setValueAtTime(0.0001, t + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.18 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.5);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t + i * 0.18); o.stop(t + i * 0.18 + 0.55);
      });
    } catch (e) {}
    setTimeout(done, 750);
  }

  function playStop(s, triggered) {
    playingStop = s;
    playingTriggered = triggered;
    refreshMarker(s);
    $("player-idle").hidden = true;
    $("player-active").hidden = false;
    $("np-icon").textContent = CAT_ICON[s.category] || "📍";
    $("np-name").textContent = s.name;
    $("np-sub").textContent = triggered ? "已到达 · 自动播放" : "手动播放";
    $("btn-play").textContent = "⏸";
    if (triggered) showBanner("📍 已到达「" + s.name + "」");
    var start = function () {
      audio.src = "assets/audio/" + s.id + ".mp3";
      audio.play().catch(function () {
        $("np-sub").textContent = "点击 ▶ 开始播放";
        $("btn-play").textContent = "▶";
      });
    };
    if (triggered) chime(start); else start();
  }

  function finishStop() {
    if (playingStop) {
      var s = playingStop;
      // 手动预听远处的站点不算“已听”，开到附近时仍会自动触发讲解
      if (playingTriggered || (pos && haversine(pos, s) <= s.radius)) {
        visited.add(s.id);
        saveVisited();
      }
      playingStop = null;
      refreshMarker(s);
      renderList();
    }
    if (queue.length) playStop(queue.shift(), true);
    else {
      $("player-active").hidden = true;
      $("player-idle").hidden = false;
      updateNextHint();
    }
  }

  audio.addEventListener("ended", finishStop);
  audio.addEventListener("timeupdate", function () {
    if (audio.duration) $("np-bar").style.width = (audio.currentTime / audio.duration * 100) + "%";
  });
  audio.addEventListener("play", function () { $("btn-play").textContent = "⏸"; $("np-sub").textContent = "正在播放"; });
  audio.addEventListener("pause", function () { if (!audio.ended) { $("btn-play").textContent = "▶"; $("np-sub").textContent = "已暂停"; } });

  $("btn-play").addEventListener("click", function () {
    if (audio.paused) audio.play(); else audio.pause();
  });
  $("btn-skip").addEventListener("click", function () {
    audio.pause();
    finishStop();
  });

  var bannerTimer = null;
  function showBanner(text) {
    var b = $("trigger-banner");
    b.textContent = text;
    b.hidden = false;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { b.hidden = true; }, 5000);
  }

  /* ---------- 模拟驾驶 ---------- */
  var TICK_MS = 500;
  // 预计算路线点间距
  var segLen = [];
  (function () {
    for (var i = 0; i < TOUR_ROUTE.length - 1; i++) {
      segLen.push(haversine(
        { lat: TOUR_ROUTE[i][0], lng: TOUR_ROUTE[i][1] },
        { lat: TOUR_ROUTE[i + 1][0], lng: TOUR_ROUTE[i + 1][1] }
      ));
    }
  })();

  function simTick() {
    if (simPaused) return;
    var meters = BASE_KMH / 3.6 * SIM_SPEEDS[simSpeedIdx] * TICK_MS / 1000;
    var i = Math.floor(simIdx), frac = simIdx - i;
    while (meters > 0 && i < segLen.length) {
      var remain = segLen[i] * (1 - frac);
      if (meters < remain) { frac += meters / segLen[i]; meters = 0; }
      else { meters -= remain; i++; frac = 0; }
    }
    if (i >= segLen.length) { i = 0; frac = 0; showBanner("🏁 环线一圈完成，继续巡游"); }
    simIdx = i + frac;
    var a = TOUR_ROUTE[i], b = TOUR_ROUTE[Math.min(i + 1, TOUR_ROUTE.length - 1)];
    updatePosition(a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac);
  }

  function startSim() {
    mode = "sim";
    $("mode-badge").textContent = "模拟驾驶 · " + BASE_KMH * SIM_SPEEDS[simSpeedIdx] + " km/h";
    $("btn-speed").hidden = false;
    $("btn-pause-sim").hidden = false;
    simTimer = setInterval(simTick, TICK_MS);
    updatePosition(TOUR_ROUTE[0][0], TOUR_ROUTE[0][1]);
    map.setZoom(12);
  }

  function startGps() {
    mode = "gps";
    $("mode-badge").textContent = "真实 GPS 定位中…";
    $("btn-speed").hidden = true;
    $("btn-pause-sim").hidden = true;
    if (!navigator.geolocation) {
      $("mode-badge").textContent = "本设备不支持定位";
      return;
    }
    geoWatch = navigator.geolocation.watchPosition(function (p) {
      $("mode-badge").textContent = "真实 GPS";
      updatePosition(p.coords.latitude, p.coords.longitude);
    }, function (err) {
      $("mode-badge").textContent = "定位失败：" + err.message;
    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
    map.setZoom(12);
  }

  $("btn-speed").addEventListener("click", function () {
    simSpeedIdx = (simSpeedIdx + 1) % SIM_SPEEDS.length;
    this.textContent = "×" + SIM_SPEEDS[simSpeedIdx];
    $("mode-badge").textContent = "模拟驾驶 · " + BASE_KMH * SIM_SPEEDS[simSpeedIdx] + " km/h";
  });
  $("btn-pause-sim").addEventListener("click", function () {
    simPaused = !simPaused;
    this.textContent = simPaused ? "▶" : "⏸";
    $("mode-badge").textContent = simPaused ? "模拟已暂停" : "模拟驾驶 · " + BASE_KMH * SIM_SPEEDS[simSpeedIdx] + " km/h";
  });
  $("btn-locate").addEventListener("click", function () {
    follow = true;
    this.classList.add("active");
    if (pos) map.panTo([pos.lat, pos.lng]);
  });

  /* ---------- 站点列表 ---------- */
  function renderList() {
    var ul = $("stops-list");
    ul.innerHTML = "";
    var done = 0;
    TOUR_STOPS.forEach(function (s, i) {
      if (visited.has(s.id)) done++;
      var li = document.createElement("li");
      if (visited.has(s.id)) li.className = "visited";
      var d = pos ? fmtDist(haversine(pos, s)) : "";
      li.innerHTML =
        '<div class="stop-num">' + (i + 1) + "</div>" +
        '<div class="stop-info"><div class="stop-name">' + CAT_ICON[s.category] + " " + s.name + "</div>" +
        '<div class="stop-en">' + s.nameEn + '<span class="stop-dist" data-sid="' + s.id + '">' + (d ? " · 距离 " + d : "") + "</span></div></div>" +
        '<div class="stop-state">' + (visited.has(s.id) ? "✓ 已听" : "▶ 播放") + "</div>";
      li.addEventListener("click", function () {
        $("stops-panel").hidden = true;
        focusStop(s, false);
        queue = [];
        playStop(s, false);
      });
      ul.appendChild(li);
    });
    $("progress-count").textContent = done + " / " + TOUR_STOPS.length + " 已收听";
  }
  var stopById = {};
  TOUR_STOPS.forEach(function (s) { stopById[s.id] = s; });
  function updateListDistances() {
    if (!pos || $("stops-panel").hidden) return;
    var spans = $("stops-list").querySelectorAll(".stop-dist");
    for (var k = 0; k < spans.length; k++) {
      var s = stopById[spans[k].getAttribute("data-sid")];
      if (s) spans[k].textContent = " · 距离 " + fmtDist(haversine(pos, s));
    }
  }
  function focusStop(s, popup) {
    follow = false;
    $("btn-locate").classList.remove("active");
    map.setView([s.lat, s.lng], 13);
  }

  $("btn-list").addEventListener("click", function () { renderList(); $("stops-panel").hidden = false; });
  $("btn-close-list").addEventListener("click", function () { $("stops-panel").hidden = true; });
  $("btn-reset").addEventListener("click", function () {
    visited = new Set();
    saveVisited();
    TOUR_STOPS.forEach(refreshMarker);
    renderList();
    updateNextHint();
  });

  /* ---------- 启动 ---------- */
  function enterApp(startFn) {
    $("start-overlay").style.display = "none";
    $("app").hidden = false;
    map.invalidateSize();
    $("btn-locate").classList.add("active");
    // 解锁移动端音频（必须在用户手势内）
    audio.muted = true;
    var p = audio.play();
    if (p && p.catch) p.catch(function () {});
    audio.pause();
    audio.muted = false;
    startFn();
  }
  $("btn-start-sim").addEventListener("click", function () { enterApp(startSim); });
  $("btn-start-gps").addEventListener("click", function () { enterApp(startGps); });
})();
