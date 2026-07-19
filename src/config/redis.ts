import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on("connect", () => {
  console.log("✅ Redis connected.");
});

redis.on("ready", () => {
  console.log("🚀 Redis is ready.");
});

redis.on("error", (error) => {
  console.error("❌ Redis Error:", error);
});

redis.on("end", () => {
  console.log("Redis connection closed.");
});
