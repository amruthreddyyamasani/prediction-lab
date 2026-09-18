import { describe, expect, it } from "vitest";
import app from "../api/[...path].js";

describe("Vercel API adapter", () => {
  it("serves the existing tRPC health procedure as JSON", async () => {
    const server = app.listen(0);
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Test server did not bind to a port");
      const input = encodeURIComponent(JSON.stringify({ json: { timestamp: 1 } }));
      const response = await fetch(`http://127.0.0.1:${address.port}/api/trpc/system.health?input=${input}`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(await response.json()).toEqual({ result: { data: { json: { ok: true } } } });
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
