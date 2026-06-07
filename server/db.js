import mysql from 'mysql2/promise';

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
};

const DB_NAME = process.env.DB_NAME || 'lockychat_db';

let pool;

export async function initDb() {
  const bootstrap = await mysql.createConnection(config);
  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await bootstrap.end();

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

  return pool;
}

export function getPool() {
  if (!pool) throw new Error('Database not initialized');
  return pool;
}
