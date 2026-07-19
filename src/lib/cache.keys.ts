export const CacheKeys = {
  user: (id: string) => `user:${id}`,

  conversation: (id: string) => `conversation:${id}`,

  userConversations: (id: string) => `user-conversations:${id}`,
};
