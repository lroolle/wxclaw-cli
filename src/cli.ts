#!/usr/bin/env node

import { readFileSync } from "node:fs";

import { Command } from "commander";

import { listAccounts, resolveAccount } from "./accounts.js";
import { WxClawClient } from "./client.js";
import { VERSION } from "./version.js";

function readStdin(): string {
  return readFileSync(0, "utf-8").trim();
}

function fail(msg: string, json?: boolean): never {
  if (json) {
    console.log(JSON.stringify({ ok: false, error: msg }));
  } else {
    console.error(msg);
  }
  process.exit(1);
}

const program = new Command();

program
  .name("wxclawbot")
  .description("WeixinClawBot CLI - proactive messaging")
  .version(VERSION);

program
  .command("send")
  .description("Send a message to a WeChat user")
  .option("--to <userId>", "target user ID (default: bound user from account)")
  .option("--text <message>", 'message text (use "-" to read from stdin)')
  .option("--file <path>", "file or URL to send (image/video/file)")
  .option("--account <id>", "account ID (default: first available)")
  .option("--json", "output result as JSON")
  .option("--dry-run", "preview without sending")
  .argument("[text...]", "message text (alternative to --text)")
  .action(
    async (
      args: string[],
      opts: {
        to?: string;
        text?: string;
        file?: string;
        account?: string;
        json?: boolean;
        dryRun?: boolean;
      },
    ) => {
      let text = opts.text;
      if (text === "-") {
        text = readStdin();
      } else if (!text && !opts.file && args.length > 0) {
        text = args.join(" ");
      } else if (!text && !opts.file) {
        if (!process.stdin.isTTY) {
          text = readStdin();
        }
      }

      if (!text && !opts.file) {
        fail(
          "no message. use --text, --file, positional args, or pipe via stdin.",
          opts.json,
        );
      }

      const account = resolveAccount(opts.account);
      if (!account) {
        fail(
          "no account found. login via openclaw first, or set WXCLAW_TOKEN env var.",
          opts.json,
        );
      }

      const to = opts.to || account.defaultTo;
      if (!to) {
        fail(
          "no --to specified and no default user bound to this account.",
          opts.json,
        );
      }

      const client = new WxClawClient({
        baseUrl: account.baseUrl,
        token: account.token,
        botId: account.botId,
        contextToken: account.contextToken,
      });

      try {
        let result;

        if (opts.file) {
          result = await client.sendFile(to, opts.file, {
            text,
            dryRun: opts.dryRun,
          });
        } else {
          result = await client.sendText(to, text!, {
            dryRun: opts.dryRun,
          });
        }

        if (opts.json) {
          console.log(JSON.stringify(result));
        } else if (result.ok) {
          const prefix = opts.dryRun ? "[dry-run] would send" : "sent";
          const what = opts.file ? `file ${opts.file}` : "text";
          console.log(`${prefix} ${what} to ${to}`);
        } else {
          console.error(`send failed: ${result.error}`);
          process.exit(1);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const info =
          err && typeof err === "object" && "info" in err
            ? (err as {
                info?: {
                  kind?: string;
                  retryable?: boolean;
                  code?: string;
                  cause?: string;
                };
              }).info
            : undefined;

        if (opts.json) {
          console.log(
            JSON.stringify({
              ok: false,
              error: `send failed: ${msg}`,
              errorKind: info?.kind,
              retryable: info?.retryable,
              errorCode: info?.code,
              cause: info?.cause,
            }),
          );
          process.exit(1);
        }

        fail(`send failed: ${msg}`, false);
      }
    },
  );

program
  .command("accounts")
  .description("List available OpenClaw WeChat accounts")
  .option("--json", "output as JSON")
  .action((opts: { json?: boolean }) => {
    const accounts = listAccounts();
    if (opts.json) {
      console.log(JSON.stringify(accounts));
      return;
    }
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
