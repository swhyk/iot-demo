# 为 publisher.js 添加 Express 数据可视化页面 — 实施计划

> 说明：本次请求中提到的 `trae-remote-official:lark` 插件封装的是飞书/Lark 相关能力（消息、文档、日历等），与本项目的 MQTT 可视化需求无关，因此不调用该插件，按普通工程任务规划。

## Summary

在现有 `publisher.js` 中集成 Express，使其在向 MQTT Broker 发布模拟温度数据的同时，通过 SSE 将数据实时推送到浏览器页面。新增 `public/` 目录下的静态页面，用折线图实时展示温度曲线、当前值和累计消息数。

## Current State Analysis

- [publisher.js](file:///c:/Users/yangke/iot-demo/publisher.js)：连接 `.env` 中的 Broker，连接成功后每 2 秒发布一条 `消息编号:N, Hello MQTT` 到 `TOPIC`，无 HTTP 服务。
- [subscriber.js](file:///c:/Users/yangke/iot-demo/subscriber.js)：订阅同一主题并打印消息，本次不改动。
- [.env](file:///c:/Users/yangke/iot-demo/.env)：`MQTT_URL=mqtt://localhost:1883`、`TOPIC=iot/demo/temperature`（主题暗示温度场景）。
- [package.json](file:///c:/Users/yangke/iot-demo/package.json)：仅声明 `dotenv`、`mqtt`；`node_modules` 已存在，但 `express` **未安装**（`node_modules/express` 不存在）。
- Node 版本 v24.20.0，CommonJS（`"type": "commonjs"`）。

## Proposed Changes

### 1. `package.json` — 新增依赖与脚本

- 安装 `express`（执行 `npm install express`，写入 dependencies 并更新 package-lock.json）。
- 在 `scripts` 中新增：
  - `"start:publisher": "node publisher.js"`
  - `"start:subscriber": "node subscriber.js"`
- 其余字段（`main`、`test` 等）保持不变。

### 2. `publisher.js` — 发布模拟温度 + Express + SSE

改动要点：

- 顶部引入 `express`、`path`，读取 `PORT`（`process.env.PORT || 3000`）。
- 新增模拟温度生成函数：`Number((20 + Math.random() * 10).toFixed(1))`（20–30℃ 区间，1 位小数）。
- 定时器回调（保持 2000ms 间隔）：
  1. 生成温度值；
  2. 发布 payload 为温度值的字符串（如 `"23.4"`）到 `TOPIC`；
  3. 控制台输出 `📤发布：温度 23.4℃ (#count)`；
  4. 向所有 SSE 客户端广播 `data: {"time":"HH:mm:ss","value":23.4,"count":N}\n\n`；
  5. `count` 自增（用于统计卡片）。
- Express 部分：
  - `app.use(express.static(path.join(__dirname, 'public')))` 托管页面；
  - `GET /events`：设置 `Content-Type: text/event-stream`、`Cache-Control: no-cache`、`Connection: keep-alive`，调用 `res.flushHeaders()`，将 `res` 存入 `Set`，监听 `req.on('close')` 时从 `Set` 删除；
  - `app.listen(PORT)` 并在控制台打印 `🌐 可视化页面: http://localhost:3000`；
  - Express 在 MQTT 连接前启动（页面可先打开，等待数据）。
- 保留现有 MQTT `error` 事件处理；MQTT `connect` 回调内启动定时器（行为不变）。

### 3. `public/index.html` — 页面结构（新建）

- 单页布局：标题、状态徽标（已连接/已断开）、当前温度大数字、累计发布条数、Canvas 折线图。
- 引入 Chart.js CDN：`https://cdn.jsdelivr.net/npm/chart.js`。
- 少量内联 CSS（深色卡片风格、响应式宽度），不引入额外 CSS 框架。
- 末尾引入 `app.js`。

### 4. `public/app.js` — 前端逻辑（新建）

- `new EventSource('/events')`：
  - `onmessage`：`JSON.parse` 后，将 `time` 推入 `labels`、`value` 推入 `data`，超过 30 个点时移除最早的（滑动窗口），调用 `chart.update('none')`；同步更新当前温度文本与累计条数；
  - `onopen`：状态置为「已连接」；
  - `onerror`：状态置为「已断开（自动重连中）」（EventSource 自带重连）。
- Chart.js 配置：`type: 'line'`、单数据集、`tension: 0.3`、`pointRadius: 0`、不显示图例、Y 轴固定 15–35℃。
- 页面加载时先 `fetch('/events')` 不必要——直接依赖 SSE，无需额外接口。

### 5. `.env` — 新增端口配置

- 追加 `PORT=3000`（`.env` 已在 `.gitignore` 中，不涉及提交敏感信息）。

## Assumptions & Decisions

| 决策点 | 结论 |
|---|---|
| 可视化数据 | 模拟温度曲线（按用户选择） |
| 推送方式 | SSE（零新增依赖，单向推送足够） |
| 前端组织 | `public/index.html` + `public/app.js`，Express 静态托管 |
| 图表库 | Chart.js CDN；运行时浏览器需可访问外网 |
| 消息格式 | 发布端 payload 改为温度字符串（如 `23.4`），`subscriber.js` 无需改动即可看到温度值 |
| 数据窗口 | 图表保留最近 30 个点（约 1 分钟） |
| 非目标 | 不引入数据库、不做历史持久化、不改动 `subscriber.js`、不引入 socket.io/前端构建工具 |

## Verification

1. `npm install express` 成功，`package.json` 与 lock 文件更新。
2. `node publisher.js` 启动后控制台出现两条日志：MQTT 已连接、可视化页面地址。
3. 浏览器打开 `http://localhost:3000`：
   - 状态显示「已连接」；
   - 折线图每 2 秒新增一个点并更新当前温度与累计条数；
   - 打开前等待若干秒后，页面从下一个数据点开始绘制（不补历史）。
4. 另开终端运行 `node subscriber.js`，可看到形如 `收到主题[iot/demo/temperature] : 23.4` 的消息，与页面数值一致。
5. 刷新页面或短暂断开网络后，EventSource 自动重连，状态徽标恢复正常。
6. MQTT Broker 未启动场景：页面仍可访问，状态为「已断开」（无数据），控制台打印连接错误——符合预期降级。
