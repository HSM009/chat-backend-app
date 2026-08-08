export const WebSocketEvents = {
  CONNECTED: "connected",

  MESSAGE_NEW: "message:new",

  MESSAGE_UPDATED: "message:updated",

  MESSAGE_DELETED: "message:deleted",

  TYPING_START: "typing:start",

  TYPING_STOP: "typing:stop",

  USER_ONLINE: "user:online",

  USER_OFFLINE: "user:offline",

  READ_RECEIPT: "message:read",

  MESSAGE_PINNED: "message:pinned",

  MESSAGE_UNPINNED: "message:unpinned",

  MESSAGE_DELIVERED: "message:delivered",

  MEMBER_ADDED: "message:member_added",

  MEMBER_REMOVED: "message:member_removed",

  GROUP_DELETED: "message:group_deleted",

  GROUP_LEFT: "message:group_left",

  ADMIN_CHANGED: "message:admin_changed",

  GROUP_UPDATED: "message:group_updated",

  USER_TYPING: "user:typing",

  USER_STOPPED_TYPING: "user:stoppedTyping",

  MESSAGE_MENTION: "message:mention",

  CONVERSATION_DELETED: "conversation:deleted",

  MESSAGE_REACTION: "message:reaction",

  CALL_INVITE: "call:invite",

  CALL_RINGING: "call:ringing",

  CALL_ACCEPT: "call:accept",

  CALL_REJECT: "call:reject",

  CALL_END: "call:end",

  CALL_BUSY: "call:busy",

  CALL_OFFER: "call:offer",
  CALL_ANSWER: "call:answer",
  CALL_ICE: "call:ice",

  WEBRTC_OFFER: "webrtc:offer",
  WEBRTC_ANSWER: "webrtc:answer",
  WEBRTC_ICE: "webrtc:ice",
} as const;

export type WebSocketEvent =
  (typeof WebSocketEvents)[keyof typeof WebSocketEvents];
