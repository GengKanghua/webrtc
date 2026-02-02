# WebRTC IPv6 Live Starter (LiveKit + coturn)

“云游戏式”低延迟直播：浏览器推流 → LiveKit SFU 中转 → 手机观看。IPv6 优先，TURN 兜底。

## 目录
- `src/server.js` 信令 + token 服务（Express，显式 `/` 返回 index）
- `public/` 前端页：`publisher.html`（主播）、`viewer.html`（观众）、`index.html` 导航
- `config/livekit.yaml` LiveKit 配置（IPv6 绑定、H.264、外部 TURN）
- `config/turnserver.conf` coturn 配置
- `docker-compose.yml` 一键跑 livekit + coturn（宿主 8780→容器 7880，避开端口冲突）
- `.env.example` 环境变量示例（含 32 字节以上 secret）

## 快速开始（本机/服务器）
1) 安装依赖：`npm install`  
2) 复制 `.env.example` 为 `.env`，确保与 `config/livekit.yaml` 的 key/secret 一致，且 secret ≥ 32 字节：  
   ```
   LIVEKIT_URL=wss://live.example.com     # 经反代 443；直连则 :8780
   LIVEKIT_API_KEY=devkey
   LIVEKIT_API_SECRET=devsecret_change_me_32chars_long_1234
   TURN_DOMAIN=turn.example.com
   TURN_USERNAME=turnuser
   TURN_PASSWORD=turnpass
   PORT=3000
   ```
3) 启动媒体面：`docker-compose up -d`（映射 8780/tcp, 7881/tcp, 50000-50100/udp；TURN 3478/5349）  
4) 启动网页/信令：`npm run dev`（或 pm2 后台：`pm2 start src/server.js --name webrtc-web --cwd /root/webrtc --update-env`）  
5) 访问 `https://web.example.com/`，进入主播/观众页面推流/观看。

## 端口与反代
- 公网放行：80/443，3478/5349 (tcp/udp)，50000-50100/udp。  
- LiveKit 信令容器 7880 已映射到宿主 8780；Nginx 将 `live.example.com` 反代到 `127.0.0.1:8780`（WebSocket 升级）。  
- Web 页面与 `/api/token` 反代到 `127.0.0.1:3000`。  
- TURN 443 由你已有的前端占用，当前使用 3478/5349；若需 TURN 443，需额外 IP 或 stream 端口复用方案。

## 前端参数（低时延）
- 主播：H.264，30fps，GOP 1–2s，支持 simulcast；码率框控制 `maxBitrate`。  
- 观众：`adaptiveStream + dynacast` 自动降层；按钮开启音频。  
- 控制台若提示 `token 不是字符串`，说明未 `await toJwt()` 或 `.env` 未加载；现已在 `server.js` 中 await，并显式加载根目录 `.env`。

## 常见问题速查
- `token` 为 `{}`：确保 `.env` 与 `livekit.yaml` key/secret 一致，且重启 Node；`/api/token` 应返回长 JWT。  
- 7880 端口占用：已改宿主映射 8780；反代到 8780。  
- `LiveKit is not defined`：前端使用本地 `public/lib/livekit-client.umd.min.js`，确认 200 访问。  
- 首页 404：`server.js` 显式返回 `public/index.html`；保证 Node 在仓库根启动。  
- 信令/页面关掉后直播未断：正常，媒体通过 LiveKit 中转，已建连的 WebRTC 会继续。

## 生产化清单
- 换成你的域名/证书；按需扩展媒体端口区间。  
- 监控：LiveKit Prometheus / coturn 日志；带宽上限防止费用失控。  
- 录制/旁路：可启用 LiveKit Egress 或额外 HLS 转封装。  
