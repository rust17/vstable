import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DbManager } from './db-manager'
import { PgDriver } from './drivers/pg-driver'
import { MysqlDriver } from './drivers/mysql-driver'

// Mock actual classes
vi.mock('./drivers/pg-driver', () => {
  return {
    PgDriver: class {
      connect = vi.fn().mockResolvedValue({ success: true })
      disconnect = vi.fn().mockResolvedValue({ success: true })
      query = vi.fn().mockResolvedValue({ success: true, rows: [] })
      close = vi.fn().mockResolvedValue(undefined)
      getCapabilities = vi.fn().mockReturnValue({ dialect: 'postgres' })
    }
  }
})

vi.mock('./drivers/mysql-driver', () => {
  return {
    MysqlDriver: class {
      connect = vi.fn().mockResolvedValue({ success: true })
      disconnect = vi.fn().mockResolvedValue({ success: true })
      query = vi.fn().mockResolvedValue({ success: true, rows: [] })
      close = vi.fn().mockResolvedValue(undefined)
      getCapabilities = vi.fn().mockReturnValue({ dialect: 'mysql' })
    }
  }
})

describe('DbManager Architecture', () => {
  let dbManager: DbManager

  beforeEach(() => {
    vi.clearAllMocks()
    dbManager = new DbManager()
  })

  it('should use PgDriver for postgres dialect (default)', async () => {
    const result = await dbManager.connect('session-pg', { host: 'localhost' })
    expect(result.success).toBe(true)
    expect(result.capabilities?.dialect).toBe('postgres')
  })

  it('should use MysqlDriver for mysql dialect', async () => {
    const result = await dbManager.connect('session-mysql', { 
      host: 'localhost', 
      dialect: 'mysql' 
    })
    expect(result.success).toBe(true)
    expect(result.capabilities?.dialect).toBe('mysql')
  })

  it('should handle session isolation via drivers', async () => {
    await dbManager.connect('id-1', { dialect: 'postgres' })
    await dbManager.connect('id-2', { dialect: 'mysql' })

    const res1 = await dbManager.query('id-1', 'SELECT 1')
    const res2 = await dbManager.query('id-2', 'SELECT 2')

    expect(res1.success).toBe(true)
    expect(res2.success).toBe(true)
  })

  it('should disconnect and remove driver correctly', async () => {
    await dbManager.connect('id', { dialect: 'mysql' })
    
    const result = await dbManager.disconnect('id')
    expect(result.success).toBe(true)
    
    const queryResult = await dbManager.query('id', 'SELECT 1')
    expect(queryResult.success).toBe(false)
    expect(queryResult.error).toBe('No database connection')
  })
})
