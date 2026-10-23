 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { add_hsg_memory, hsg_query } from "../memory/hsg";
import { q, } from "./db";









export class Memory {
    

    constructor(user_id) {
        this.default_user = user_id || null;
    }

    /**
     * Store new content in the Hybrid Sector Graph (HSG).
     * Automatically handles sector routing and embedding.
     *
     * @param content Raw text to store
     * @param opts Options including user_id, project_id, and tags
     */
    async add(content, opts) {
        const uid = _optionalChain([opts, 'optionalAccess', _ => _.user_id]) || this.default_user;
        const proj = _optionalChain([opts, 'optionalAccess', _2 => _2.project_id]) || null;
        const tags = _optionalChain([opts, 'optionalAccess', _3 => _3.tags]) || [];

        // Clean metadata by removing handled fields
        const meta = { ...opts };
        delete meta.user_id;
        delete meta.project_id;
        delete meta.tags;

        const tags_str = JSON.stringify(tags);

        // Store with project isolation if proj is provided
        const res = await add_hsg_memory(
            content,
            tags_str,
            meta,
            _nullishCoalesce(uid, () => ( undefined)),
            _nullishCoalesce(proj, () => ( undefined)),
        );
        return res;
    }

    /**
     * Retrieve a memory by its unique ID.
     */
    async get(id) {
        return await q.get_mem.get(id);
    }

    /**
     * Perform a hybrid semantic search across all brain sectors.
     * Results are automatically filtered by user_id and project_id if provided.
     *
     * @param query Search query text
     * @param opts Options including limit, project_id, and sector filters
     */
    async search(
        query,
        opts




,
    ) {
        const k = _optionalChain([opts, 'optionalAccess', _4 => _4.limit]) || 10;
        const uid = _optionalChain([opts, 'optionalAccess', _5 => _5.user_id]) || this.default_user;
        const proj = _optionalChain([opts, 'optionalAccess', _6 => _6.project_id]) || null;
        const f = {};

        // Apply filters
        if (uid) f.user_id = uid;
        if (proj) f.project_id = proj;
        if (_optionalChain([opts, 'optionalAccess', _7 => _7.sectors])) f.sectors = opts.sectors;

        // Perform hybrid search across sectors
        return await hsg_query(query, k, f);
    }

    async delete_all(user_id) {
        const uid = user_id || this.default_user;
        if (uid) {
        }
    }

    async wipe() {
        console.log("[Memory] Wiping DB...");

        await q.clear_all.run();
    }

    /**
     * get a pre-configured source connector.
     *
     * usage:
     *   const github = mem.source("github")
     *   await github.connect({ token: "ghp_..." })
     *   await github.ingest_all({ repo: "owner/repo" })
     *
     * available sources: github, notion, google_drive, google_sheets,
     *                   google_slides, onedrive, web_crawler
     */
    source(name) {
        const sources = {
            github: () =>
                import("../sources/github").then(
                    (m) => new m.github_source(_nullishCoalesce(this.default_user, () => ( undefined))),
                ),
            notion: () =>
                import("../sources/notion").then(
                    (m) => new m.notion_source(_nullishCoalesce(this.default_user, () => ( undefined))),
                ),
            google_drive: () =>
                import("../sources/google_drive").then(
                    (m) =>
                        new m.google_drive_source(
                            _nullishCoalesce(this.default_user, () => ( undefined)),
                        ),
                ),
            google_sheets: () =>
                import("../sources/google_sheets").then(
                    (m) =>
                        new m.google_sheets_source(
                            _nullishCoalesce(this.default_user, () => ( undefined)),
                        ),
                ),
            google_slides: () =>
                import("../sources/google_slides").then(
                    (m) =>
                        new m.google_slides_source(
                            _nullishCoalesce(this.default_user, () => ( undefined)),
                        ),
                ),
            onedrive: () =>
                import("../sources/onedrive").then(
                    (m) =>
                        new m.onedrive_source(_nullishCoalesce(this.default_user, () => ( undefined))),
                ),
            web_crawler: () =>
                import("../sources/web_crawler").then(
                    (m) =>
                        new m.web_crawler_source(
                            _nullishCoalesce(this.default_user, () => ( undefined)),
                        ),
                ),
        };

        if (!(name in sources)) {
            throw new Error(
                `unknown source: ${name}. available: ${Object.keys(sources).join(", ")}`,
            );
        }

        return sources[name]();
    }
}
