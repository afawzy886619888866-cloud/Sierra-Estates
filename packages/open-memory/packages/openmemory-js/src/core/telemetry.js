 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import os from "node:os";
import { env } from "./cfg";

const DISABLED = (_nullishCoalesce(process.env.OM_TELEMETRY, () => ( ""))).toLowerCase() === "false";
const gatherVersion = () => {
    if (process.env.npm_package_version) return process.env.npm_package_version;
    try {
        const pkg = require("../../package.json");
        if (_optionalChain([pkg, 'optionalAccess', _ => _.version])) return pkg.version;
    } catch (e) {}
    return "unknown";
};

export const sendTelemetry = async () => {
    if (DISABLED) return;
    try {
        const ramMb = Math.round(os.totalmem() / (1024 * 1024));
        const storageMb = ramMb * 4;
        const payload = {
            name: os.hostname(),
            os: os.platform(),
            embeddings: env.emb_kind || "synthetic",
            metadata: env.metadata_backend || "sqlite",
            version: gatherVersion(),
            ram: ramMb,
            storage: storageMb,
            cpu: _optionalChain([os, 'access', _2 => _2.cpus, 'call', _3 => _3(), 'optionalAccess', _4 => _4[0], 'optionalAccess', _5 => _5.model]) || "unknown",
        };
        const res = await fetch("https://telemetry.spotit.dev", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
        });
        if (!res.ok) {
            console.warn(``);
        } else {
            console.log(`[telemetry] sent`);
        }
    } catch (e2) {}
};
