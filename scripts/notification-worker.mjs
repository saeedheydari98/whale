import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";
import { dispatchNotifications } from "../lib/notifications/dispatch.mjs";
import { setTimeout as sleep } from "node:timers/promises";
const connectionString = process.env.DATABASE_URL;
const usesNeon = connectionString && new URL(connectionString).hostname.endsWith(".neon.tech");
neonConfig.webSocketConstructor = globalThis.WebSocket ?? WebSocket;
neonConfig.poolQueryViaFetch = true;
const prisma = usesNeon
 ? new PrismaClient({ adapter: new PrismaNeon(new Pool({ connectionString })) })
 : new PrismaClient();
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) throw new Error("Configure VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.");

let stopped = false;
process.on("SIGTERM", () => { stopped = true; });
process.on("SIGINT", () => { stopped = true; });
try {
 do {
 const result = await dispatchNotifications(prisma);
 if (process.argv.includes("--once")) break;
 if (!result.processed) await sleep(5000);
 } while (!stopped);
} finally { await prisma.$disconnect(); }
