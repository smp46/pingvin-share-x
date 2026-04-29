import { test as base, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';

async function isPortAvailable(port: number) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

async function waitForPort(port: number, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (!(await isPortAvailable(port))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timeout waiting for port ${port}`);
}

export const test = base.extend<{ 
  backendUrl: string,
  frontendUrl: string
}>({
  backendUrl: [async ({}, use, workerInfo) => {
    const workerIndex = workerInfo.workerIndex;
    const backendPort = 8080 + workerIndex;
    const frontendPort = 3000 + workerIndex;
    const dataDir = path.resolve(__dirname, `../../data-worker-${workerIndex}`);
    
    // Ensure data dir is clean
    if (fs.existsSync(dataDir)) {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
    fs.mkdirSync(dataDir, { recursive: true });

    const backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '../../../backend'),
      env: {
        ...process.env,
        PORT: backendPort.toString(),
        DATA_DIRECTORY: dataDir,
        // We need to make sure prisma uses the right DB
        DATABASE_URL: `file:${path.join(dataDir, 'pingvin-share.db')}`
      },
      stdio: 'pipe'
    });

    // Run migrations
    const migrate = spawn('npx', ['prisma', 'db', 'push', '--force-reset'], {
      cwd: path.resolve(__dirname, '../../../backend'),
      env: {
        ...process.env,
        DATABASE_URL: `file:${path.join(dataDir, 'pingvin-share.db')}`
      }
    });
    
    await new Promise((resolve) => migrate.on('exit', resolve));

    await waitForPort(backendPort);

    await use(`http://localhost:${backendPort}`);

    backendProcess.kill();
  }, { scope: 'worker', auto: true }],

  frontendUrl: [async ({ backendUrl }, use, workerInfo) => {
    const workerIndex = workerInfo.workerIndex;
    const frontendPort = 3000 + workerIndex;

    const frontendProcess = spawn('npm', ['run', 'dev', '--', '-p', frontendPort.toString()], {
      cwd: path.resolve(__dirname, '../../'),
      env: {
        ...process.env,
        API_URL: backendUrl,
        PORT: frontendPort.toString()
      },
      stdio: 'pipe'
    });

    await waitForPort(frontendPort);

    await use(`http://localhost:${frontendPort}`);

    frontendProcess.kill();
  }, { scope: 'worker', auto: true }]
});

export { expect };
