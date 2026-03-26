# @claw-lab/wxclawbot-cli

[English](./README.en.md) | [npm](https://www.npmjs.com/package/@claw-lab/wxclawbot-cli) | [GitHub](https://github.com/lroolle/wxclawbot-cli) | [ClawHub](https://clawhub.ai/lroolle/wxclawbot-send)

让你的 AI agent 主动给微信用户发消息。文本、图片、视频、文件，想发就发。

## 为什么做这个

> 7）现在还不支持主动定时给你发消息
> 也就是说，它不会像小秘书一样，自己跳出来提醒你。
>
> -- [龙虾接入微信教程](https://mp.weixin.qq.com/s/nYDQ1obQEHe1WavGpNzasQ)

**现在可以了。**

## 安装

把下面这段直接发给你的龙虾就行：

```
装个技能让你能主动给我发微信，先装 CLI：npm install -g @claw-lab/wxclawbot-cli

npm 包：https://www.npmjs.com/package/@claw-lab/wxclawbot-cli
源码：https://github.com/lroolle/wxclawbot-cli

装好了告诉我。
```

没了。复制，粘贴，发送。agent 自己搞定安装、配置、定时任务。

你不需要碰命令行。你不需要写 cron。你不需要看下面的技术文档。

## 使用场景

你不是在"用 CLI"，你是在跟 agent 说话。以下是你可以直接发给龙虾的提示词：

**活着提醒系列：**

> 每 45 分钟提醒我喝水，别客气直接骂

> 每坐满 1 小时提醒我站起来，语气凶一点

> 凌晨 1 点还在跟你聊天直接骂我去睡觉

> 周五 5:55 提醒我下班，不要接新需求

> 工作日 11:15 提醒我点外卖，不然配送排到下午两点

**搬砖告警系列：**

> CI 挂了第一时间微信通知我，告诉我是谁的 commit 炸的

> 有 PR 超过 24 小时没人 review 就催我

> 每次部署完成通知我，成功失败都要说

> 生产环境错误率超过 1% 立刻告警

**老板视角系列：**

> 每天早上 9 点把昨天的核心指标发给我

> 工单超 SLA 4 小时自动升级通知我

> 检测到异常登录立刻告警

> 服务器磁盘超 90% 微信通知我

你说人话，agent 干活。就这么简单。

---

以下是给 agent、脚本和开发者看的技术文档。普通用户到这里就可以关掉了。

## CLI 参考

```bash
wxclawbot send --text "消息内容" --json
wxclawbot send --file ./photo.jpg --json
wxclawbot send --file ./report.pdf --text "请查收" --json
wxclawbot send --to "user@im.wechat" --text "你好" --json
echo "日报已生成" | wxclawbot send --json
wxclawbot send --text "test" --dry-run
```

| 参数 | 说明 |
|------|------|
| `--text <msg>` | 消息文本。`"-"` 显式读 stdin |
| `--file <path>` | 本地文件或 URL（图片 / 视频 / 文件） |
| `--to <userId>` | 目标用户 ID。默认：账号绑定用户 |
| `--account <id>` | 指定账号。默认：第一个可用的 |
| `--json` | JSON 格式输出。**始终带上** |
| `--dry-run` | 预览，不发送 |

媒体类型按扩展名自动识别：

- 图片：.png .jpg .jpeg .gif .webp .bmp
- 视频：.mp4 .mov .webm .mkv .avi
- 文件：其他所有

## 输出格式

```json
{"ok":true,"to":"user@im.wechat","clientId":"..."}
{"ok":false,"error":"ret=-2 (rate limited, try again later)"}
```

退出码：0 = CLI 执行成功，1 = 失败。注意：exit 0 只代表 CLI 跑完了，不代表消息送达。看 `ok` 字段。

## 错误码

| ret | 含义 | 处理 |
|-----|------|------|
| -2 | 频率限制 | 等 5-10 秒重试，别搞紧循环 |
| -14 | 会话过期 | 通过 openclaw 重新登录 |

频率限制：每个机器人账号约 **7 条 / 5 分钟**，服务端限制，所有客户端共享。

## 账号

```bash
wxclawbot accounts --json
```

自动从 `~/.openclaw/openclaw-weixin/accounts/` 发现。环境变量覆盖：

```bash
export WXCLAW_TOKEN="bot@im.bot:your-token"
export WXCLAW_BASE_URL="https://ilinkai.weixin.qq.com"
```

## 编程接口

```typescript
import { WxClawClient } from "@claw-lab/wxclawbot-cli";
import { resolveAccount } from "@claw-lab/wxclawbot-cli/accounts";

const account = resolveAccount();
const client = new WxClawClient({
  baseUrl: account.baseUrl,
  token: account.token,
  botId: account.botId,
});

await client.sendText("user@im.wechat", "你好");
await client.sendFile("user@im.wechat", "./photo.jpg", { text: "请查收" });
```

详见 [references/programmatic-api.md](references/programmatic-api.md)。

## 相关链接

- [npm](https://www.npmjs.com/package/@claw-lab/wxclawbot-cli)
- [GitHub](https://github.com/lroolle/wxclawbot-cli)
- [ClawHub](https://clawhub.ai/lroolle/wxclawbot-send) -- `clawhub install wxclawbot-send`
- [龙虾接入微信教程](https://mp.weixin.qq.com/s/nYDQ1obQEHe1WavGpNzasQ) -- 先看这个搞定基础接入

## 开源许可

MIT
