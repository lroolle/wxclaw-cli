export const MessageType = {
  USER: 1,
  BOT: 2,
} as const;

export const MessageState = {
  NEW: 0,
  GENERATING: 1,
  FINISH: 2,
} as const;

export const ItemType = {
  TEXT: 1,
  IMAGE: 2,
  VOICE: 3,
  FILE: 4,
  VIDEO: 5,
} as const;

export interface TextItem {
  text: string;
}

export interface MessageItem {
  type: number;
  text_item?: TextItem;
}

export interface SendMsg {
  from_user_id: string;
  to_user_id: string;
  client_id: string;
  message_type: number;
  message_state: number;
  item_list?: MessageItem[];
  context_token?: string;
}

export interface SendMessageReq {
  msg: SendMsg;
  base_info?: { channel_version?: string };
}

export interface SendMessageResp {
  ret: number;
  errmsg?: string;
}

export interface AccountData {
  token?: string;
  savedAt?: string;
  baseUrl?: string;
  userId?: string;
}

export interface ResolvedAccount {
  id: string;
  token: string;
  baseUrl: string;
  botId: string;
}
