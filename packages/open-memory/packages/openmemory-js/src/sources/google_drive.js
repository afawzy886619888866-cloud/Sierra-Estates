 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * google drive source for openmemory - production grade
 * requires: googleapis
 * env vars: GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_CREDENTIALS_JSON
 */

import {
    base_source,
    source_config_error,


} from "./base";

export class google_drive_source extends base_source {constructor(...args) { super(...args); google_drive_source.prototype.__init.call(this);google_drive_source.prototype.__init2.call(this);google_drive_source.prototype.__init3.call(this); }
    __init() {this.name = "google_drive"}
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

        const scopes = ["https://www.googleapis.com/auth/drive.readonly"];

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

        this.service = google.drive({ version: "v3", auth: this.auth });
        return true;
    }

    async _list_items(filters) {
        const q_parts = ["trashed=false"];

        if (filters.folder_id) {
            q_parts.push(`'${filters.folder_id}' in parents`);
        }

        if (_optionalChain([filters, 'access', _ => _.mime_types, 'optionalAccess', _2 => _2.length])) {
            const mime_q = filters.mime_types
                .map((m) => `mimeType='${m}'`)
                .join(" or ");
            q_parts.push(`(${mime_q})`);
        }

        const query = q_parts.join(" and ");
        const results = [];
        let page_token;

        do {
            const resp = await this.service.files.list({
                q: query,
                spaces: "drive",
                fields: "nextPageToken, files(id, name, mimeType, modifiedTime, size)",
                pageToken: page_token,
                pageSize: 100,
            });

            for (const f of resp.data.files || []) {
                results.push({
                    id: f.id,
                    name: f.name,
                    type: f.mimeType,
                    modified: f.modifiedTime,
                    size: f.size,
                });
            }

            page_token = resp.data.nextPageToken;
        } while (page_token);

        return results;
    }

    async _fetch_item(item_id) {
        const meta = await this.service.files.get({
            fileId: item_id,
            fields: "id,name,mimeType",
        });

        const mime = meta.data.mimeType;
        let text = "";
        let data = "";

        if (mime === "application/vnd.google-apps.document") {
            const resp = await this.service.files.export({
                fileId: item_id,
                mimeType: "text/plain",
            });
            text = resp.data;
            data = text;
        } else if (mime === "application/vnd.google-apps.spreadsheet") {
            const resp = await this.service.files.export({
                fileId: item_id,
                mimeType: "text/csv",
            });
            text = resp.data;
            data = text;
        } else if (mime === "application/vnd.google-apps.presentation") {
            const resp = await this.service.files.export({
                fileId: item_id,
                mimeType: "text/plain",
            });
            text = resp.data;
            data = text;
        } else {
            const resp = await this.service.files.get(
                { fileId: item_id, alt: "media" },
                { responseType: "arraybuffer" },
            );
            data = Buffer.from(resp.data);
            try {
                text = data.toString("utf-8");
            } catch (e2) {
                text = "";
            }
        }

        return {
            id: item_id,
            name: meta.data.name,
            type: mime,
            text,
            data,
            meta: { source: "google_drive", file_id: item_id, mime_type: mime },
        };
    }
}
