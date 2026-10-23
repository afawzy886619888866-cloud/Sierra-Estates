 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * google slides source for openmemory - production grade
 * requires: googleapis
 * env vars: GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_CREDENTIALS_JSON
 */

import {
    base_source,
    source_config_error,


} from "./base";

export class google_slides_source extends base_source {constructor(...args) { super(...args); google_slides_source.prototype.__init.call(this);google_slides_source.prototype.__init2.call(this);google_slides_source.prototype.__init3.call(this); }
    __init() {this.name = "google_slides"}
     __init2() {this.service = null}
     __init3() {this.auth = null}

    async _connect(creds) {
        let google;
        try {
            google = await import("googleapis").then((m) => m.google);
        } catch (e) {
            throw new source_config_error(
                "missing deps: npm install googleapis",
                this.name,
            );
        }

        const scopes = [
            "https://www.googleapis.com/auth/presentations.readonly",
        ];

        if (creds.credentials_json) {
            this.auth = new google.auth.GoogleAuth({
                credentials: creds.credentials_json,
                scopes,
            });
        } else if (creds.service_account_file) {
            this.auth = new google.auth.GoogleAuth({
                keyFile: creds.service_account_file,
                scopes,
            });
        } else if (process.env.GOOGLE_CREDENTIALS_JSON) {
            this.auth = new google.auth.GoogleAuth({
                credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
                scopes,
            });
        } else if (process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
            this.auth = new google.auth.GoogleAuth({
                keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
                scopes,
            });
        } else {
            throw new source_config_error(
                "no credentials: set GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_CREDENTIALS_JSON",
                this.name,
            );
        }

        this.service = google.slides({ version: "v1", auth: this.auth });
        return true;
    }

    async _list_items(filters) {
        if (!filters.presentation_id) {
            throw new source_config_error(
                "presentation_id is required",
                this.name,
            );
        }

        const pres = await this.service.presentations.get({
            presentationId: filters.presentation_id,
        });

        return (pres.data.slides || []).map((slide, i) => ({
            id: `${filters.presentation_id}#${slide.objectId}`,
            name: `Slide ${i + 1}`,
            type: "slide",
            index: i,
            presentation_id: filters.presentation_id,
            object_id: slide.objectId,
        }));
    }

    async _fetch_item(item_id) {
        const [presentation_id, slide_id] = item_id.includes("#")
            ? item_id.split("#", 2)
            : [item_id, null];

        const pres = await this.service.presentations.get({
            presentationId: presentation_id,
        });

        const extract_text = (element) => {
            const texts = [];

            if (_optionalChain([element, 'access', _ => _.shape, 'optionalAccess', _2 => _2.text])) {
                for (const te of element.shape.text.textElements || []) {
                    if (te.textRun) texts.push(te.textRun.content || "");
                }
            }

            if (element.table) {
                for (const row of element.table.tableRows || []) {
                    for (const cell of row.tableCells || []) {
                        if (cell.text) {
                            for (const te of cell.text.textElements || []) {
                                if (te.textRun)
                                    texts.push(te.textRun.content || "");
                            }
                        }
                    }
                }
            }

            return texts.join("");
        };

        const all_text = [];

        for (let i = 0; i < (pres.data.slides || []).length; i++) {
            const slide = pres.data.slides[i];
            if (slide_id && slide.objectId !== slide_id) continue;

            const slide_texts = [`## Slide ${i + 1}`];

            for (const element of slide.pageElements || []) {
                const txt = extract_text(element);
                if (txt.trim()) slide_texts.push(txt.trim());
            }

            all_text.push(...slide_texts);
        }

        const text = all_text.join("\n\n");

        return {
            id: item_id,
            name: pres.data.title || "Untitled Presentation",
            type: "presentation",
            text,
            data: text,
            meta: {
                source: "google_slides",
                presentation_id,
                slide_count: _optionalChain([pres, 'access', _3 => _3.data, 'access', _4 => _4.slides, 'optionalAccess', _5 => _5.length]) || 0,
            },
        };
    }
}
