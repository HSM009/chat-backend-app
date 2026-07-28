import "dotenv/config";

import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { redis } from "./config/redis.js";

const app = await buildApp();

// await redis.connect();

await app.listen({
  host: "0.0.0.0",
  port: env.PORT,
});
