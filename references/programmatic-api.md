# wxclaw Programmatic API

## TypeScript Usage

```typescript
import { WxClawClient } from "@herai/wxclaw-cli";
import { resolveAccount } from "@herai/wxclaw-cli/accounts";

const account = resolveAccount();
const client = new WxClawClient({
  baseUrl: account.baseUrl,
  token: account.token,
  botId: account.botId,
});

const result = await client.sendText("user@im.wechat", "Hello");
// { ok: true, to: "...", clientId: "..." }
```

## Account File Format

Accounts are stored at `~/.openclaw/openclaw-weixin/accounts/{accountId}.json`.

Each file contains bot credentials including token, botId, baseUrl, and the
bound user ID (default --to target).

## Package Exports

| Export | Module |
|--------|--------|
| `@herai/wxclaw-cli` | `WxClawClient` class |
| `@herai/wxclaw-cli/accounts` | `resolveAccount()`, account discovery |
