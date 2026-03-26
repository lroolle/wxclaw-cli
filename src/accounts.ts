import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { AccountData, ResolvedAccount } from "./types.js";

const DEFAULT_BASE_URL = "https://ilinkai.weixin.qq.com";

function extractBotId(token: string): string {
  const colonIdx = token.indexOf(":");
  return colonIdx > 0 ? token.substring(0, colonIdx) : "";
}

function stateDir(): string {
  return (
    process.env.OPENCLAW_STATE_DIR?.trim() ||
    process.env.CLAWDBOT_STATE_DIR?.trim() ||
    path.join(os.homedir(), ".openclaw")
  );
}

function weixinStateDir(): string {
  return path.join(stateDir(), "openclaw-weixin");
}

function accountsDir(): string {
  return path.join(weixinStateDir(), "accounts");
}

function indexPath(): string {
  return path.join(weixinStateDir(), "accounts.json");
}

export function listAccountIds(): string[] {
  try {
    const raw = fs.readFileSync(indexPath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const ids = parsed.filter(
        (id: unknown): id is string => typeof id === "string" && id !== "",
      );
      if (ids.length > 0) return ids;
    }
  } catch {
    // fall through to directory scan
  }
  return scanAccountsDir();
}

function scanAccountsDir(): string[] {
  try {
    const dir = accountsDir();
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".sync.json"))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

export function loadAccountData(accountId: string): AccountData | null {
  if (
    accountId.includes("/") ||
    accountId.includes("\\") ||
    accountId.includes("..")
  ) {
    return null;
  }
  const filePath = path.join(accountsDir(), `${accountId}.json`);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as AccountData;
  } catch {
    return null;
  }
}

function resolveBotId(data: AccountData): string {
  return data.userId?.trim() || extractBotId(data.token ?? "");
}

function loadContextTokens(
  accountId: string,
): Record<string, string> {
  const filePath = path.join(
    accountsDir(),
    `${accountId}.context-tokens.json`,
  );
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function resolveAccount(accountId?: string): ResolvedAccount | null {
  const envToken = process.env.WXCLAW_TOKEN?.trim();
  const envBaseUrl = process.env.WXCLAW_BASE_URL?.trim();

  if (envToken && !accountId) {
    return {
      id: "env",
      token: envToken,
      baseUrl: envBaseUrl || DEFAULT_BASE_URL,
      botId: extractBotId(envToken),
    };
  }

  const ids = listAccountIds();
  const targetId = accountId || ids[0];
  if (!targetId) return null;

  const data = loadAccountData(targetId);
  if (!data?.token) return null;

  const defaultTo = data.userId?.trim() || undefined;
  const contextTokens = loadContextTokens(targetId);
  const contextToken = defaultTo ? contextTokens[defaultTo] : undefined;

  return {
    id: targetId,
    token: data.token,
    baseUrl: data.baseUrl?.trim() || DEFAULT_BASE_URL,
    botId: resolveBotId(data),
    defaultTo,
    contextToken,
  };
}

export function listAccounts(): Array<{
  id: string;
  configured: boolean;
  baseUrl: string;
}> {
  const ids = listAccountIds();
  return ids.map((id) => {
    const data = loadAccountData(id);
    return {
      id,
      configured: Boolean(data?.token),
      baseUrl: data?.baseUrl?.trim() || DEFAULT_BASE_URL,
    };
  });
}
