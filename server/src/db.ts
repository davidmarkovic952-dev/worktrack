import pg from 'pg';

/** Minimalen vmesnik, ki ga izpolnjujeta pg.Pool in pg-mem (testi). */
export interface Db {
  query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
  connect(): Promise<DbClient>;
}
export interface DbClient {
  query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
  release(): void;
}

export function createPool(): Db {
  return new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  }) as unknown as Db;
}

/** Izvede funkcijo v transakciji — sprememba in zapis v revizijsko sled uspeta ali padeta skupaj. */
export async function tx<T>(db: Db, fn: (c: DbClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
