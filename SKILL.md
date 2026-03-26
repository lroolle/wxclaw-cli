---
name: wxclaw-send
description: >
  Send proactive WeChat messages via wxclaw CLI. Use when: sending messages
  to WeChat users, notifying WeChat contacts, delivering reports or alerts
  to WeChat. Triggers: send wechat, wxclaw, wechat message, notify wechat,
  weixin message, wx message.
---

# wxclaw-send

Send proactive text messages to WeChat users via `wxclaw` CLI. Designed for AI agents, scripts, and cron jobs.

## Prerequisites

- Node.js >= 20
- `npm install -g @herai/wxclaw-cli`
- An openclaw-weixin account logged in (credentials at `~/.openclaw/openclaw-weixin/accounts/`)

Verify setup:

```bash
wxclaw accounts --json
```

If no accounts found, the user needs to login via openclaw first, or set `WXCLAW_TOKEN` env var.

## Quick Start

```bash
wxclaw send --text "Hello from wxclaw"
```

## Commands

### send

```bash
# Default bound user
wxclaw send --text "message"

# Specific user
wxclaw send --to "user@im.wechat" --text "message"

# Positional args (no --text needed)
wxclaw send --to "user@im.wechat" Hello from wxclaw

# Pipe from stdin
echo "Daily report ready" | wxclaw send

# JSON output (use this for programmatic/agent workflows)
wxclaw send --text "hello" --json
# stdout: {"ok":true,"to":"user@im.wechat","clientId":"uuid"}

# Dry run (no actual send)
wxclaw send --text "test" --dry-run
```

| Flag | Description |
|------|-------------|
| `--text <msg>` | Message text. Use `"-"` to explicitly read stdin |
| `--to <userId>` | Target user ID. Default: bound user from account |
| `--account <id>` | Account ID. Default: first available |
| `--json` | Structured JSON output on stdout |
| `--dry-run` | Preview without sending |

### accounts

```bash
wxclaw accounts         # Human-readable list
wxclaw accounts --json  # JSON array
```

## Agent Integration

ALWAYS use `--json` when calling from an agent. Parse the JSON result to determine success.

```bash
result=$(wxclaw send --text "Your task is done" --json)
```

Success: `{"ok":true,"to":"user@im.wechat","clientId":"..."}`
Failure: `{"ok":false,"error":"..."}`

Exit codes: 0 = success, 1 = failure.

## Error Handling

| Error | Meaning | Action |
|-------|---------|--------|
| `ret=-2` | Rate limited by WeChat API | Wait 5-10s and retry |
| `ret=-14` | Session expired | Re-login via openclaw |
| No account found | Missing credentials | Run `wxclaw accounts` to diagnose |
| Request timeout | Network issue (15s limit) | Retry |

Rate limits are server-side, shared across all clients using the same bot token. Do not retry aggressively.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `WXCLAW_TOKEN` | Override bot token (`bot@im.bot:your-token`) |
| `WXCLAW_BASE_URL` | Override API endpoint (default: `https://ilinkai.weixin.qq.com`) |
