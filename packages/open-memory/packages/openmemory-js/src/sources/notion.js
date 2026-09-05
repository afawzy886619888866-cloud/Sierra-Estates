 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * notion source for openmemory - production grade
 * requires: @notionhq/client
 * env vars: NOTION_API_KEY
 */

import {
    base_source,
    source_config_error,


} from "./base";

export class notion_source extends base_source {constructor(...args) { super(...args); notion_source.prototype.__init.call(this);notion_source.prototype.__init2.call(this); }
    __init() {this.name = "notion"}
     __init2() {this.client = null}

    async _connect(creds) {
        let Client;
        try {
            Client = await import("@notionhq/client").then((m) => m.Client);
        } catch (e) {
            throw new source_config_error(
                "missing deps: npm install @notionhq/client",
                this.name,
            );
        }

        const api_key = creds.api_key || process.env.NOTION_API_KEY;

        if (!api_key) {
            throw new source_config_error(
                "no credentials: set NOTION_API_KEY",
                this.name,
            );
        }

        this.client = new Client({ auth: api_key });
        return true;
    }

     extract_title(page) {
        const props = page.properties || {};
        for (const prop of Object.values(props) ) {
            if (prop.type === "title" && _optionalChain([prop, 'access', _ => _.title, 'optionalAccess', _2 => _2[0]])) {
                return prop.title[0].plain_text || "";
            }
        }
        return "";
    }

    async _list_items(filters) {
        const results = [];

        if (filters.database_id) {
            let has_more = true;
            let start_cursor;

            while (has_more) {
                const resp = await this.client.databases.query({
                    database_id: filters.database_id,
                    start_cursor,
                });

                for (const page of resp.results) {
                    results.push({
                        id: page.id,
                        name: this.extract_title(page) || "Untitled",
                        type: "page",
                        url: page.url || "",
                        last_edited: page.last_edited_time,
                    });
                }

                has_more = resp.has_more;
                start_cursor = resp.next_cursor;
            }
        } else {
            const resp = await this.client.search({
                filter: { property: "object", value: "page" },
            });

            for (const page of resp.results) {
                results.push({
                    id: page.id,
                    name: this.extract_title(page) || "Untitled",
                    type: "page",
                    url: page.url || "",
                    last_edited: page.last_edited_time,
                });
            }
        }

        return results;
    }

     block_to_text(block) {
        const texts = [];
        const type = block.type;

        const text_blocks = [
            "paragraph",
            "heading_1",
            "heading_2",
            "heading_3",
            "bulleted_list_item",
            "numbered_list_item",
            "quote",
            "callout",
        ];

        if (text_blocks.includes(type)) {
            const rich_text = _optionalChain([block, 'access', _3 => _3[type], 'optionalAccess', _4 => _4.rich_text]) || [];
            for (const rt of rich_text) {
                texts.push(rt.plain_text || "");
            }
        } else if (type === "code") {
            const rich_text = _optionalChain([block, 'access', _5 => _5.code, 'optionalAccess', _6 => _6.rich_text]) || [];
            const lang = _optionalChain([block, 'access', _7 => _7.code, 'optionalAccess', _8 => _8.language]) || "";
            const code = rich_text
                .map((rt) => rt.plain_text || "")
                .join("");
            texts.push(`\`\`\`${lang}\n${code}\n\`\`\``);
        } else if (type === "to_do") {
            const checked = _optionalChain([block, 'access', _9 => _9.to_do, 'optionalAccess', _10 => _10.checked]) || false;
            const rich_text = _optionalChain([block, 'access', _11 => _11.to_do, 'optionalAccess', _12 => _12.rich_text]) || [];
            const prefix = checked ? "[x] " : "[ ] ";
            texts.push(
                prefix +
                    rich_text.map((rt) => rt.plain_text || "").join(""),
            );
        }

        return texts.join("");
    }

    async _fetch_item(item_id) {
        const page = await this.client.pages.retrieve({ page_id: item_id });
        const title = this.extract_title(page);

        const blocks = [];
        let has_more = true;
        let start_cursor;

        while (has_more) {
            const resp = await this.client.blocks.children.list({
                block_id: item_id,
                start_cursor,
            });
            blocks.push(...resp.results);
            has_more = resp.has_more;
            start_cursor = resp.next_cursor;
        }

        const text_parts = title ? [`# ${title}`] : [];

        for (const block of blocks) {
            const txt = this.block_to_text(block);
            if (txt.trim()) text_parts.push(txt);
        }

        const text = text_parts.join("\n\n");

        return {
            id: item_id,
            name: title || "Untitled",
            type: "notion_page",
            text,
            data: text,
            meta: {
                source: "notion",
                page_id: item_id,
                url: page.url || "",
                block_count: blocks.length,
            },
        };
    }
}
