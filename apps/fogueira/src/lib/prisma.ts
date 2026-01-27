import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { DATABASE_URL } from "../config/server";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Check NODE_ENV - this is a server-side file
const getNodeEnv = (): string | undefined => {
  if (typeof process === "undefined") return undefined;
  // biome-ignore lint: Server-side file needs to check NODE_ENV
  return process.env?.NODE_ENV;
};

const isDevelopment = getNodeEnv() === "development";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaNeon({ connectionString: DATABASE_URL }),
    log: isDevelopment ? ["query", "error", "warn"] : ["error"],
  });

const nodeEnv = getNodeEnv();
if (nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
}

