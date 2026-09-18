import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "../../server/routers.js";
import { createContext } from "../../server/_core/context.js";

export default function handler(req: any, res: any) {
  const path = Array.isArray(req.query?.path) ? req.query.path.join("/") : req.query?.path;
  const procedurePath = path ?? req.url?.split("/api/trpc/")[1]?.split("?")[0];
  if (path) {
    const query = typeof req.url === "string" && req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    req.url = `/api/trpc/${path}${query}`;
  }

  return nodeHTTPRequestHandler({
    endpoint: "/api/trpc",
    req,
    res,
    path: procedurePath,
    router: appRouter,
    createContext: ({ req: contextReq, res: contextRes }) =>
      createContext({ req: contextReq as never, res: contextRes as never }),
  });
}
