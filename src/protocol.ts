import { VERSION } from "./version.js";

// Wire protocol tracked from @tencent-weixin/openclaw-weixin.
// channel_version / iLink-App-ClientVersion advertise which protocol
// build we implement; bot_agent identifies this client app.
export const PROTOCOL_VERSION = "2.4.6";

export const ILINK_APP_ID = "bot";

// uint32 0x00MMNNPP, e.g. "2.4.6" -> 0x00020406.
function encodeClientVersion(version: string): number {
  const [major = 0, minor = 0, patch = 0] = version
    .split(".")
    .map((p) => parseInt(p, 10) || 0);
  return ((major & 0xff) << 16) | ((minor & 0xff) << 8) | (patch & 0xff);
}

export const ILINK_APP_CLIENT_VERSION = encodeClientVersion(PROTOCOL_VERSION);

export interface BaseInfo {
  channel_version: string;
  bot_agent: string;
}

export function buildBaseInfo(): BaseInfo {
  return {
    channel_version: PROTOCOL_VERSION,
    bot_agent: `wxclawbot/${VERSION}`,
  };
}

export function protocolHeaders(): Record<string, string> {
  return {
    "iLink-App-Id": ILINK_APP_ID,
    "iLink-App-ClientVersion": String(ILINK_APP_CLIENT_VERSION),
  };
}
