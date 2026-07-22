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
} as const;

export type WebSocketEvent =
  (typeof WebSocketEvents)[keyof typeof WebSocketEvents];
