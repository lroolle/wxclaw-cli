import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildBaseInfo, protocolHeaders } from "./protocol.js";
import {
  CDNMediaType,
  ItemType,
  type GetUploadUrlReq,
  type GetUploadUrlResp,
  type MessageItem,
} from "./types.js";

const CDN_BASE_URL = "https://novac2c.cdn.weixin.qq.com/c2c";
const API_TIMEOUT_MS = 15_000;
const CDN_UPLOAD_TIMEOUT_MS = 60_000;
const CDN_MAX_RETRIES = 3;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi"]);

// PKCS7 padded ciphertext size for AES-128-ECB (16-byte blocks).
// Matches openclaw-weixin's formula. Note: weclaw Go uses a slightly
// different formula that over-reports by 16 bytes at block boundaries,
// but the server accepts both.
export function aesEcbPaddedSize(plaintextSize: number): number {
  return Math.ceil((plaintextSize + 1) / 16) * 16;
}

export function encryptAesEcb(plaintext: Buffer, key: Buffer): Buffer {
  const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
  return Buffer.concat([cipher.update(plaintext), cipher.final()]);
}

export function classifyMedia(
  filePath: string,
): { cdnType: number; itemType: number } {
  const ext = path.extname(filePath).toLowerCase();
  if (IMAGE_EXTS.has(ext)) {
    return { cdnType: CDNMediaType.IMAGE, itemType: ItemType.IMAGE };
  }
  if (VIDEO_EXTS.has(ext)) {
    return { cdnType: CDNMediaType.VIDEO, itemType: ItemType.VIDEO };
  }
  return { cdnType: CDNMediaType.FILE, itemType: ItemType.FILE };
}

function filenameFromPath(filePath: string): string {
  return path.basename(filePath) || "file";
}

interface UploadResult {
  downloadParam: string;
  aesKeyHex: string;
  fileSize: number;
  cipherSize: number;
}

export async function uploadFile(opts: {
  data: Buffer;
  filePath: string;
  toUserId: string;
  baseUrl: string;
  token: string;
  cdnBaseUrl?: string;
}): Promise<{ item: MessageItem }> {
  const { data, filePath, toUserId, baseUrl, token } = opts;
  const cdnBaseUrl = opts.cdnBaseUrl || CDN_BASE_URL;
  const { cdnType, itemType } = classifyMedia(filePath);

  const uploaded = await uploadToCdn({
    data,
    toUserId,
    cdnMediaType: cdnType,
    baseUrl,
    token,
    cdnBaseUrl,
  });

  const media = {
    encrypt_query_param: uploaded.downloadParam,
    aes_key: Buffer.from(uploaded.aesKeyHex).toString("base64"),
    encrypt_type: 1,
  };

  let item: MessageItem;
  switch (itemType) {
    case ItemType.IMAGE:
      item = {
        type: ItemType.IMAGE,
        image_item: { media, mid_size: uploaded.cipherSize },
      };
      break;
    case ItemType.VIDEO:
      item = {
        type: ItemType.VIDEO,
        video_item: { media, video_size: uploaded.cipherSize },
      };
      break;
    default:
      item = {
        type: ItemType.FILE,
        file_item: {
          media,
          file_name: filenameFromPath(filePath),
          len: String(uploaded.fileSize),
        },
      };
  }

  return { item };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function uploadToCdn(opts: {
  data: Buffer;
  toUserId: string;
  cdnMediaType: number;
  baseUrl: string;
  token: string;
  cdnBaseUrl: string;
}): Promise<UploadResult> {
  const { data, toUserId, cdnMediaType, baseUrl, token, cdnBaseUrl } = opts;

  const filekey = crypto.randomBytes(16).toString("hex");
  const aeskey = crypto.randomBytes(16);
  const aesKeyHex = aeskey.toString("hex");

  const rawMd5 = crypto.createHash("md5").update(data).digest("hex");
  const cipherSize = aesEcbPaddedSize(data.length);

  const body: GetUploadUrlReq = {
    filekey,
    media_type: cdnMediaType as 1 | 2 | 3,
    to_user_id: toUserId,
    rawsize: data.length,
    rawfilemd5: rawMd5,
    filesize: cipherSize,
    no_need_thumb: true,
    aeskey: aesKeyHex,
    base_info: buildBaseInfo(),
  };

  const uin = crypto.randomBytes(4).readUInt32BE(0);
  const uinHeader = Buffer.from(String(uin), "utf-8").toString("base64");

  const uploadRes = await fetchWithTimeout(
    `${baseUrl}/ilink/bot/getuploadurl`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        AuthorizationType: "ilink_bot_token",
        Authorization: `Bearer ${token}`,
        "X-WECHAT-UIN": uinHeader,
        ...protocolHeaders(),
      },
      body: JSON.stringify(body),
    },
    API_TIMEOUT_MS,
  );

  const uploadRespRaw = await uploadRes.text();
  if (!uploadRes.ok) {
    throw new Error(
      `getuploadurl HTTP ${uploadRes.status}: ${uploadRespRaw.slice(0, 200)}`,
    );
  }

  let uploadResp: GetUploadUrlResp;
  try {
    uploadResp = JSON.parse(uploadRespRaw);
  } catch {
    throw new Error(
      `getuploadurl invalid JSON: ${uploadRespRaw.slice(0, 200)}`,
    );
  }

  if ((uploadResp.ret ?? 0) !== 0 || !uploadResp.upload_param) {
    throw new Error(
      `getuploadurl failed: ret=${uploadResp.ret} errmsg=${uploadResp.errmsg ?? "no upload_param"}`,
    );
  }

  const ciphertext = encryptAesEcb(data, aeskey);

  const cdnUrl =
    `${cdnBaseUrl}/upload?encrypted_query_param=${encodeURIComponent(uploadResp.upload_param)}&filekey=${encodeURIComponent(filekey)}`;

  let downloadParam: string | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= CDN_MAX_RETRIES; attempt++) {
    try {
      const cdnRes = await fetchWithTimeout(
        cdnUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: new Uint8Array(ciphertext),
        },
        CDN_UPLOAD_TIMEOUT_MS,
      );

      if (cdnRes.status >= 400 && cdnRes.status < 500) {
        throw new Error(`CDN upload client error ${cdnRes.status}`);
      }
      if (cdnRes.status !== 200) {
        throw new Error(`CDN upload server error ${cdnRes.status}`);
      }

      downloadParam = cdnRes.headers.get("x-encrypted-param") ?? undefined;
      if (!downloadParam) {
        throw new Error("CDN response missing x-encrypted-param header");
      }
      break;
    } catch (err) {
      lastError = err;
      if (err instanceof Error && err.message.includes("client error"))
        throw err;
      if (attempt >= CDN_MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  if (!downloadParam) {
    throw lastError instanceof Error
      ? lastError
      : new Error(`CDN upload failed after ${CDN_MAX_RETRIES} attempts`);
  }

  return { downloadParam, aesKeyHex, fileSize: data.length, cipherSize };
}

export async function readFileOrUrl(filePath: string): Promise<{
  data: Buffer;
  name: string;
}> {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    const res = await fetchWithTimeout(
      filePath,
      {},
      CDN_UPLOAD_TIMEOUT_MS,
    );
    if (!res.ok) {
      throw new Error(`download ${filePath}: HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_FILE_SIZE) {
      throw new Error(
        `file too large: ${buf.length} bytes (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      );
    }
    const urlPath = new URL(filePath).pathname;
    const name = path.basename(urlPath) || "file";
    return { data: buf, name };
  }

  const stat = fs.statSync(filePath);
  if (stat.size > MAX_FILE_SIZE) {
    throw new Error(
      `file too large: ${stat.size} bytes (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    );
  }
  const data = fs.readFileSync(filePath);
  return { data, name: filePath };
}
