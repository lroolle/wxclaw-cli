---
name: wxclawbot-send
version: 0.4.0
description: >
  Send messages to WeChat users via wxclawbot CLI. Supports text, images,
  video, and file attachments. Use when: sending messages to WeChat users,
  notifying WeChat contacts, delivering reports or media to WeChat, pushing
  notifications via WeChat. Triggers: send wechat, wxclawbot, wechat message,
  notify wechat, weixin message, wx message, wxclawbot send, push wechat,
  send image wechat, send file wechat. DO NOT TRIGGER when: sending email,
  SMS, Slack, Teams, Telegram, or other non-WeChat messages.
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
        description: "Override bot token (bot@im.bot:your-token)"
      - name: WXCLAW_BASE_URL
        required: false
        description: "Override API endpoint (default: https://ilinkai.weixin.qq.com)"
    author: lroolle
    links:
      homepage: https://github.com/lroolle/wxclawbot-cli
      repository: https://github.com/lroolle/wxclawbot-cli
---

# wxclawbot-send

Send text, images, video, and files to WeChat users via `wxclawbot` CLI (`@claw-lab/wxclawbot-cli`).
For AI agents, scripts, and cron jobs.

## Prerequisites

- Node.js >= 20
- `npm install -g @claw-lab/wxclawbot-cli`
- openclaw-weixin account logged in (credentials at `~/.openclaw/openclaw-weixin/accounts/`)

Verify: `wxclawbot accounts --json`

## Quick Start

```bash
wxclawbot send --text "Hello" --json
wxclawbot send --file ./photo.jpg --json
```

## When to Use What

```
Send text from shell/agent  → wxclawbot send --text "msg" --json
Send file from shell/agent  → wxclawbot send --file ./path --json
Send from TypeScript code   → see references/programmatic-api.md
Check account setup         → wxclawbot accounts --json
```

## Commands

### send

```bash
wxclawbot send --text "message" --json
wxclawbot send --to "user@im.wechat" --text "hi" --json
wxclawbot send --file ./photo.jpg --json
wxclawbot send --file ./report.pdf --text "See attached" --json
wxclawbot send --file "https://example.com/img.png" --json
echo "report ready" | wxclawbot send --json
wxclawbot send --text "test" --dry-run
```

| Flag | Description |
|------|-------------|
| `--text <msg>` | Message text. `"-"` to explicitly read stdin |
| `--file <path>` | Local file path or URL (image/video/file) |
| `--to <userId>` | Target user ID. Default: bound user from account |
| `--account <id>` | Account ID. Default: first available |
| `--json` | Structured JSON output on stdout |
| `--dry-run` | Preview without sending |

Media type is auto-detected by file extension:
- Image: .png .jpg .jpeg .gif .webp .bmp
- Video: .mp4 .mov .webm .mkv .avi
- File: everything else

### accounts

```bash
wxclawbot accounts --json
```

## Agent Integration

ALWAYS use `--json` when calling programmatically. Parse JSON to determine success.

```bash
result=$(wxclawbot send --text "Your task is done" --json)
result=$(wxclawbot send --file ./chart.png --text "Daily metrics" --json)
```

- Success: `{"ok":true,"to":"user@im.wechat","clientId":"..."}`
- Failure: `{"ok":false,"error":"..."}`
- Exit codes: 0 = success, 1 = failure

## Error Handling

| Error | Meaning | Action |
|-------|---------|--------|
| `ret=-2` | Rate limited (WeChat API) | Wait 5-10s, retry |
| `ret=-14` | Session expired | Re-login via openclaw |
| No account found | Missing credentials | Run `wxclawbot accounts` to diagnose |
| CDN upload error | File upload failed | Check file size/format, retry |
| Request timeout | Network issue (15s limit) | Retry |

Rate limits are server-side, shared across all clients on same bot token.

## Common Pitfalls

- ALWAYS use `--json` -- without it, output is human-readable and unparseable
- Check `ok` field in JSON response -- exit 0 means the CLI ran, not that the message was delivered
- Do not retry rate-limited requests (`ret=-2`) in a tight loop -- wait 5-10s minimum
- Pipe large text via stdin rather than `--text` to avoid shell quoting issues
- Files are encrypted and uploaded to WeChat CDN -- large files may take time

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `WXCLAW_TOKEN` | Override bot token (`bot@im.bot:your-token`) |
| `WXCLAW_BASE_URL` | Override API endpoint (default: `https://ilinkai.weixin.qq.com`) |

For programmatic TypeScript usage, see [references/programmatic-api.md](references/programmatic-api.md).
