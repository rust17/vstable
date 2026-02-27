import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MysqlDriver } from './mysql-driver'
import mysql from 'mysql2/promise'

vi.mock('mysql2/promise', () => {
  return {
    default: {
      createPool: vi.fn().mockImplementation(() => ({
        query: vi.fn().mockResolvedValue([[{ '1': 1 }], []]),
        end: vi.fn().mockResolvedValue(undefined)
      }))
    }
  }
})

describe('MysqlDriver', () => {
  let driver: MysqlDriver

  beforeEach(() => {
    vi.clearAllMocks()
    driver = new MysqlDriver()
  })

  it('should connect using mysql2 createPool', async () => {
    const config = { host: 'localhost', user: 'root', port: 3306 }
    const result = await driver.connect(config)
    
    expect(result.success).toBe(true)
    expect(mysql.createPool).toHaveBeenCalledWith(expect.objectContaining({
      host: 'localhost',
      user: 'root'
    }))
  })

  it('should format MySQL results for the frontend', async () => {
    const mockFields = [{ name: 'id' }, { name: 'username' }]
    const mockRows = [{ id: 1, username: 'user1' }]
    
    const mockPool = {
      query: vi.fn().mockResolvedValue([mockRows, mockFields]),
      end: vi.fn().mockResolvedValue(undefined)
    }
    vi.mocked(mysql.createPool).mockReturnValue(mockPool as any)

    await driver.connect({})
    const result = await driver.query('SELECT * FROM users')

    expect(result.success).toBe(true)
    expect(result.rows).toEqual(mockRows)
    expect(result.fields).toEqual([{ name: 'id' }, { name: 'username' }])
  })

  it('should handle query errors', async () => {
    const mockPool = {
      query: vi.fn().mockRejectedValue(new Error('Syntax error')),
      end: vi.fn().mockResolvedValue(undefined)
    }
    vi.mocked(mysql.createPool).mockReturnValue(mockPool as any)

    await driver.connect({})
    const result = await driver.query('INVALID SQL')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Syntax error')
  })

  it('should disconnect and cleanup the pool', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue([[], []]),
      end: vi.fn().mockResolvedValue(undefined)
    }
    vi.mocked(mysql.createPool).mockReturnValue(mockPool as any)

    await driver.connect({})
    await driver.disconnect()

    expect(mockPool.end).toHaveBeenCalled()
    
    // Subsequent queries should fail
    const result = await driver.query('SELECT 1')
    expect(result.success).toBe(false)
  })
})
