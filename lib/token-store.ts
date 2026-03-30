// Persistent token store — writes to .qbo-tokens.json on every mutation so
// tokens survive server restarts. Replace with Redis or a DB for multi-instance
// production deployments.
import fs from "fs";
import path from "path";

const TOKEN_FILE = path.join(process.cwd(), ".qbo-tokens.json");

interface TokenFile {
  tokens: Record<string, unknown>;
  realms: Record<string, string>;
}

function readTokenFile(): TokenFile {
  try {
    const raw = fs.readFileSync(TOKEN_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<TokenFile>;
    return {
      tokens: parsed.tokens ?? {},
      realms: parsed.realms ?? {},
    };
  } catch {
    // File does not exist yet or is unreadable — start fresh.
    return { tokens: {}, realms: {} };
  }
}

function writeTokenFile(data: TokenFile): void {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[token-store] Failed to persist tokens:", err);
  }
}

// ---------------------------------------------------------------------------
// PersistentMap — same interface as Map but syncs to disk on set / delete.
// Both instances share the same JSON file so every mutation rewrites the whole
// file, keeping tokens and realms in sync.
// ---------------------------------------------------------------------------

class PersistentMap<K extends string, V> extends Map<K, V> {
  private readonly _key: keyof TokenFile;

  constructor(key: keyof TokenFile, initial: Record<string, unknown>) {
    super();
    for (const [k, v] of Object.entries(initial)) {
      // Bypass overridden set() so we don't trigger a write on startup.
      super.set(k as K, v as V);
    }
    this._key = key;
  }

  override set(key: K, value: V): this {
    super.set(key, value);
    this._persist();
    return this;
  }

  override delete(key: K): boolean {
    const removed = super.delete(key);
    if (removed) this._persist();
    return removed;
  }

  override clear(): void {
    super.clear();
    this._persist();
  }

  private _persist(): void {
    // Re-read the file so we don't clobber the sibling map's data.
    const current = readTokenFile();
    const snapshot: Record<string, unknown> = {};
    for (const [k, v] of this.entries()) {
      snapshot[k] = v;
    }
    (current[this._key] as Record<string, unknown>) = snapshot;
    writeTokenFile(current);
  }
}

// Load persisted state once at module initialisation.
const _initial = readTokenFile();

export const tokenStore = new PersistentMap<string, unknown>(
  "tokens",
  _initial.tokens
);
export const realmStore = new PersistentMap<string, string>(
  "realms",
  _initial.realms as Record<string, unknown>
);
