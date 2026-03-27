---
name: wxclawbot-send
version: 0.5.2
description: >
  主动给微信用户发消息（文本、图片、视频、文件）。微信机器人默认只能被动回复，
  这个技能让 agent 能主动推送消息到用户微信。
  Use when: 主动发微信, 定时提醒, 告警通知, 推送报告, 发图片/文件到微信,
  proactive WeChat message, push notification to WeChat, send image/file to WeChat.
  Triggers: 发微信, 微信通知, 微信提醒, 推送微信, wxclawbot, send wechat,
  wechat message, weixin message, wx message, push wechat, send image wechat.
  DO NOT TRIGGER when: 发邮件, 发短信, Slack, Teams, Telegram 等非微信消息。
metadata:
  openclaw:
    requires:
      bins: [wxclawbot]
      config: [~/.openclaw/openclaw-weixin/accounts/]
    primaryEnv: WXCLAW_TOKEN
    install:
      - kind: node
        package: "@claw-lab/wxclawbot-cli"
        bins: [wxclawbot]
    os: [macos, linux]
    envVars:
      - name: WXCLAW_TOKEN
        required: false
        description: "覆盖 bot token (bot@im.bot:your-token)"
      - name: WXCLAW_BASE_URL
        required: false
        description: "覆盖 API 端点 (默认: https://ilinkai.weixin.qq.com)"
    author: lroolle
    links:
      homepage: https://github.com/lroolle/wxclawbot-cli
      repository: https://github.com/lroolle/wxclawbot-cli
---

# wxclawbot-send

## 这个技能解决什么问题

微信机器人（iLink Bot）只能被动回复用户消息，不能主动发起对话。
这意味着 agent 没法做定时提醒、告警推送、报告发送等主动触达场景。

这个技能通过 `wxclawbot` CLI 让 agent 能主动给微信用户推送消息，
包括文本、图片、视频、文件。配合 cron 可实现定时任务。

## 前置条件

- Node.js >= 20
- `npm install -g @claw-lab/wxclawbot-cli`
- openclaw-weixin 已登录（凭证在 `~/.openclaw/openclaw-weixin/accounts/`）

验证: `wxclawbot accounts --json`

## 快速上手

```bash
wxclawbot send --text "消息内容" --json
wxclawbot send --file ./photo.jpg --json
wxclawbot send --file ./report.pdf --text "请查收" --json
```

## 什么时候用什么

```
主动发文本消息  → wxclawbot send --text "msg" --json
主动发文件/图片 → wxclawbot send --file ./path --json
检查账号状态    → wxclawbot accounts --json
编程调用        → see references/programmatic-api.md
```

## 命令参考

### send

```bash
wxclawbot send --text "message" --json
wxclawbot send --to "user@im.wechat" --text "你好" --json
wxclawbot send --file ./photo.jpg --json
wxclawbot send --file ./report.pdf --text "请查收" --json
wxclawbot send --file "https://example.com/img.png" --json
echo "日报已生成" | wxclawbot send --json
wxclawbot send --text "test" --dry-run
```

| 参数 | 说明 |
|------|------|
| `--text <msg>` | 消息文本。`"-"` 显式读 stdin |
| `--file <path>` | 本地文件或 URL（图片 / 视频 / 文件） |
| `--to <userId>` | 目标用户 ID。默认: 账号绑定用户 |
| `--account <id>` | 指定账号。默认: 第一个可用的 |
| `--json` | JSON 格式输出。**编程调用必须带上** |
| `--dry-run` | 预览，不发送 |

媒体类型按扩展名自动识别:
- 图片: .png .jpg .jpeg .gif .webp .bmp
- 视频: .mp4 .mov .webm .mkv .avi
- 文件: 其他所有

### accounts

```bash
wxclawbot accounts --json
```

返回: `[{"id":"<botId>-im-bot","configured":true,"baseUrl":"..."}]`

## 账号发现机制

CLI 自动从 `~/.openclaw/openclaw-weixin/accounts/*.json` 发现账号。
每个文件包含 `token`, `baseUrl`, `userId`（默认 `--to` 目标）。

- Bot ID 从 token 运行时提取（不是硬编码的）
- 账号 ID 会在 openclaw-weixin 升级或重新注册后变化
- `--to` 默认是账号文件里的 `userId`（绑定用户）
- 设了 `WXCLAW_TOKEN` 环境变量会覆盖文件发现

### Context Token（主动推送关键）

微信要求 `context_token` 才能主动推送消息。没有它，消息会留在服务器上，
直到用户主动打开聊天窗口才能看到——这就不叫"主动推送"了。

CLI 自动读取 `{accountId}.context-tokens.json`（和账号文件同目录）。
这个文件由 openclaw-weixin 维护，格式是 `userId → contextToken` 的映射。
不需要手动配置——用户给机器人发过消息后 openclaw-weixin 会自动保存。

如果 context_token 缺失（新用户、token 过期），消息仍然会发送成功
（`ok:true`），但不会主动推送通知。

升级 openclaw-weixin 后，务必用 `wxclawbot accounts --json` 验证。

## Agent 集成

编程调用**必须**用 `--json`。解析 JSON 判断是否成功。

```bash
result=$(wxclawbot send --text "任务完成" --json)
result=$(wxclawbot send --file ./chart.png --text "每日指标" --json)
```

- 成功: `{"ok":true,"to":"user@im.wechat","clientId":"..."}`
- 失败: `{"ok":false,"error":"..."}`
- 退出码: 0 = CLI 执行成功, 1 = 失败

注意: exit 0 只代表 CLI 跑完了，不代表消息送达。**看 `ok` 字段**。

## 错误处理

| 错误 | 含义 | 处理 |
|------|------|------|
| `ret=-2` | 频率限制（每 bot 约 7 条 / 5 分钟，所有客户端共享） | 等 60-120 秒重试，别搞紧循环 |
| `ret=-14` | 会话过期 | 通过 openclaw 重新登录 |
| No account found | 凭证缺失 | 跑 `wxclawbot accounts` 排查 |
| CDN upload error | 文件上传失败 | 检查文件大小 / 格式，重试 |
| Request timeout | 网络问题（15 秒超时） | 重试 |

频率限制是服务端的，同一个 bot token 下所有客户端共享配额。

### 结构化传输错误 (v0.5.1+)

`--json` 模式下，传输层失败会包含额外字段:

```json
{"ok":false,"error":"send failed: ...","errorKind":"timeout","retryable":true}
```

| `errorKind` | 含义 | `retryable` |
|-------------|------|-------------|
| `timeout` | 请求超过 15 秒 | true |
| `dns` | DNS 解析失败 | true |
| `connection` | 连接重置 / socket hang up | true |
| `network` | 连接被拒 / 主机不可达 / fetch failed | true |
| `tls` | 证书或 TLS 错误 | false |
| `unknown` | 未分类错误 | false |

用 `retryable` 字段判断应该重试还是直接失败。

## 常见坑

- **必须用 `--json`** —— 不带的话输出是人类可读格式，没法解析
- **看 `ok` 字段** —— exit 0 只代表 CLI 跑了，不代表消息到了
- **别紧循环重试 `ret=-2`** —— 至少等 5-10 秒
- **大文本用 stdin** —— `echo "..." | wxclawbot send --json`，避免 shell 引号问题
- **文件会加密上传到微信 CDN** —— 大文件可能要等一会

## 环境变量

| 变量 | 用途 |
|------|------|
| `WXCLAW_TOKEN` | 覆盖 bot token (`bot@im.bot:your-token`) |
| `WXCLAW_BASE_URL` | 覆盖 API 端点 (默认: `https://ilinkai.weixin.qq.com`) |

编程接口详见 [references/programmatic-api.md](references/programmatic-api.md)。
