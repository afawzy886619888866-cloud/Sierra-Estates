 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * web crawler source for openmemory - production grade
 * requires: cheerio (for html parsing)
 * no auth required for public urls
 */

import {
    base_source,
    source_config_error,



} from "./base";







export class web_crawler_source extends base_source {
    __init() {this.name = "web_crawler"}
    
    
    
     __init2() {this.visited = new Set()}
     __init3() {this.crawled = []}

    constructor(user_id, config) {
        super(user_id, config);web_crawler_source.prototype.__init.call(this);web_crawler_source.prototype.__init2.call(this);web_crawler_source.prototype.__init3.call(this);;
        this.max_pages = _optionalChain([config, 'optionalAccess', _2 => _2.max_pages]) || 50;
        this.max_depth = _optionalChain([config, 'optionalAccess', _3 => _3.max_depth]) || 3;
        this.timeout = _optionalChain([config, 'optionalAccess', _4 => _4.timeout]) || 30000;
    }

    async _connect() {
        return true;
    }

    async _list_items(filters) {
        if (!filters.start_url) {
            throw new source_config_error("start_url is required", this.name);
        }

        let cheerio;
        try {
            cheerio = await import("cheerio");
        } catch (e2) {
            throw new source_config_error(
                "missing deps: npm install cheerio",
                this.name,
            );
        }

        this.visited.clear();
        this.crawled = [];

        const base_url = new URL(filters.start_url);
        const base_domain = base_url.hostname;
        const to_visit = [
            { url: filters.start_url, depth: 0 },
        ];
        const follow_links = filters.follow_links !== false;

        while (to_visit.length > 0 && this.crawled.length < this.max_pages) {
            const { url, depth } = to_visit.shift();

            if (this.visited.has(url) || depth > this.max_depth) continue;
            this.visited.add(url);

            try {
                const controller = new AbortController();
                const timeout_id = setTimeout(
                    () => controller.abort(),
                    this.timeout,
                );

                const resp = await fetch(url, {
                    headers: {
                        "User-Agent": "OpenMemory-Crawler/1.0 (compatible)",
                    },
                    signal: controller.signal,
                });

                clearTimeout(timeout_id);

                if (!resp.ok) continue;

                const content_type = resp.headers.get("content-type") || "";
                if (!content_type.includes("text/html")) continue;

                const html = await resp.text();
                const $ = cheerio.load(html);

                const title = $("title").text() || url;

                this.crawled.push({
                    id: url,
                    name: title.trim(),
                    type: "webpage",
                    url,
                    depth,
                });

                if (follow_links && depth < this.max_depth) {
                    $("a[href]").each((_, el) => {
                        try {
                            const href = $(el).attr("href");
                            if (!href) return;

                            const full_url = new URL(href, url);
                            if (full_url.hostname !== base_domain) return;

                            const clean_url = `${full_url.protocol}//${full_url.host}${full_url.pathname}`;
                            if (!this.visited.has(clean_url)) {
                                to_visit.push({
                                    url: clean_url,
                                    depth: depth + 1,
                                });
                            }
                        } catch (e3) {}
                    });
                }
            } catch (e) {
                console.warn(
                    `[web_crawler] failed to fetch ${url}: ${e.message}`,
                );
            }
        }

        return this.crawled;
    }

    async _fetch_item(item_id) {
        let cheerio;
        try {
            cheerio = await import("cheerio");
        } catch (e4) {
            throw new source_config_error(
                "missing deps: npm install cheerio",
                this.name,
            );
        }

        const controller = new AbortController();
        const timeout_id = setTimeout(() => controller.abort(), this.timeout);

        const resp = await fetch(item_id, {
            headers: { "User-Agent": "OpenMemory-Crawler/1.0 (compatible)" },
            signal: controller.signal,
        });

        clearTimeout(timeout_id);

        if (!resp.ok)
            throw new Error(`http ${resp.status}: ${resp.statusText}`);

        const html = await resp.text();
        const $ = cheerio.load(html);

        $("script, style, nav, footer, header, aside").remove();

        const title = $("title").text() || item_id;

        const main = $("main").length
            ? $("main")
            : $("article").length
              ? $("article")
              : $("body");
        let text = main.text();

        text = text
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .join("\n");

        return {
            id: item_id,
            name: title.trim(),
            type: "webpage",
            text,
            data: text,
            meta: {
                source: "web_crawler",
                url: item_id,
                char_count: text.length,
            },
        };
    }
}
