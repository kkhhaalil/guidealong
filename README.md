# 黄石国家公园 · 离线 GPS 语音导览（GuideAlong 风格演示）

A fully offline, mobile-friendly HTML clone of the GuideAlong GPS audio tour
experience, covering the **Yellowstone National Park Grand Loop** with
**25 stops narrated in natural-sounding Mandarin Chinese**.

Everything is bundled — map tiles, audio, code. After the folder is on your
device, **no internet connection is needed at all**.

## 功能 Features

- 🗺️ **离线地图** — USGS 地形图瓦片（公有领域），缩放级别 9–13，覆盖整个黄石公园
- 🚗 **GPS 自动触发讲解** — 接近景点时自动播放对应的中文讲解，就像真正的 GuideAlong
- 🧭 **两种模式** — 园内使用真实 GPS；在家用「模拟驾驶」沿 304 公里大环线巡游（可调 ×1–×16 倍速）
- 🔊 **自然中文语音** — 25 段原创解说词，使用微软 Edge 神经网络语音（晓晓）预生成，非机器人腔
- 📋 **站点列表** — 收听进度持久保存（localStorage），可手动点播任意站点，可重置
- 📴 **零网络请求** — 已验证运行时不发出任何外部请求

## 站点 Stops (25)

西门入口欢迎词 → 麦迪逊枢纽 → 喷泉颜料锅 → 大棱镜温泉 → 饼干盆地 → 老忠实间歇泉 →
开普勒瀑布 → 西拇指 → 黄石湖 → 钓鱼桥 → 泥火山 → 海登山谷 → 上瀑布 → 艺术家点 →
峡谷村 → 邓雷文山口 → 塔瀑 → 罗斯福塔区 → 拉马尔山谷 → 猛犸热泉 → 金门峡谷 →
咆哮山 → 诺里斯 → 艺术家颜料锅 → 吉本瀑布

## 在手机上离线使用 How to use on mobile

The app is plain static files — any of these works:

1. **简单方式（推荐）**：把整个文件夹拷到手机上，用一个本地静态服务器 App 打开
   （iOS: *Koder*/*Worldwide Web* 等；Android: *Simple HTTP Server* 等），
   访问 `http://localhost:<port>/index.html`。
2. **Android Chrome**：直接用文件管理器打开 `index.html`（`file://` 也能运行）。
3. **电脑测试**：`python3 -m http.server 8000`，浏览器打开 `http://localhost:8000`。

> 真实 GPS 模式需要浏览器授予定位权限；`file://` 或 `localhost` 均视为安全上下文。

## 目录结构

```
index.html            主页面
css/app.css           样式（移动优先）
js/app.js             地图 / 触发 / 播放器 / 模拟器逻辑
js/tour-data.js       25 个站点（坐标、触发半径、原创中文解说词）
js/route-data.js      沿真实道路的大环线路线（OSRM 生成，约 8500 点）
assets/audio/*.mp3    预生成的中文讲解（edge-tts, zh-CN-XiaoxiaoNeural）
tiles/{z}/{x}/{y}.png 离线地图瓦片（USGS The National Map，公有领域）
vendor/leaflet/       Leaflet 1.9.4（本地副本）
```

## 数据来源与许可

- 地图瓦片：[USGS The National Map](https://www.usgs.gov/programs/national-geospatial-program/national-map)（美国政府作品，公有领域）
- 路线几何：[OSRM](http://project-osrm.org/) 演示服务器，基于 © OpenStreetMap 贡献者数据（ODbL）
- 语音：[edge-tts](https://github.com/rany2/edge-tts) 生成；解说词为本项目原创
- 地图库：[Leaflet](https://leafletjs.com/)（BSD-2）

本项目仅为个人离线演示用途，与 GuideAlong 官方无关。
