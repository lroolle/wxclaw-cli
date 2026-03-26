---
name: wxclaw-send
description: >
  Send WeChat messages via wxclaw CLI. Use when: sending messages to WeChat
  users, notifying WeChat contacts, delivering reports or alerts to WeChat,
  pushing notifications via WeChat. Triggers: send wechat, wxclaw, wechat
  message, notify wechat, weixin message, wx message, wxclaw send, push
  wechat. DO NOT TRIGGER when: sending email, SMS, Slack, Teams, Telegram,
  or other non-WeChat messages.
license: MIT
---

# wxclaw-send

Send text messages to WeChat users via `wxclaw` CLI (`@herai/wxclaw-cli`).
For AI agents, scripts, and cron jobs.

## Prerequisites

- Node.js >= 20
- `npm install -g @herai/wxclaw-cli`
- openclaw-weixin account logged in (credentials at `~/.openclaw/openclaw-weixin/accounts/`)

Verify: `wxclaw accounts --json`

## Quick Start

```bash
wxclaw send --text "Hello from wxclaw" --json
```

## When to Use What

```
Send from shell/agent → wxclaw send --text "msg" --json
Send from TypeScript  → see references/programmatic-api.md
Check account setup   → wxclaw accounts --json
```

## Commands

### send

```bash
wxclaw send --text "message" --json
wxclaw send --to "user@im.wechat" --text "hi" --json
wxclaw send --to "user@im.wechat" Hello world
echo "report ready" | wxclaw send --json
wxclaw send --text "test" --dry-run
```

| Flag | Description |
|------|-------------|
| `--text <msg>` | Message text. `"-"` to explicitly read stdin |
| `--to <userId>` | Target user ID. Default: bound user from account |
| `--account <id>` | Account ID. Default: first available |
| `--json` | Structured JSON output on stdout |
| `--dry-run` | Preview without sending |

### accounts

```bash
wxclaw accounts --json
```

## Agent Integration

ALWAYS use `--json` when calling programmatically. Parse JSON to determine success.

```bash
result=$(wxclaw send --text "Your task is done" --json)
```

- Success: `{"ok":true,"to":"user@im.wechat","clientId":"..."}`
- Failure: `{"ok":false,"error":"..."}`
- Exit codes: 0 = success, 1 = failure

## Error Handling

| Error | Meaning | Action |
|-------|---------|--------|
| `ret=-2` | Rate limited (WeChat API) | Wait 5-10s, retry |
| `ret=-14` | Session expired | Re-login via openclaw |
| No account found | Missing credentials | Run `wxclaw accounts` to diagnose |
| Request timeout | Network issue (15s limit) | Retry |

Rate limits are server-side, shared across all clients on same bot token.

## Common Pitfalls

- ALWAYS use `--json` -- without it, output is human-readable and unparseable
- Check `ok` field in JSON response -- exit 0 means the CLI ran, not that the message was delivered
- Do not retry rate-limited requests (`ret=-2`) in a tight loop -- wait 5-10s minimum
- Pipe large messages via stdin rather than `--text` to avoid shell quoting issues

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `WXCLAW_TOKEN` | Override bot token (`bot@im.bot:your-token`) |
| `WXCLAW_BASE_URL` | Override API endpoint (default: `https://ilinkai.weixin.qq.com`) |

For programmatic TypeScript usage, see [references/programmatic-api.md](references/programmatic-api.md).
