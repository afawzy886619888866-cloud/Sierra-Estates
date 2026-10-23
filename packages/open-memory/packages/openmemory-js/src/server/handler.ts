import { server, type App } from "./server";
import { env } from "../core/cfg";
import { routes } from "./routes";
import { mcp } from "../ai/mcp";
import { authenticate_api_request } from "./middleware/auth";
import { req_tracker_mw } from "./routes/dashboard";
import type { IncomingMessage, ServerResponse } from "http";

let appInstance: App | null = null;

export function getApp(): App {
    if (!appInstance) {
        const app = server({ max_payload_size: env.max_payload_size });
        app.use(req_tracker_mw());
        app.use((req: any, res: any, next: any) => {
            const origin = req.headers.origin;
            const isIdeRoute = (req.path || req.url || "").startsWith("/api/ide/");
            const allowIdeOrigin =
                env.ide_mode &&
                typeof origin === "string" &&
                env.ide_allowed_origins.includes(origin);

            if (isIdeRoute && allowIdeOrigin) {
                res.setHeader("Access-Control-Allow-Origin", origin);
                res.setHeader("Vary", "Origin");
            } else {
                res.setHeader("Access-Control-Allow-Origin", "*");
            }
            res.setHeader(
                "Access-Control-Allow-Methods",
                "GET,POST,PUT,PATCH,DELETE,OPTIONS",
            );
            res.setHeader(
                "Access-Control-Allow-Headers",
                "Content-Type,Authorization,x-api-key",
            );
            if (req.method === "OPTIONS") {
                res.status(200).end();
                return;
            }
            next();
        });
        app.use(authenticate_api_request);
        routes(app);
        mcp(app);
        appInstance = app;
    }
    return appInstance;
}

/**
 * Serverless Entry Point for Vercel / Cloud Functions
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
    const app = getApp();
    return app.handleRequest(req, res);
}
