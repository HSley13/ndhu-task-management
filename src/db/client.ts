import * as SQLite from 'expo-sqlite';
import { SCHEMA } from './schema';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('ndhu.db');
  return _db;
}

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Split schema into individual statements, filter empty strings
  const statements = SCHEMA
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  await db.withTransactionAsync(async () => {
    for (const stmt of statements) {
      await db.execAsync(stmt);
    }
  });
}
