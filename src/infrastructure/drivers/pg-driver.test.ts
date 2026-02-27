import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PgDriver } from './pg-driver'
import { Pool } from 'pg'

// Standard Vitest way to mock classes
vi.mock('pg', () => {
  const Pool = vi.fn()
  Pool.prototype.query = vi.fn()
  Pool.prototype.end = vi.fn().mockResolvedValue(undefined)
  return { Pool }
})

describe('PgDriver', () => {
  let driver: PgDriver
  let mockPool: any

  beforeEach(() => {
    vi.clearAllMocks()
    driver = new PgDriver()
    // Pool is a mock constructor now
  })

  it('should connect using pg.Pool', async () => {
    // Setup mock behavior before connection
    vi.mocked(Pool.prototype.query).mockResolvedValue({ rows: [{ now: new Date() }], fields: [] })
    
    const config = { host: 'localhost', user: 'postgres', port: 5432 }
    const result = await driver.connect(config)
    
    expect(result.success).toBe(true)
    expect(Pool).toHaveBeenCalledWith(expect.objectContaining({
      host: 'localhost',
      user: 'postgres'
    }))
  })

  it('should format PG results', async () => {
    const mockFields = [{ name: 'id' }, { name: 'username' }]
    const mockRows = [{ id: 1, username: 'user1' }]
    
    vi.mocked(Pool.prototype.query).mockResolvedValue({ rows: mockRows, fields: mockFields })

    await driver.connect({})
    const result = await driver.query('SELECT * FROM users')

    expect(result.success).toBe(true)
    expect(result.rows).toEqual(mockRows)
    expect(result.fields).toEqual(mockFields)
  })

  it('should handle connection errors', async () => {
    vi.mocked(Pool.prototype.query).mockRejectedValue(new Error('Connection failure'))

    const result = await driver.connect({})
    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection failure')
  })

  it('should disconnect and cleanup the pool', async () => {
    vi.mocked(Pool.prototype.query).mockResolvedValue({ rows: [], fields: [] })
    
    await driver.connect({})
    await driver.disconnect()

    expect(Pool.prototype.end).toHaveBeenCalled()
    
    const result = await driver.query('SELECT 1')
    expect(result.success).toBe(false)
  })
})
