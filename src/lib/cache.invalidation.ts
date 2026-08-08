import { cacheDelete } from "./cache.js";
import { CacheKeys } from "./cache.keys.js";

export async function invalidateUserConversations(userId: string) {
  await cacheDelete(CacheKeys.userConversations(userId));
}
