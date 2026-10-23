 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * onedrive source for openmemory - production grade
 * requires: @azure/msal-node
 * env vars: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID
 */

import {
    base_source,
    source_config_error,
    source_auth_error,


} from "./base";

export class onedrive_source extends base_source {constructor(...args) { super(...args); onedrive_source.prototype.__init.call(this);onedrive_source.prototype.__init2.call(this);onedrive_source.prototype.__init3.call(this); }
    __init() {this.name = "onedrive"}
     __init2() {this.access_token = null}
     __init3() {this.graph_url = "https://graph.microsoft.com/v1.0"}

    async _connect(creds) {
        if (creds.access_token) {
            this.access_token = creds.access_token;
            return true;
        }

        let msal;
        try {
            msal = await import("@azure/msal-node");
        } catch (e) {
            throw new source_config_error(
                "missing deps: npm install @azure/msal-node",
                this.name,
            );
        }

        const client_id = creds.client_id || process.env.AZURE_CLIENT_ID;
        const client_secret =
            creds.client_secret || process.env.AZURE_CLIENT_SECRET;
        const tenant_id = creds.tenant_id || process.env.AZURE_TENANT_ID;

        if (!client_id || !client_secret || !tenant_id) {
            throw new source_config_error(
                "no credentials: set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID",
                this.name,
            );
        }

        const app = new msal.ConfidentialClientApplication({
            auth: {
                clientId: client_id,
                clientSecret: client_secret,
                authority: `https://login.microsoftonline.com/${tenant_id}`,
            },
        });

        const result = await app.acquireTokenByClientCredential({
            scopes: ["https://graph.microsoft.com/.default"],
        });

        if (_optionalChain([result, 'optionalAccess', _ => _.accessToken])) {
            this.access_token = result.accessToken;
            return true;
        }

        throw new source_auth_error(
            "auth failed: no access token returned",
            this.name,
        );
    }

    async _list_items(filters) {
        const folder_path = filters.folder_path || "/";
        const user_principal = filters.user_principal;

        const base = user_principal
            ? `${this.graph_url}/users/${user_principal}/drive`
            : `${this.graph_url}/me/drive`;

        const url =
            folder_path === "/"
                ? `${base}/root/children`
                : `${base}/root:/${folder_path.replace(/^\/|\/$/g, "")}:/children`;

        const results = [];
        let next_url = url;

        while (next_url) {
            const resp = await fetch(next_url, {
                headers: { Authorization: `Bearer ${this.access_token}` },
            });

            if (!resp.ok)
                throw new Error(`http ${resp.status}: ${resp.statusText}`);

            const data = await resp.json();

            for (const item of data.value || []) {
                results.push({
                    id: item.id,
                    name: item.name,
                    type:
                        "folder" in item
                            ? "folder"
                            : _optionalChain([item, 'access', _2 => _2.file, 'optionalAccess', _3 => _3.mimeType]) || "file",
                    size: item.size || 0,
                    modified: item.lastModifiedDateTime,
                    path: _optionalChain([item, 'access', _4 => _4.parentReference, 'optionalAccess', _5 => _5.path]) || "",
                });
            }

            next_url = data["@odata.nextLink"] || null;
        }

        return results;
    }

    async _fetch_item(item_id) {
        const base = `${this.graph_url}/me/drive`;

        const meta_resp = await fetch(`${base}/items/${item_id}`, {
            headers: { Authorization: `Bearer ${this.access_token}` },
        });

        if (!meta_resp.ok) throw new Error(`http ${meta_resp.status}`);
        const meta = await meta_resp.json();

        const content_resp = await fetch(`${base}/items/${item_id}/content`, {
            headers: { Authorization: `Bearer ${this.access_token}` },
            redirect: "follow",
        });

        if (!content_resp.ok) throw new Error(`http ${content_resp.status}`);
        const data = Buffer.from(await content_resp.arrayBuffer());

        let text = "";
        try {
            text = data.toString("utf-8");
        } catch (e2) {}

        return {
            id: item_id,
            name: meta.name || "unknown",
            type: _optionalChain([meta, 'access', _6 => _6.file, 'optionalAccess', _7 => _7.mimeType]) || "unknown",
            text,
            data,
            meta: {
                source: "onedrive",
                item_id,
                size: meta.size || 0,
                mime_type: _optionalChain([meta, 'access', _8 => _8.file, 'optionalAccess', _9 => _9.mimeType]) || "",
            },
        };
    }
}
