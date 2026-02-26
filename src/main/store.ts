import { app, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

export interface ConnectionEntry {
  id: string
  name: string
  host: string
  port: number
  user: string
  database: string
  encryptedPassword?: string
}

const STORE_PATH = join(app.getPath('userData'), 'connections.json')

export function getSavedConnections(): ConnectionEntry[] {
  if (!existsSync(STORE_PATH)) return []
  try {
    const content = readFileSync(STORE_PATH, 'utf-8')
    return JSON.parse(content)
  } catch (e) {
    console.error('Failed to read connections.json', e)
    return []
  }
}

export function saveConnection(config: any): void {
  const connections = getSavedConnections()
  
  // 处理加密
  let encryptedPassword = ''
  if (config.password && safeStorage.isEncryptionAvailable()) {
    encryptedPassword = safeStorage.encryptString(config.password).toString('base64')
  }

  const entry: ConnectionEntry = {
    id: config.id || crypto.randomUUID(),
    name: config.name || config.host,
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    encryptedPassword: encryptedPassword || undefined
  }

  const index = connections.findIndex(c => c.id === entry.id)
  if (index >= 0) {
    connections[index] = entry
  } else {
    connections.push(entry)
  }

  writeFileSync(STORE_PATH, JSON.stringify(connections, null, 2))
}

export function deleteConnection(id: string): void {
  const connections = getSavedConnections().filter(c => c.id !== id)
  writeFileSync(STORE_PATH, JSON.stringify(connections, null, 2))
}

export function decryptPassword(encryptedBase64: string): string {
  if (!encryptedBase64 || !safeStorage.isEncryptionAvailable()) return ''
  try {
    const buffer = Buffer.from(encryptedBase64, 'base64')
    return safeStorage.decryptString(buffer)
  } catch (e) {
    console.error('Failed to decrypt password', e)
    return ''
  }
}
