import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext Cloudflare adapter configuration for the Sierra Estates realty app.
// Default cache topology: DO-backed queue + sharded tag cache + cache purge.
// No external R2/KV bindings required to start; add an R2 incremental cache
// binding later for ISR-heavy traffic.
export default defineCloudflareConfig();
