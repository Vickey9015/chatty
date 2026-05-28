import { execSync } from 'child_process';

const ports = [3001, 5173];

for (const port of ports) {
  try {
    const pids = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, { encoding: 'utf8' }).trim();
    if (!pids) continue;
    for (const pid of pids.split(/\s+/).filter(Boolean)) {
      try {
        process.kill(Number(pid), 'SIGTERM');
        console.log(`Freed port ${port} (stopped PID ${pid})`);
      } catch {
        /* process may have already exited */
      }
    }
  } catch {
    /* nothing listening on this port */
  }
}
