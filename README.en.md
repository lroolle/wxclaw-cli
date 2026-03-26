# @herai/wxclawbot-cli

[简体中文](./README.md) | [npm](https://www.npmjs.com/package/@herai/wxclawbot-cli) | [GitHub](https://github.com/lroolle/wxclawbot-cli) | [ClawHub](https://clawhub.ai/lroolle/wxclawbot-send)

Let your OpenClaw AI agent proactively send WeChat messages. Text, images, video, files -- whatever you need.

## Why This Exists

WeChat's official bot API has one glaring limitation: bots can only *reply*. They can't initiate conversations. It's like hiring an assistant who only speaks when spoken to. Completely useless for reminders, alerts, or anything proactive.

> "Currently doesn't support proactively sending you messages on a schedule"
>
> -- [Lobster's WeChat Integration Tutorial](https://mp.weixin.qq.com/s/nYDQ1obQEHe1WavGpNzasQ)

**This CLI fixes that.** Your OpenClaw agent can now send messages on its own schedule -- timed reminders, monitoring alerts, automated reports. Reuses [openclaw-weixin](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) credentials, no extra auth dance.

## What Can It Actually Do?

### Life Reminders (Before Your Body Reminds You the Hard Way)

```bash
# Every 45 minutes
wxclawbot send --text "Drink water. Don't wait for kidney stones to remind you." --json

# Every hour of sitting
wxclawbot send --text "Your ass has been welded to that chair for 60 minutes. Stand up." --json

# 1 AM and still coding
wxclawbot send --text "Your code quality is receding faster than your hairline. Go to sleep." --json

# Friday 5:55 PM
wxclawbot send --text "5 minutes to freedom. Don't accept new tasks. Don't reply to messages. Prepare to run." --json

# Weekdays 11:15 AM
wxclawbot send --text "Order lunch now or delivery gets backed up until 2 PM. Enjoy hunger-driven development." --json
```

### DevOps (Know When Production Is on Fire)

```bash
# CI/CD broke
wxclawbot send --text "CI is down. It was @zhangsan's commit abc1234. Please clean up your mess." --json

# PR sitting unreviewed for 24h
wxclawbot send --text "PR #42 has been sitting there for 24 hours. Review it. Code doesn't merge itself." --json

# Deploy succeeded
wxclawbot send --text "v2.3.1 is live. Nothing has exploded yet." --json

# Deploy failed
wxclawbot send --text "v2.3.1 blew up. Don't panic. Well, panicking won't help anyway." --json

# Error rate spike
wxclawbot send --text "Production error rate at 15%. Normal is 0.1%. Might want to look at that." --json

# GitHub contributions gap
wxclawbot send --text "Your GitHub contribution graph is turning into a desert. 3 days without commits." --json
```

### Business Operations (Let Robots Do the Boring Stuff)

```bash
# Daily report
wxclawbot send --file ./daily-report.pdf --text "Today's numbers. Attached." --json

# SLA breach
wxclawbot send --text "Ticket #1024 has exceeded SLA by 4 hours. Escalating." --json

# Security alert
wxclawbot send --text "Suspicious login detected from Ho Chi Minh City. If that's not you, change your password now." --json

# Server alert
wxclawbot send --text "prod-03 disk usage at 95%. Clean it up or enjoy the disk-full show." --json

# Screenshots / images
wxclawbot send --file ./monitoring-screenshot.png --text "Dashboard snapshot" --json
```

Combine with cron, GitHub Actions, or your own monitoring scripts. Go wild.

## Install

```bash
clawhub install wxclawbot-send
```

Or via npm:

```bash
npm install -g @herai/wxclawbot-cli
```

Requires Node.js >= 20. This is not negotiable.

## Usage

```bash
wxclawbot send --text "message" --json
wxclawbot send --file ./photo.jpg --json
wxclawbot send --file ./report.pdf --text "See attached" --json
wxclawbot send --to "user@im.wechat" --text "Hello" --json
echo "report ready" | wxclawbot send --json
```

- `--to` defaults to the bound user from your openclaw account. Use `--to` for someone else.
- `--json` -- **always use this**. The non-JSON output format is not stable and you will regret relying on it.
- Supports stdin pipe input for scripting.

Media type auto-detected by extension:
- Image: `.png` `.jpg` `.jpeg` `.gif` `.webp` `.bmp`
- Video: `.mp4` `.mov` `.webm` `.mkv` `.avi`
- File: everything else

## Output

```json
{"ok":true,"to":"user@im.wechat","clientId":"..."}
```

```json
{"ok":false,"error":"ret=-2 (rate limited, try again later)"}
```

**Exit code 0 means the CLI ran successfully. It does NOT mean the message was delivered.** Always check the `ok` field. Yes, this violates the spirit of Unix exit codes. Reality doesn't care about your principles -- network calls and local execution are different things.

## Errors

| ret | meaning | what to do |
|-----|---------|------------|
| -2 | rate limited | Wait 5-10 seconds and retry. Do not `while true` loop this. That makes it worse. |
| -14 | session expired | Re-login via openclaw. Tokens don't last forever. |

Rate limit: **~7 messages / 5 minutes** per bot account, enforced server-side, shared across all clients. No, you can't bypass it with multiple processes. Don't try.

## Accounts

```bash
wxclawbot accounts --json
```

Auto-discovers from `~/.openclaw/openclaw-weixin/accounts/`.

Env var override (for CI/CD or containers):

```bash
export WXCLAW_TOKEN="bot@im.bot:your-token"
export WXCLAW_BASE_URL="https://ilinkai.weixin.qq.com"
```

## Programmatic API

Don't want the CLI? Use it as a library:

```typescript
import { WxClawClient } from "@herai/wxclawbot-cli";
import { resolveAccount } from "@herai/wxclawbot-cli/accounts";

const account = resolveAccount();
const client = new WxClawClient({
  baseUrl: account.baseUrl,
  token: account.token,
  botId: account.botId,
});

await client.sendText("user@im.wechat", "Hello");
await client.sendFile("user@im.wechat", "./photo.jpg", { text: "Check this" });
```

`resolveAccount()` follows the same discovery logic as the CLI: env vars > local account files.

## Links

- [npm](https://www.npmjs.com/package/@herai/wxclawbot-cli)
- [GitHub](https://github.com/lroolle/wxclawbot-cli)
- [ClawHub](https://clawhub.ai/lroolle/wxclawbot-send) -- `clawhub install wxclawbot-send`
- [WeChat Integration Tutorial](https://mp.weixin.qq.com/s/nYDQ1obQEHe1WavGpNzasQ) -- start here for basic setup

## License

MIT -- take it and run.
