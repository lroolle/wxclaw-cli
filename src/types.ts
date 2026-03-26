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

export const CDNMediaType = {
  IMAGE: 1,
  VIDEO: 2,
  FILE: 3,
} as const;

type ValueOf<T> = T[keyof T];

export interface TextItem {
  text: string;
}

export interface MediaInfo {
  encrypt_query_param: string;
  aes_key: string;
  encrypt_type: number;
}

export interface ImageItem {
  media: MediaInfo;
  mid_size: number;
}

export interface VideoItem {
  media: MediaInfo;
  video_size: number;
}

export interface FileItem {
  media: MediaInfo;
  file_name: string;
  len: string;
}

export interface MessageItem {
  type: ValueOf<typeof ItemType>;
  text_item?: TextItem;
  image_item?: ImageItem;
  video_item?: VideoItem;
  file_item?: FileItem;
}

export interface SendMsg {
  from_user_id: string;
  to_user_id: string;
  client_id: string;
  message_type: ValueOf<typeof MessageType>;
  message_state: ValueOf<typeof MessageState>;
  item_list: MessageItem[];
  context_token?: string;
}

export interface SendMessageReq {
  msg: SendMsg;
  base_info?: { channel_version?: string };
}

export interface GetUploadUrlReq {
  filekey: string;
  media_type: ValueOf<typeof CDNMediaType>;
  to_user_id: string;
  rawsize: number;
  rawfilemd5: string;
  filesize: number;
  no_need_thumb: boolean;
  aeskey: string;
  base_info?: { channel_version?: string };
}

export interface GetUploadUrlResp {
  ret?: number;
  errmsg?: string;
  upload_param?: string;
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
  defaultTo?: string;
  contextToken?: string;
}
