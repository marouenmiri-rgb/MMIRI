import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Lazy Prisma client.
 *
 * The previous version called `new PrismaClient()` at module-load time, which
 * crashes the whole route render when the client wasn't generated (common on
 * fresh checkouts before the first `npm run dev`). Now we defer construction
 * until first method call and proxy every model into a thrower if init fails —
 * pages that wrap their queries in try/catch can then fall back to fixtures.
 */
let real: PrismaClient | null = null;
let initFailed = false;

function client(): PrismaClient {
  if (real) return real;
  if (initFailed) {
    throw new Error("@prisma/client not initialized");
  }
  if (global.prisma) {
    real = global.prisma;
    return real;
  }
  try {
    real = new PrismaClient({
      log:
        process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
    if (process.env.NODE_ENV !== "production") global.prisma = real;
    return real;
  } catch (err) {
    initFailed = true;
    throw err;
  }
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (prop === "$connect" || prop === "$disconnect") {
      return async () => {
        // no-op when the client isn't available
      };
    }
    return (client() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
