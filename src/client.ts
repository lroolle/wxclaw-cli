import crypto from "node:crypto";

import { readFileOrUrl, uploadFile } from "./media.js";
import {
  ItemType,
  MessageState,
  MessageType,
  type MessageItem,
  type SendMessageReq,
} from "./types.js";
import { VERSION } from "./version.js";

const SEND_TIMEOUT_MS = 15_000;

const KNOWN_ERRORS: Record<number, string> = {
  [-2]: "rate limited, try again later",
  [-14]: "session expired, re-login via openclaw",
};

function randomUIN(): string {
  const n = crypto.randomBytes(4).readUInt32BE(0);
  return Buffer.from(String(n), "utf-8").toString("base64");
}

export interface SendResult {
  ok: boolean;
  to: string;
  clientId: string;
  error?: string;
}

export class WxClawClient {
  private baseUrl: string;
  private token: string;
  private botId: string;
  private contextToken?: string;

  constructor(opts: {
    baseUrl: string;
    token: string;
    botId?: string;
    contextToken?: string;
  }) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.token = opts.token;
    this.botId = opts.botId ?? "";
    this.contextToken = opts.contextToken;
  }

  async sendText(
    to: string,
    text: string,
    opts?: { dryRun?: boolean },
  ): Promise<SendResult> {
    const clientId = crypto.randomUUID();

    if (opts?.dryRun) {
      return { ok: true, to, clientId };
    }

    const items: MessageItem[] = [
      { type: ItemType.TEXT, text_item: { text } },
    ];

    return this.sendItems(to, items, clientId);
  }

  async sendFile(
    to: string,
    filePath: string,
    opts?: { text?: string; dryRun?: boolean },
  ): Promise<SendResult> {
    const clientId = crypto.randomUUID();

    if (opts?.dryRun) {
      return { ok: true, to, clientId };
    }

    const { data, name } = await readFileOrUrl(filePath);

    const { item } = await uploadFile({
      data,
      filePath: name,
      toUserId: to,
      baseUrl: this.baseUrl,
      token: this.token,
    });

    const items: MessageItem[] = [];
    if (opts?.text) {
      items.push({ type: ItemType.TEXT, text_item: { text: opts.text } });
    }
    items.push(item);

    return this.sendItems(to, items, clientId);
  }

  private async sendItems(
    to: string,
    items: MessageItem[],
    clientId: string,
  ): Promise<SendResult> {
    let lastClientId = clientId;

    for (const item of items) {
      lastClientId = crypto.randomUUID();
      const req: SendMessageReq = {
        msg: {
          from_user_id: this.botId,
          to_user_id: to,
          client_id: lastClientId,
          message_type: MessageType.BOT,
          message_state: MessageState.FINISH,
          item_list: [item],
          context_token: this.contextToken,
        },
        base_info: { channel_version: VERSION },
      };

      const resp = await this.post<Record<string, unknown>>(
        "/ilink/bot/sendmessage",
        req,
      );

      const ret = typeof resp.ret === "number" ? resp.ret : 0;
      if (ret !== 0) {
        const hint = KNOWN_ERRORS[ret] ?? "";
        const detail = hint ? ` (${hint})` : "";
        return { ok: false, to, clientId: lastClientId, error: `ret=${ret}${detail}` };
      }
    }

    return { ok: true, to, clientId: lastClientId };
  }

  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const bodyStr = JSON.stringify(body);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          AuthorizationType: "ilink_bot_token",
          Authorization: `Bearer ${this.token}`,
          "X-WECHAT-UIN": randomUIN(),
        },
        body: bodyStr,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const raw = await res.text();
      if (!res.ok) {
        const truncated = raw.length > 200 ? raw.slice(0, 200) + "..." : raw;
        throw new Error(`HTTP ${res.status}: ${truncated}`);
      }

      try {
        return JSON.parse(raw) as T;
      } catch {
        const truncated = raw.length > 200 ? raw.slice(0, 200) + "..." : raw;
        throw new Error(
          `invalid JSON response (HTTP ${res.status}): ${truncated}`,
        );
      }
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`request timeout after ${SEND_TIMEOUT_MS}ms`);
      }
      throw err;
    }
  }
}
