# 黄石国家公园 · 离线 GPS 语音导览（GuideAlong 风格演示）

A fully offline, mobile-friendly HTML clone of the GuideAlong GPS audio tour
experience, covering the **Yellowstone National Park Grand Loop** with
**53 stops narrated in natural-sounding Mandarin Chinese**.

Everything is bundled — map tiles, audio, code. After the folder is on your
device, **no internet connection is needed at all**.

## 功能 Features

- 🗺️ **离线地图** — USGS 地形图瓦片（公有领域），缩放级别 9–13，覆盖整个黄石公园
- 🚗 **GPS 自动触发讲解** — 接近景点时自动播放对应的中文讲解，就像真正的 GuideAlong
- 🧭 **方向感知触发** — 只播报前方的站点，自动跳过正在驶离的点（环线折返、支线更准）
- 🧭 **两种模式** — 园内使用真实 GPS；在家用「模拟驾驶」沿 304 公里大环线巡游（可调 ×1–×32 倍速）
- 🔊 **自然中文语音** — 53 段原创解说词，使用微软 Edge 神经网络语音（云健）预生成，非机器人腔
- 📖 **分层讲解** — 精选站点提供「了解更多」延伸讲解与文字实录
- 🌦️ **季节 / 野生动物提示** — 每站附上最佳时段、开放信息与常见动物
- 🖼️ **站点配图** — 每站一张离线封面卡片（可替换为真实照片）
- 🚘 **锁屏 / 车机控制** — MediaSession 支持锁屏与蓝牙车机的播放控制；行车时屏幕常亮
- ⏯ **自动续播** — 记住上次行程位置，重开即可「继续上次行程」
- 📋 **站点列表** — 收听进度持久保存（localStorage），可手动点播任意站点，可重置
- 📴 **零网络请求** — 已验证运行时不发出任何外部请求
- 📲 **PWA 可安装** — Service Worker 预缓存全部 770 个文件；通过 HTTPS 访问一次后即可完全离线使用，并可「添加到主屏幕」

## 站点 Stops (53)

📖 = 趣闻故事站（穿插在景点之间的历史与冷知识）

欢迎来到黄石国家公园 → 📖 一九八八年大火 → 麦迪逊枢纽 → 火洞峡谷景观路 → 喷泉颜料锅 →
大喷泉间歇泉 → 📖 沉睡的巨人 → 大棱镜温泉 → 饼干盆地 → 📖 牵牛花池的教训 → 黑沙盆地 →
老忠实间歇泉 → 开普勒瀑布 → 大陆分水岭·伊萨湖 → 📖 黄石的冬天 → 西拇指间歇泉盆地 →
📖 黄石湖保卫战 → 天然桥 → 黄石湖 → 钓鱼桥 → 勒哈迪浅滩 → 泥火山 → 硫磺锅 → 海登山谷 →
📖 看熊的年代 → 上瀑布观景点 → 艺术家点·黄石大峡谷 → 北缘·瞭望点 → 峡谷村 → 邓雷文山口 →
📖 灰熊与飞蛾 → 塔瀑 → 方解石泉观景台 → 罗斯福塔区 → 斯劳溪 → 📖 野牛重生之地 →
拉马尔山谷 → 石化树 → 📖 黄石名字的由来 → 黑尾鹿高原 → 温丁瀑布 → 猛犸热泉 → 金门峡谷 →
天鹅湖平原 → 食羊崖 → 柳树公园 → 黑曜岩崖 → 📖 马车旅行年代 → 咆哮山 → 诺里斯间歇泉盆地 →
艺术家颜料锅 → 绿玉泉 → 吉本瀑布

## 在手机上离线使用 How to use on mobile

The app is plain static files — any of these works:

1. **PWA 安装（最佳体验）**：把仓库部署到任意 HTTPS 静态托管（如 GitHub Pages，
   需要仓库为 public 或付费计划），手机浏览器打开一次让 Service Worker 完成缓存，
   然后「添加到主屏幕」。之后完全离线可用，托管挂了也不影响。
2. **本地服务器 App**：把整个文件夹拷到手机上，用本地静态服务器 App 打开
   （iOS: *Koder*/*Worldwide Web* 等；Android: *Simple HTTP Server* 等），
   访问 `http://localhost:<port>/index.html`。
3. **Android Chrome**：直接用文件管理器打开 `index.html`（`file://` 也能运行，
   但 Service Worker 不会注册，仅基础功能）。
4. **电脑测试**：`python3 -m http.server 8000`，浏览器打开 `http://localhost:8000`。

> 真实 GPS 模式需要浏览器授予定位权限；`file://` 或 `localhost` 均视为安全上下文。
> Service Worker（PWA 离线缓存）只在 HTTPS 或 `localhost` 下注册。
> iOS 提示：长期不用可能被 Safari 清缓存，出行前打开一次确认仍可离线。

## 目录结构

```
index.html            主页面（含 manifest 链接与 Service Worker 注册）
manifest.webmanifest  PWA 清单（standalone、中文名称、图标）
sw.js                 Service Worker（scripts/gen_sw.py 生成，勿手改）
css/app.css           样式（移动优先）
js/app.js             地图 / 触发 / 播放器 / 模拟器 / MediaSession / 续播逻辑
js/tour-data.js       53 个站点（坐标、触发半径、原创中文解说词）+ STOP_EXTRAS 增强字段
js/route-data.js      沿真实道路的大环线路线（OSRM 生成，约 8500 点）
assets/audio/*.mp3    预生成的中文讲解（edge-tts, zh-CN-YunjianNeural）；<id>-more.mp3 为延伸讲解
assets/photos/*.svg   每站离线封面卡片（scripts/gen_photos.py 生成，可替换为真实照片）
assets/icons/         PWA 图标（scripts/gen_icons.mjs 生成）
tiles/{z}/{x}/{y}.png 离线地图瓦片（USGS The National Map，公有领域）
vendor/leaflet/       Leaflet 1.9.4（本地副本）
scripts/              资源生成与测试脚本（见 CLAUDE.md）
```

## 重新生成资源 Regenerating assets

修改站点/解说词后（详细说明见 `CLAUDE.md`）：

```bash
pip install edge-tts
python3 scripts/gen_audio.py    # 依据 js/tour-data.js 重新生成 MP3
python3 scripts/gen_route.py    # 站点顺序变化时重新生成路线
python3 scripts/get_tiles.py    # 重新下载 USGS 瓦片（先 --count 预估）
node scripts/gen_icons.mjs      # 重新生成 PWA 图标
python3 scripts/gen_sw.py       # ⚠️ 任何资源变动后必须重跑，刷新预缓存清单
```

测试：

```bash
python3 -m http.server 8000
node scripts/test_app.mjs       # 主流程 + 零外部请求断言
node scripts/test_pwa.mjs       # PWA 预缓存 + 断网重载验证
```

## 数据来源与许可

- 地图瓦片：[USGS The National Map](https://www.usgs.gov/programs/national-geospatial-program/national-map)（美国政府作品，公有领域）
- 路线几何：[OSRM](http://project-osrm.org/) 演示服务器，基于 © OpenStreetMap 贡献者数据（ODbL）
- 语音：[edge-tts](https://github.com/rany2/edge-tts) 生成；解说词为本项目原创
- 地图库：[Leaflet](https://leafletjs.com/)（BSD-2）

本项目仅为个人离线演示用途，与 GuideAlong 官方无关。
