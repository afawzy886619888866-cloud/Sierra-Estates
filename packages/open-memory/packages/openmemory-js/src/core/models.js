 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { readFileSync, existsSync } from "fs";
import { join } from "path";



let cfg = null;

export const load_models = () => {
    if (cfg) return cfg;
    const p = join(__dirname, "../../../models.yml");
    if (!existsSync(p)) {
        console.error("[MODELS] models.yml not found, using defaults");
        return get_defaults();
    }
    try {
        const yml = readFileSync(p, "utf-8");
        cfg = parse_yaml(yml);
        console.error(
            `[MODELS] Loaded models.yml (${Object.keys(cfg).length} sectors)`,
        );
        return cfg;
    } catch (e) {
        console.error("[MODELS] Failed to parse models.yml:", e);
        return get_defaults();
    }
};

const parse_yaml = (yml) => {
    const lines = yml.split("\n");
    const obj = {};
    let cur_sec = null;
    for (const line of lines) {
        const trim = line.trim();
        if (!trim || trim.startsWith("#")) continue;
        const indent = line.search(/\S/);
        const [key, ...val_parts] = trim.split(":");
        const val = val_parts.join(":").trim();
        if (indent === 0 && val) {
            continue;
        } else if (indent === 0) {
            cur_sec = key;
            obj[cur_sec] = {};
        } else if (cur_sec && val) {
            obj[cur_sec][key] = val;
        }
    }
    return obj;
};

const get_defaults = () => ({
    episodic: {
        ollama: "nomic-embed-text",
        openai: "text-embedding-3-small",
        gemini: "models/gemini-embedding-001",
        aws: "amazon.titan-embed-text-v2:0",
        siray: "text-embedding-3-small",
        local: "all-MiniLM-L6-v2",
    },
    semantic: {
        ollama: "nomic-embed-text",
        openai: "text-embedding-3-small",
        gemini: "models/gemini-embedding-001",
        aws: "amazon.titan-embed-text-v2:0",
        siray: "text-embedding-3-small",
        local: "all-MiniLM-L6-v2",
    },
    procedural: {
        ollama: "nomic-embed-text",
        openai: "text-embedding-3-small",
        gemini: "models/gemini-embedding-001",
        aws: "amazon.titan-embed-text-v2:0",
        local: "all-MiniLM-L6-v2",
    },
    emotional: {
        ollama: "nomic-embed-text",
        openai: "text-embedding-3-small",
        gemini: "models/gemini-embedding-001",
        aws: "amazon.titan-embed-text-v2:0",
        local: "all-MiniLM-L6-v2",
    },
    reflective: {
        ollama: "nomic-embed-text",
        openai: "text-embedding-3-large",
        gemini: "models/gemini-embedding-001",
        aws: "amazon.titan-embed-text-v2:0",
        local: "all-mpnet-base-v2",
    },
});

export const get_model = (sector, provider) => {
    if (provider === "ollama" && process.env.OM_OLLAMA_MODEL) {
        return process.env.OM_OLLAMA_MODEL;
    }
    if (provider === "openai" && process.env.OM_OPENAI_MODEL) {
        return process.env.OM_OPENAI_MODEL;
    }

    const cfg = load_models();
    return (
        _optionalChain([cfg, 'access', _ => _[sector], 'optionalAccess', _2 => _2[provider]]) ||
        _optionalChain([cfg, 'access', _3 => _3.semantic, 'optionalAccess', _4 => _4[provider]]) ||
        "nomic-embed-text"
    );
};

export const get_provider_config = (provider) => {
    return {};
};
