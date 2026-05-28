import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'client', 'dist');
const pub = path.join(__dirname, '..', 'public');

if (!fs.existsSync(dist)) {
  console.error('client/dist not found — run build first');
  process.exit(1);
}

fs.rmSync(pub, { recursive: true, force: true });
fs.cpSync(dist, pub, { recursive: true });
console.log('Copied client/dist → public/ for Hostinger');
