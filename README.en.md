# @claw-lab/wxclawbot-cli

[简体中文](./README.md) | [npm](https://www.npmjs.com/package/@claw-lab/wxclawbot-cli) | [GitHub](https://github.com/lroolle/wxclawbot-cli) | [ClawHub](https://clawhub.ai/lroolle/wxclawbot-send)

Let your AI agent proactively send WeChat messages. Text, images, video, files -- whatever you need.

## Why This Exists

WeChat bots can only reply. They can't initiate. That's like having a secretary who only talks when spoken to and otherwise sits there staring at the wall.

> "Currently doesn't support proactively sending you messages on a schedule"
>
> -- [Lobster's WeChat Integration Tutorial](https://mp.weixin.qq.com/s/nYDQ1obQEHe1WavGpNzasQ)

**Now it does.**

## Install

Send this to your OpenClaw agent (Lobster). That's the whole install process:

```
Install a skill so you can proactively WeChat me: npm install -g @claw-lab/wxclawbot-cli

npm: https://www.npmjs.com/package/@claw-lab/wxclawbot-cli
Source: https://github.com/lroolle/wxclawbot-cli

Let me know when it's done.
```

Copy. Paste. Send. The agent handles installation, config, scheduling -- all of it.

You don't touch the CLI. You don't write cron jobs. You don't need the technical docs below.

## What You Can Do With It

You're not "running commands." You're talking to your agent. These are prompts you send directly:

**Stay-alive reminders:**

> Remind me to drink water every 45 minutes, don't be polite about it

> Every hour of sitting, tell me to get up and move. Be aggressive.

> If I'm still chatting with you after 1 AM, yell at me to go to sleep

> Friday 5:55 PM -- remind me to stop working. Do not accept new tasks.

> Weekdays 11:15 -- remind me to order lunch before delivery queues explode

**DevOps alerts:**

> If CI breaks, WeChat me immediately with whose commit blew it up

> PR sitting unreviewed for 24 hours? Ping me.

> Notify me on every deploy -- success or failure, I want to know

> Production error rate over 1%? Alert me via WeChat, right now

**Business ops:**

> Every morning at 9, send me yesterday's key metrics summary

> Ticket exceeds SLA by 4 hours -- auto-escalate and notify me

> Suspicious login detected? Alert me immediately

> Server disk over 90%? WeChat me

You talk. The agent works. That's the whole idea.

---

Everything below is technical reference for agents, scripts, and developers. Normal humans can stop here.

## CLI Reference

```bash
wxclawbot send --text "message" --json
wxclawbot send --file ./photo.jpg --json
wxclawbot send --file ./report.pdf --text "See attached" --json
wxclawbot send --to "user@im.wechat" --text "Hello" --json
echo "report ready" | wxclawbot send --json
wxclawbot send --text "test" --dry-run
```

| Flag | Description |
|------|-------------|
| `--text <msg>` | Message text. `"-"` to explicitly read stdin |
| `--file <path>` | Local file path or URL (image/video/file) |
| `--to <userId>` | Target user ID. Default: bound user from account |
| `--account <id>` | Account ID. Default: first available |
| `--json` | JSON output. **Always use this.** |
| `--dry-run` | Preview without sending |

Media type auto-detected by extension:

- Image: .png .jpg .jpeg .gif .webp .bmp
- Video: .mp4 .mov .webm .mkv .avi
- File: everything else

## Output Format

```json
{"ok":true,"to":"user@im.wechat","clientId":"..."}
{"ok":false,"error":"ret=-2 (rate limited, try again later)"}
```

Exit codes: 0 = CLI ran, 1 = failure. Note: exit 0 means the CLI executed, not that the message was delivered. Check the `ok` field.

## Error Codes

| ret | meaning | action |
|-----|---------|--------|
| -2 | rate limited | wait 5-10s, retry. Don't tight-loop this. |
| -14 | session expired | re-login via openclaw |

Rate limit: **~7 msgs / 5 min** per bot account, server-side, shared across all clients on the same token.

## Accounts

```bash
wxclawbot accounts --json
```

Auto-discovers from `~/.openclaw/openclaw-weixin/accounts/`. Env override:

```bash
export WXCLAW_TOKEN="bot@im.bot:your-token"
export WXCLAW_BASE_URL="https://ilinkai.weixin.qq.com"
```

## Programmatic API

```typescript
import { WxClawClient } from "@claw-lab/wxclawbot-cli";
import { resolveAccount } from "@claw-lab/wxclawbot-cli/accounts";

const account = resolveAccount();
const client = new WxClawClient({
  baseUrl: account.baseUrl,
  token: account.token,
  botId: account.botId,
});

await client.sendText("user@im.wechat", "Hello");
await client.sendFile("user@im.wechat", "./photo.jpg", { text: "Check this" });
```

See [references/programmatic-api.md](references/programmatic-api.md) for full details.

## Links

- [npm](https://www.npmjs.com/package/@claw-lab/wxclawbot-cli)
- [GitHub](https://github.com/lroolle/wxclawbot-cli)
- [ClawHub](https://clawhub.ai/lroolle/wxclawbot-send) -- `clawhub install wxclawbot-send`
- [WeChat Integration Tutorial](https://mp.weixin.qq.com/s/nYDQ1obQEHe1WavGpNzasQ) -- start here for the basics

## License

MIT
