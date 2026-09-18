import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "../../server/routers.js";
import { createContext } from "../../server/_core/context.js";

export default function handler(req: any, res: any) {
  return nodeHTTPRequestHandler({
    endpoint: "/api/trpc",
    req,
    res,
    router: appRouter,
    createContext: ({ req: contextReq, res: contextRes }) =>
      createContext({ req: contextReq as never, res: contextRes as never }),
  });
}
