// Module-level in-memory store — survives across requests in a single process.
// Replace with Redis or a DB for multi-instance production deployments.
export const tokenStore = new Map<string, unknown>();
export const realmStore = new Map<string, string>();
