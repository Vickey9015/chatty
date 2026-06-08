import mysql from 'mysql2/promise';

/** Trim whitespace; strip one pair of surrounding quotes (hPanel sometimes adds them). */
export function sanitizeEnv(value) {
  if (value == null || value === '') return '';
  let s = String(value).trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1);
  }
  return s;
}

function readDbConfig() {
  return {
    host: sanitizeEnv(process.env.DB_HOST) || 'localhost',
    port: Number(sanitizeEnv(process.env.DB_PORT)) || 3306,
    user: sanitizeEnv(process.env.DB_USER) || 'root',
    password: sanitizeEnv(process.env.DB_PASSWORD) || '',
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
}

const config = readDbConfig();

const LOCAL_DB_NAME = 'lockychat_db';
const DB_NAME = sanitizeEnv(process.env.DB_NAME) || LOCAL_DB_NAME;

/** @type {'pending' | 'connecting' | 'ready' | 'failed'} */
let dbState = 'pending';
/** @type {import('mysql2/promise').Pool | undefined} */
let pool;
/** @type {{ code?: string; errno?: number; sqlState?: string; message: string } | null} */
let lastDbError = null;
let connectAttempts = 0;

function redactSecrets(text) {
  if (!text || typeof text !== 'string') return text;
  const password = config.password;
  if (password && password.length > 0) {
    return text.split(password).join('***');
  }
  return text;
}

export function formatMysqlError(err) {
  if (!err || typeof err !== 'object') {
    return { message: String(err ?? 'Unknown database error') };
  }

  const message = redactSecrets(err.message || String(err));
  const hint = {
    code: err.code,
    errno: err.errno,
    sqlState: err.sqlState,
    message,
  };

  // Drop undefined fields so /health stays compact.
  return Object.fromEntries(Object.entries(hint).filter(([, v]) => v !== undefined && v !== ''));
}

export function isDbReady() {
  return dbState === 'ready' && pool !== undefined;
}

export function getDbStatus() {
  const status = {
    state: dbState,
    database: DB_NAME,
    host: config.host,
    port: config.port,
    user: config.user || undefined,
    attempts: connectAttempts,
  };

  if (lastDbError && dbState !== 'ready') {
    status.error = lastDbError;
  }

  return status;
}

export async function initDb() {
  dbState = 'connecting';
  lastDbError = null;

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
    pool = undefined;
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
  lastDbError = null;
  return pool;
}

export async function initDbWithRetry(options = {}) {
  const maxAttempts = options.retries ?? (Number(process.env.DB_CONNECT_RETRIES) || 5);
  const delayMs = options.delayMs ?? (Number(process.env.DB_CONNECT_DELAY_MS) || 3000);

  connectAttempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    connectAttempts = attempt;
    console.log(
      `MySQL connect attempt ${attempt}/${maxAttempts} → ${config.user}@${config.host}:${config.port}/${DB_NAME}`,
    );

    try {
      await initDb();
      console.log(`MySQL ready → ${DB_NAME}`);
      return true;
    } catch (err) {
      lastDbError = formatMysqlError(err);
      dbState = attempt < maxAttempts ? 'pending' : 'failed';

      const code = lastDbError.code ?? '(no code)';
      const errno = lastDbError.errno != null ? `errno=${lastDbError.errno}` : 'errno=(none)';
      console.error(
        `Database connection failed (attempt ${attempt}/${maxAttempts}): ${code} ${errno} — ${lastDbError.message}`,
      );

      if (attempt < maxAttempts) {
        console.log(`Retrying MySQL in ${delayMs}ms…`);
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
