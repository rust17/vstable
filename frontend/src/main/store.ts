import { app, safeStorage } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface ConnectionEntry {
  id: string;
  name: string;
  dialect: 'postgres' | 'mysql';
  host: string;
  port: number;
  user: string;
  database: string;
  encryptedPassword?: string;
}

const STORE_PATH = join(app.getPath('userData'), 'connections.json');
const WORKSPACE_PATH = join(app.getPath('userData'), 'workspace.json');

export function getSavedConnections(): ConnectionEntry[] {
  if (!existsSync(STORE_PATH)) return [];
  try {
    const content = readFileSync(STORE_PATH, 'utf-8');
    const connections = JSON.parse(content);
    return connections.map((c: any) => ({
      ...c,
      dialect: c.dialect || (c.port === 3306 ? 'mysql' : 'postgres'),
    }));
  } catch (e) {
    console.error('Failed to read connections.json', e);
    return [];
  }
}

export function saveConnection(config: any): void {
  const connections = getSavedConnections();

  // 处理加密
  let encryptedPassword = '';
  if (config.password && safeStorage.isEncryptionAvailable()) {
    encryptedPassword = safeStorage.encryptString(config.password).toString('base64');
  }

  const entry: ConnectionEntry = {
    id: config.id || crypto.randomUUID(),
    name: config.name || config.host,
    dialect: config.dialect || 'postgres',
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    encryptedPassword: encryptedPassword || undefined,
  };

  const index = connections.findIndex((c) => c.id === entry.id);
  if (index >= 0) {
    connections[index] = entry;
  } else {
    connections.push(entry);
  }

  writeFileSync(STORE_PATH, JSON.stringify(connections, null, 2));
}

export function deleteConnection(id: string): void {
  const connections = getSavedConnections().filter((c) => c.id !== id);
  writeFileSync(STORE_PATH, JSON.stringify(connections, null, 2));
}

export function decryptPassword(encryptedBase64: string): string {
  if (!encryptedBase64 || !safeStorage.isEncryptionAvailable()) return '';
  try {
    const buffer = Buffer.from(encryptedBase64, 'base64');
    return safeStorage.decryptString(buffer);
  } catch (e) {
    console.error('Failed to decrypt password', e);
    return '';
  }
}

export function getWorkspace(): any {
  if (!existsSync(WORKSPACE_PATH)) return null;
  try {
    const content = readFileSync(WORKSPACE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to read workspace.json', e);
    return null;
  }
}

export function saveWorkspace(data: any): void {
  try {
    // Before saving, we must ensure passwords in configs are encrypted, or simply stripped,
    // since connection config is already saved in connections.json.
    // It's safer to not persist passwords in workspace.json.
    // However, since it's just restoring connection context, removing password is fine
    // as connect IPC logic will look it up if we have connection id, or we just rely on the user to re-enter it,
    // wait, actually we can just encrypt passwords if they are present.
    // Given the architecture, the user might just be connecting via an ad-hoc connection,
    // we'll strip raw passwords to be safe and let them use encrypted ones if any.
    const safeData = JSON.parse(JSON.stringify(data));
    for (const session of safeData.sessions || []) {
      if (session.config) {
        if (session.config.password) {
          if (safeStorage.isEncryptionAvailable()) {
            session.config.encryptedPassword = safeStorage
              .encryptString(session.config.password)
              .toString('base64');
          }
          delete session.config.password;
        }
      }
    }
    writeFileSync(WORKSPACE_PATH, JSON.stringify(safeData, null, 2));
  } catch (e) {
    console.error('Failed to save workspace.json', e);
  }
}
