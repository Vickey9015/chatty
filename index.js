/** Hostinger / production entry point (must be at repo root) */
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
await import('./server/index.js');
