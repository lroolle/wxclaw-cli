# @herai/wxclawbot-cli

[English](./README.en.md) | [npm](https://www.npmjs.com/package/@herai/wxclawbot-cli) | [GitHub](https://github.com/lroolle/wxclawbot-cli) | [ClawHub](https://clawhub.ai/lroolle/wxclawbot-send)

让你的 OpenClaw AI agent 主动给微信用户发消息。文本、图片、视频、文件，想发就发。

## 为什么做这个

> 7）现在还不支持主动定时给你发消息
> 也就是说，它不会像小秘书一样，自己跳出来提醒你。
>
> -- [龙虾 接入微信教程](https://mp.weixin.qq.com/s/nYDQ1obQEHe1WavGpNzasQ)

翻译一下：你的 AI agent 只能被动回复，不能主动说话。就像雇了个秘书，但这个秘书只有你先开口他才会理你。

**现在可以了。** 这个 CLI 让你的 agent 拥有主动推送能力 -- 定时提醒、监控告警、自动汇报，你说了算。复用 [openclaw-weixin](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) 登录凭证，不用额外折腾。

## 能干嘛？来点实际的

### 生活提醒（别等身体提醒你）

```bash
# 每 45 分钟提醒喝水
wxclawbot send --text "喝水，别等肾结石来提醒你" --json

# 每坐满 1 小时
wxclawbot send --text "你屁股已经焊在椅子上 60 分钟了，站起来" --json

# 凌晨 1 点还在写代码
wxclawbot send --text "你的代码质量已经和你的发际线一样在后退了，睡觉" --json

# 周五 5:55
wxclawbot send --text "距离下班还有 5 分钟，别接新需求，别回消息，准备跑" --json

# 工作日 11:15
wxclawbot send --text "再不点外卖，配送排到下午两点，届时你将体验饥饿驱动开发" --json
```

### DevOps（线上炸了你得知道）

```bash
# CI/CD 挂了
wxclawbot send --text "CI 挂了，是 @张三 的 commit abc1234 炸的，麻烦擦屁股" --json

# PR 超过 24 小时没人 review
wxclawbot send --text "PR #42 已经晾了 24 小时，review 一下，代码不会自己合并" --json

# 部署成功
wxclawbot send --text "v2.3.1 上线了，暂时没炸" --json

# 部署失败
wxclawbot send --text "v2.3.1 炸了，别慌，慌也没用" --json

# 生产环境错误率飙升
wxclawbot send --text "生产环境错误率 15%，正常是 0.1%，建议立刻看看" --json

# GitHub contributions 连续 3 天空白
wxclawbot send --text "你的 GitHub 绿点正在荒漠化，连续 3 天没提交了" --json
```

### 业务运营（让机器人替你干活）

```bash
# 定时日报
wxclawbot send --file ./daily-report.pdf --text "今日数据，请查收" --json

# 工单超 SLA
wxclawbot send --text "工单 #1024 已超 SLA 4 小时，升级处理" --json

# 安全告警
wxclawbot send --text "检测到异常登录：来自 越南胡志明市，不是你的话赶紧改密码" --json

# 服务器告警
wxclawbot send --text "prod-03 磁盘使用率 95%，再不清就要现场表演磁盘已满" --json

# 发图片/截图
wxclawbot send --file ./monitoring-screenshot.png --text "仪表盘截图" --json
```

配合 cron、GitHub Actions、你自己的监控脚本，排列组合随你玩。

## 安装

```bash
clawhub install wxclawbot-send
```

或通过 npm：

```bash
npm install -g @herai/wxclawbot-cli
```

需要 Node.js >= 20。没有就去装，这不是一个可以商量的事情。

## 用法

```bash
wxclawbot send --text "消息内容" --json
wxclawbot send --file ./photo.jpg --json
wxclawbot send --file ./report.pdf --text "请查收" --json
wxclawbot send --to "user@im.wechat" --text "你好" --json
echo "日报已生成" | wxclawbot send --json
```

- `--to` 默认是 openclaw 账号绑定的用户，用 `--to` 可以指定其他人
- `--json` **始终带上**，不带的输出格式不保证稳定，别怪我没说
- 支持 stdin 管道输入，适合脚本串联

媒体类型按扩展名自动识别：
- 图片: `.png` `.jpg` `.jpeg` `.gif` `.webp` `.bmp`
- 视频: `.mp4` `.mov` `.webm` `.mkv` `.avi`
- 文件: 其他所有扩展名

## 输出

```json
{"ok":true,"to":"user@im.wechat","clientId":"..."}
```

```json
{"ok":false,"error":"ret=-2 (rate limited, try again later)"}
```

**重要：退出码 0 只表示 CLI 正常运行，不代表消息送达。** 务必检查 `ok` 字段。是的，这不符合 Unix 哲学，但这是现实 -- 网络请求和本地执行是两码事。

## 错误处理

| ret | 含义 | 怎么办 |
|-----|------|--------|
| -2 | 频率限制 | 等 5-10 秒重试。不要写 `while true` 紧循环，那只会让你被限得更久 |
| -14 | 会话过期 | 通过 openclaw 重新登录，token 不是永久的 |

频率限制：每个机器人账号约 **7 条 / 5 分钟**，服务端限制，所有客户端共享。别想着开多个进程绕过去，没用的。

## 账号管理

```bash
wxclawbot accounts --json
```

自动从 `~/.openclaw/openclaw-weixin/accounts/` 发现账号。

环境变量覆盖（CI/CD 或容器环境用这个）：

```bash
export WXCLAW_TOKEN="bot@im.bot:your-token"
export WXCLAW_BASE_URL="https://ilinkai.weixin.qq.com"
```

## 编程接口

不想用 CLI？直接在代码里调：

```typescript
import { WxClawClient } from "@herai/wxclawbot-cli";
import { resolveAccount } from "@herai/wxclawbot-cli/accounts";

const account = resolveAccount();
const client = new WxClawClient({
  baseUrl: account.baseUrl,
  token: account.token,
  botId: account.botId,
});

await client.sendText("user@im.wechat", "你好");
await client.sendFile("user@im.wechat", "./photo.jpg", { text: "请查收" });
```

`resolveAccount()` 的发现逻辑跟 CLI 一样：环境变量 > 本地账号文件。

## 相关链接

- [npm](https://www.npmjs.com/package/@herai/wxclawbot-cli)
- [GitHub](https://github.com/lroolle/wxclawbot-cli)
- [ClawHub](https://clawhub.ai/lroolle/wxclawbot-send) -- `clawhub install wxclawbot-send`
- [龙虾接入微信教程](https://mp.weixin.qq.com/s/nYDQ1obQEHe1WavGpNzasQ) -- 先看这个搞定基础接入

## 开源许可

MIT -- 拿去用，别客气。
