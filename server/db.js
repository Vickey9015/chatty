import mysql from 'mysql2/promise';

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
};

const LOCAL_DB_NAME = 'lockychat_db';
const DB_NAME = process.env.DB_NAME || LOCAL_DB_NAME;

/** @type {'pending' | 'connecting' | 'ready' | 'failed'} */
let dbState = 'pending';
let pool;

export function isDbReady() {
  return dbState === 'ready' && pool !== undefined;
}

export function getDbStatus() {
  return { state: dbState, database: DB_NAME };
}

export async function initDb() {
  dbState = 'connecting';

  // Hostinger (and most shared hosts) provide an existing DB — users cannot CREATE DATABASE.
  // Only bootstrap the default local database name for dev.
  if (DB_NAME === LOCAL_DB_NAME) {
    const bootstrap = await mysql.createConnection(config);
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await bootstrap.end();
  }

  if (pool) {
    await pool.end();
  }

  pool = mysql.createPool({ ...config, database: DB_NAME });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS locks (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      lock_name VARCHAR(64) NOT NULL,
      key_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_lock_name (lock_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  dbState = 'ready';
  return pool;
}

export async function initDbWithRetry(options = {}) {
  const maxAttempts = options.retries ?? (Number(process.env.DB_CONNECT_RETRIES) || 5);
  const delayMs = options.delayMs ?? (Number(process.env.DB_CONNECT_DELAY_MS) || 3000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await initDb();
      return true;
    } catch (err) {
      dbState = attempt < maxAttempts ? 'pending' : 'failed';
      console.error(
        `Database connection failed (attempt ${attempt}/${maxAttempts}):`,
        err.message,
      );
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  return false;
}

export function getPool() {
  if (!isDbReady()) {
    throw new Error('Database not available');
  }
  return pool;
}
