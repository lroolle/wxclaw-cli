# wxclaw Programmatic API

## TypeScript Usage

```typescript
import { WxClawClient } from "@claw-lab/wxclawbot-cli";
import { resolveAccount } from "@claw-lab/wxclawbot-cli/accounts";

const account = resolveAccount();
const client = new WxClawClient({
  baseUrl: account.baseUrl,
  token: account.token,
  botId: account.botId,
  contextToken: account.contextToken,
});

const result = await client.sendText("user@im.wechat", "Hello");
// { ok: true, to: "...", clientId: "..." }
```

`contextToken` is required for proactive push notifications. Without it,
messages send successfully but won't push to the user's WeChat client.
`resolveAccount()` auto-resolves it from `{accountId}.context-tokens.json`.

## Account File Format

Accounts are stored at `~/.openclaw/openclaw-weixin/accounts/{accountId}.json`.

Each file contains bot credentials including token, botId, baseUrl, and the
bound user ID (default --to target).

Context tokens are stored separately at `{accountId}.context-tokens.json`
as a `userId → token` map, maintained by openclaw-weixin.

## Package Exports

| Export | Module |
|--------|--------|
| `@claw-lab/wxclawbot-cli` | `WxClawClient` class |
| `@claw-lab/wxclawbot-cli/accounts` | `resolveAccount()`, account discovery |
