# WebRTC IPv6 Live Starter (LiveKit + coturn)

Minimal可自建的“云游戏式”低延迟直播：浏览器推流 → LiveKit SFU → 手机观看；IPv6 优先，TURN 443 兜底。

## 目录
- `src/server.js` 信令 + token 服务（Express）
- `public/` 前端页：`publisher.html`（主播）、`viewer.html`（观众）
- `config/livekit.yaml` LiveKit 配置（开启 IPv6 / H.264 / 外部 TURN）
- `config/turnserver.conf` coturn 配置
- `docker-compose.yml` 一键跑 livekit + coturn

## 快速开始（本机调试）
1. 安装依赖：`npm install`
2. 启动本地信令页面：`npm run dev`（默认端口 3000）
3. 启动后台媒体平面（可选 Docker，需本机支持虚拟化）：`docker-compose up -d`
4. 浏览器打开 `http://localhost:3000/publisher.html` 推流，手机开 `viewer.html` 观看。

> 若 LiveKit 用 HTTPS/WSS：将 `LIVEKIT_URL=wss://你的域名:7880` 写进 `.env`。

## 环境变量
- `PORT`：信令页面监听端口，默认 3000
- `LIVEKIT_URL`：LiveKit WSS/WS 地址，如 `wss://live.yourdomain.com`
- `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`：与 `config/livekit.yaml` 的 key/secret 保持一致
- `TURN_DOMAIN` / `TURN_USERNAME` / `TURN_PASSWORD`：给前端下发的 TURN，配合 coturn 使用

## 部署要点（公网 IPv6）
- 服务器放行：80/443（HTTPS & TURN-TCP）、3478/5349（TURN）、7880/7881（LiveKit 信令）、50000-50100/UDP（媒体）
- 反向代理（nginx/caddy）为 `3000` 与 `7880` 提供 TLS；移动端需要 HTTPS/WSS。
- `config/livekit.yaml` 中 `use_ipv6: true`，`announcedIp` 自动读取外网；如有多个地址，可在 DNS 只留一条 AAAA。
- coturn：填好证书路径，并将 `TURN_DOMAIN` 指向 443/TCP 以穿透 ISP 防火墙。

## 前端参数（硬件编码/低时延）
- 主播端默认 H.264 + 30fps，GOP 约 1-2s，支持 simulcast 分层，码率输入框控制 `maxBitrate`。
- 观众端启用 `adaptiveStream + dynacast`，弱网自动降层；点击静音切换可避免手机外放。
- 统计窗口每 2 秒刷新，显示码率/FPS/RTT，便于调优。

## 生产化清单
- 替换域名/证书，关闭 `no-udp-relay` 如需 UDP。
- 调整 `port_range_start/end` 以匹配防火墙规则。
- 监控：在 LiveKit 增加 Prometheus 导出或开启 Cloud logs；coturn 开启 `log-file`.
- 备份：可选开启 S3 录制（LiveKit Egress）或旁路 HLS。

## 常见问题
- 看不到画面：确认浏览器允许摄像头/麦克风；移动端需用户手势启动音频（已用按钮触发）。
- 仍然卡顿：检查 TURN 443/TCP 是否通；在移动端使用 720p / 降低码率。
- 无法硬件编码：更新显卡驱动并确保未在浏览器 flag 中禁用硬件视频编码。  
