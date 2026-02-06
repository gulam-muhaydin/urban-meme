import path from 'node:path';
import fs from 'node:fs/promises';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

// Vercel serverless environment uses /tmp for writable files
const IS_VERCEL = process.env.VERCEL || process.env.NODE_ENV === 'production';
const DATA_DIR = IS_VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

async function ensureDataDir() {
  if (!IS_VERCEL) {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(
      DB_FILE,
      JSON.stringify({ users: {}, pendingPayments: [], approvals: {}, points: {}, withdrawals: [], videoProgress: {} }, null, 2),
      'utf8'
    );
  }
}

export async function createDb() {
  await ensureDataDir();

  const adapter = new JSONFile(DB_FILE);
  const db = new Low(adapter, { users: {}, pendingPayments: [], approvals: {}, points: {}, withdrawals: [], videoProgress: {} });
  await db.read();
  db.data ||= { users: {}, pendingPayments: [], approvals: {}, points: {}, withdrawals: [], videoProgress: {} };

  // Ensure all necessary collections exist
  if (!db.data.users) db.data.users = {};
  if (!db.data.pendingPayments) db.data.pendingPayments = [];
  if (!db.data.approvals) db.data.approvals = {};
  if (!db.data.withdrawals) db.data.withdrawals = [];
  if (!db.data.points) db.data.points = {};
  if (!db.data.videoProgress) db.data.videoProgress = {};
  
  return db;
}
