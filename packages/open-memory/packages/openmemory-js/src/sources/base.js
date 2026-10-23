 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * base source class for openmemory data sources - production grade
 *
 * features:
 * - custom exception hierarchy
 * - logging
 * - retry logic with exponential backoff
 * - rate limiting
 */

export class source_error extends Error {
    
    

    constructor(msg, source, cause) {
        super(source ? `[${source}] ${msg}` : msg);
        this.name = "source_error";
        this.source = source;
        this.cause = cause;
    }
}

export class source_auth_error extends source_error {
    constructor(msg, source, cause) {
        super(msg, source, cause);
        this.name = "source_auth_error";
    }
}

export class source_config_error extends source_error {
    constructor(msg, source, cause) {
        super(msg, source, cause);
        this.name = "source_config_error";
    }
}

export class source_rate_limit_error extends source_error {
    

    constructor(msg, retry_after, source) {
        super(msg, source);
        this.name = "source_rate_limit_error";
        this.retry_after = retry_after;
    }
}

export class source_fetch_error extends source_error {
    constructor(msg, source, cause) {
        super(msg, source, cause);
        this.name = "source_fetch_error";
    }
}























export class rate_limiter {
    
    
    

    constructor(requests_per_second = 10) {
        this.rps = requests_per_second;
        this.tokens = requests_per_second;
        this.last_update = Date.now();
    }

    async acquire() {
        const now = Date.now();
        const elapsed = (now - this.last_update) / 1000;
        this.tokens = Math.min(this.rps, this.tokens + elapsed * this.rps);
        this.last_update = now;

        if (this.tokens < 1) {
            const wait_time = ((1 - this.tokens) / this.rps) * 1000;
            await new Promise((r) => setTimeout(r, wait_time));
            this.tokens = 0;
        } else {
            this.tokens -= 1;
        }
    }
}

export async function with_retry(
    fn,
    max_attempts = 3,
    base_delay = 1000,
    max_delay = 60000,
) {
    let last_err = null;

    for (let attempt = 0; attempt < max_attempts; attempt++) {
        try {
            return await fn();
        } catch (e) {
            last_err = e;

            if (e instanceof source_auth_error) {
                throw e;
            }

            if (attempt < max_attempts - 1) {
                const delay =
                    e instanceof source_rate_limit_error && e.retry_after
                        ? e.retry_after * 1000
                        : Math.min(
                              base_delay * Math.pow(2, attempt),
                              max_delay,
                          );

                console.warn(
                    `[retry] attempt ${attempt + 1}/${max_attempts} failed: ${e.message}, retrying in ${delay}ms`,
                );
                await new Promise((r) => setTimeout(r, delay));
            }
        }
    }

    throw last_err;
}

export  class base_source {
    __init() {this.name = "base"}
    
     __init2() {this._connected = false}
    
    

    constructor(user_id, config) {;base_source.prototype.__init.call(this);base_source.prototype.__init2.call(this);
        this.user_id = user_id || "anonymous";
        this._max_retries = _optionalChain([config, 'optionalAccess', _ => _.max_retries]) || 3;
        this._rate_limiter = new rate_limiter(
            _optionalChain([config, 'optionalAccess', _2 => _2.requests_per_second]) || 10,
        );
    }

    get connected() {
        return this._connected;
    }

    async connect(creds) {
        console.log(`[${this.name}] connecting...`);
        try {
            const result = await this._connect(creds || {});
            this._connected = result;
            if (result) {
                console.log(`[${this.name}] connected`);
            }
            return result;
        } catch (e) {
            console.error(`[${this.name}] connection failed: ${e.message}`);
            throw new source_auth_error(e.message, this.name, e);
        }
    }

    async disconnect() {
        this._connected = false;
        console.log(`[${this.name}] disconnected`);
    }

    async list_items(filters) {
        if (!this._connected) {
            await this.connect();
        }

        await this._rate_limiter.acquire();

        try {
            const items = await with_retry(
                () => this._list_items(filters || {}),
                this._max_retries,
            );
            console.log(`[${this.name}] found ${items.length} items`);
            return items;
        } catch (e) {
            throw new source_fetch_error(e.message, this.name, e);
        }
    }

    async fetch_item(item_id) {
        if (!this._connected) {
            await this.connect();
        }

        await this._rate_limiter.acquire();

        try {
            return await with_retry(
                () => this._fetch_item(item_id),
                this._max_retries,
            );
        } catch (e) {
            throw new source_fetch_error(e.message, this.name, e);
        }
    }

    async ingest_all(filters) {
        const { ingestDocument } = await import("../ops/ingest");

        const items = await this.list_items(filters);
        const ids = [];
        const errors = [];

        console.log(`[${this.name}] ingesting ${items.length} items...`);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
                const content = await this.fetch_item(item.id);
                const result = await ingestDocument(
                    content.type || "text",
                    content.data || content.text || "",
                    { source: this.name, ...content.meta },
                    undefined,
                    this.user_id,
                );
                ids.push(result.root_memory_id);
            } catch (e) {
                console.warn(
                    `[${this.name}] failed to ingest ${item.id}: ${e.message}`,
                );
                errors.push({ id: item.id, error: e.message });
            }
        }

        console.log(
            `[${this.name}] ingested ${ids.length} items, ${errors.length} errors`,
        );
        return ids;
    }

     _get_env(key, default_val) {
        return process.env[key] || default_val;
    }

    




}
