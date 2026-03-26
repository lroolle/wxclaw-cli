#!/usr/bin/env node

import { readFileSync } from "node:fs";

import { Command } from "commander";

import { listAccounts, resolveAccount } from "./accounts.js";
import { WxClawClient } from "./client.js";

function readStdin(): string {
  return readFileSync(0, "utf-8").trim();
}

const program = new Command();

program
  .name("wxclaw")
  .description("WeChat ClawBot CLI - proactive messaging")
  .version("0.1.0");

program
  .command("send")
  .description("Send a text message to a WeChat user")
  .requiredOption("--to <userId>", "target WeChat user ID")
  .option("--text <message>", 'message text (use "-" to read from stdin)')
  .option("--account <id>", "account ID (default: first available)")
  .argument("[text...]", "message text (alternative to --text)")
  .action(
    async (
      args: string[],
      opts: { to: string; text?: string; account?: string },
    ) => {
      let text = opts.text;
      if (text === "-") {
        text = readStdin();
      } else if (!text && args.length > 0) {
        text = args.join(" ");
      } else if (!text) {
        if (!process.stdin.isTTY) {
          text = readStdin();
        }
      }

      if (!text) {
        console.error(
          "no message text. use --text, positional args, or pipe via stdin.",
        );
        process.exit(1);
      }

      const account = resolveAccount(opts.account);
      if (!account) {
        console.error(
          "no account found. login via openclaw first, or set WXCLAW_TOKEN env var.",
        );
        process.exit(1);
      }

      const client = new WxClawClient({
        baseUrl: account.baseUrl,
        token: account.token,
        botId: account.botId,
      });

      try {
        await client.sendText(opts.to, text);
        console.log(`sent to ${opts.to}`);
      } catch (err) {
        console.error(
          `send failed: ${err instanceof Error ? err.message : err}`,
        );
        process.exit(1);
      }
    },
  );

program
  .command("accounts")
  .description("List available OpenClaw WeChat accounts")
  .action(() => {
    const accounts = listAccounts();
    if (accounts.length === 0) {
      console.log("no accounts found. login via openclaw first.");
      return;
    }
    for (const a of accounts) {
      const status = a.configured ? "ok" : "no token";
      console.log(`  ${a.id}  [${status}]  ${a.baseUrl}`);
    }
  });

program.parse();
