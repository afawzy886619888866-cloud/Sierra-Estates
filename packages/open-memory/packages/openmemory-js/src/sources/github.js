 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * github source for openmemory - production grade
 * requires: @octokit/rest
 * env vars: GITHUB_TOKEN
 */

import {
    base_source,
    source_config_error,


} from "./base";

export class github_source extends base_source {constructor(...args) { super(...args); github_source.prototype.__init.call(this);github_source.prototype.__init2.call(this); }
    __init() {this.name = "github"}
     __init2() {this.octokit = null}

    async _connect(creds) {
        let Octokit;
        try {
            Octokit = await import("@octokit/rest").then((m) => m.Octokit);
        } catch (e2) {
            throw new source_config_error(
                "missing deps: npm install @octokit/rest",
                this.name,
            );
        }

        const token = creds.token || process.env.GITHUB_TOKEN;

        if (!token) {
            throw new source_config_error(
                "no credentials: set GITHUB_TOKEN",
                this.name,
            );
        }

        this.octokit = new Octokit({ auth: token });
        return true;
    }

    async _list_items(filters) {
        if (!filters.repo) {
            throw new source_config_error(
                "repo is required (format: owner/repo)",
                this.name,
            );
        }

        const [owner, repo] = filters.repo.split("/");
        const path = _optionalChain([filters, 'access', _ => _.path, 'optionalAccess', _2 => _2.replace, 'call', _3 => _3(/^\//, "")]) || "";
        const include_issues = filters.include_issues || false;

        const results = [];

        try {
            const resp = await this.octokit.repos.getContent({
                owner,
                repo,
                path,
            });
            const contents = Array.isArray(resp.data) ? resp.data : [resp.data];

            for (const content of contents) {
                results.push({
                    id: `${filters.repo}:${content.path}`,
                    name: content.name,
                    type:
                        content.type === "dir"
                            ? "dir"
                            : content.encoding || "file",
                    path: content.path,
                    size: content.size || 0,
                    sha: content.sha,
                });
            }
        } catch (e) {
            console.warn(`[github] failed to list ${path}: ${e.message}`);
        }

        if (include_issues) {
            try {
                const resp = await this.octokit.issues.listForRepo({
                    owner,
                    repo,
                    state: "all",
                    per_page: 50,
                });

                for (const issue of resp.data) {
                    results.push({
                        id: `${filters.repo}:issue:${issue.number}`,
                        name: issue.title,
                        type: "issue",
                        number: issue.number,
                        state: issue.state,
                        labels: issue.labels.map((l) => l.name),
                    });
                }
            } catch (e) {
                console.warn(`[github] failed to list issues: ${e.message}`);
            }
        }

        return results;
    }

    async _fetch_item(item_id) {
        const parts = item_id.split(":");
        const repo_full = parts[0];
        const [owner, repo] = repo_full.split("/");

        if (parts.length >= 3 && parts[1] === "issue") {
            const issue_num = parseInt(parts[2]);
            const issue = await this.octokit.issues.get({
                owner,
                repo,
                issue_number: issue_num,
            });

            const comments = await this.octokit.issues.listComments({
                owner,
                repo,
                issue_number: issue_num,
            });

            const text_parts = [
                `# ${issue.data.title}`,
                `**State:** ${issue.data.state}`,
                `**Labels:** ${issue.data.labels.map((l) => l.name).join(", ")}`,
                "",
                issue.data.body || "",
            ];

            for (const comment of comments.data) {
                text_parts.push(
                    `\n---\n**${_optionalChain([comment, 'access', _4 => _4.user, 'optionalAccess', _5 => _5.login])}:** ${comment.body}`,
                );
            }

            const text = text_parts.join("\n");

            return {
                id: item_id,
                name: issue.data.title,
                type: "issue",
                text,
                data: text,
                meta: {
                    source: "github",
                    repo: repo_full,
                    issue_number: issue_num,
                    state: issue.data.state,
                },
            };
        }

        const path = parts.slice(1).join(":");
        const resp = await this.octokit.repos.getContent({ owner, repo, path });

        if (Array.isArray(resp.data)) {
            const text = resp.data.map((c) => `- ${c.path}`).join("\n");
            return {
                id: item_id,
                name: path || repo_full,
                type: "directory",
                text,
                data: text,
                meta: { source: "github", repo: repo_full, path },
            };
        }

        const content = resp.data;
        let text = "";
        let data = "";

        if (content.content) {
            data = Buffer.from(content.content, "base64");
            try {
                text = data.toString("utf-8");
            } catch (e3) {}
        }

        return {
            id: item_id,
            name: content.name,
            type: content.encoding || "file",
            text,
            data,
            meta: {
                source: "github",
                repo: repo_full,
                path: content.path,
                sha: content.sha,
                size: content.size,
            },
        };
    }
}
