 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * google sheets source for openmemory - production grade
 * requires: googleapis
 * env vars: GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_CREDENTIALS_JSON
 */

import {
    base_source,
    source_config_error,


} from "./base";

export class google_sheets_source extends base_source {constructor(...args) { super(...args); google_sheets_source.prototype.__init.call(this);google_sheets_source.prototype.__init2.call(this);google_sheets_source.prototype.__init3.call(this); }
    __init() {this.name = "google_sheets"}
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
            "https://www.googleapis.com/auth/spreadsheets.readonly",
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

        this.service = google.sheets({ version: "v4", auth: this.auth });
        return true;
    }

    async _list_items(filters) {
        if (!filters.spreadsheet_id) {
            throw new source_config_error(
                "spreadsheet_id is required",
                this.name,
            );
        }

        const meta = await this.service.spreadsheets.get({
            spreadsheetId: filters.spreadsheet_id,
        });

        return (meta.data.sheets || []).map((sheet, i) => ({
            id: `${filters.spreadsheet_id}!${_optionalChain([sheet, 'access', _ => _.properties, 'optionalAccess', _2 => _2.title]) || "Sheet1"}`,
            name: _optionalChain([sheet, 'access', _3 => _3.properties, 'optionalAccess', _4 => _4.title]) || "Sheet1",
            type: "sheet",
            index: i,
            spreadsheet_id: filters.spreadsheet_id,
        }));
    }

    async _fetch_item(item_id) {
        const [spreadsheet_id, sheet_range] = item_id.includes("!")
            ? item_id.split("!", 2)
            : [item_id, "A:ZZ"];

        const result = await this.service.spreadsheets.values.get({
            spreadsheetId: spreadsheet_id,
            range: sheet_range,
        });

        const values = result.data.values || [];

        const lines = values.map((row, i) => {
            const line = row.map(String).join(" | ");
            return i === 0
                ? `${line}\n${row.map(() => "---").join(" | ")}`
                : line;
        });

        const text = lines.join("\n");

        return {
            id: item_id,
            name: sheet_range,
            type: "spreadsheet",
            text,
            data: text,
            meta: {
                source: "google_sheets",
                spreadsheet_id,
                range: sheet_range,
                row_count: values.length,
            },
        };
    }
}
