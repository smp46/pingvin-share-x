import fs from 'fs';
import path from 'path';

const AUTH_DIR = path.join(__dirname, '.auth');
const CREDENTIALS_PATH = path.join(AUTH_DIR, 'credentials.json');

export function saveCredentials(credentials: any) {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
}

export function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error('Credentials not found. Run signup test first.');
  }
  return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
}

export function generateRandomCredentials() {
  const id = Math.random().toString(36).substring(7);
  return {
    username: `user_${id}`,
    email: `user_${id}@example.com`,
    password: 'Password123!',
  };
}
