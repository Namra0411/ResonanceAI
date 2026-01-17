import { Queue } from "bullmq";
import { redis } from "./redis.js";

export const ingestionQueue = new Queue("document-ingestion", {
  connection: redis,
});
