import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DbManager } from './db-manager'

// Mocking pg.Pool using a simple function that returns our mock object
vi.mock('pg', () => {
  return {
    Pool: function() {
      return (global as any)._currentMockPool;
    }
  }
})

describe('DbManager', () => {
  let dbManager: DbManager

  beforeEach(() => {
    vi.clearAllMocks()
    dbManager = new DbManager()
    delete (global as any)._currentMockPool
  })

  it('should connect to a database and store the pool', async () => {
    const mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
      end: vi.fn().mockResolvedValue(undefined)
    }
    ;(global as any)._currentMockPool = mockPool

    const result = await dbManager.connect('session-1', { host: 'localhost' })
    expect(result.success).toBe(true)
  })

  it('should handle connection errors', async () => {
    const mockPool = {
      query: vi.fn().mockRejectedValue(new Error('Connection failed')),
      end: vi.fn().mockResolvedValue(undefined)
    }
    ;(global as any)._currentMockPool = mockPool

    const result = await dbManager.connect('session-1', { host: 'bad-host' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection failed')
  })

  it('should keep sessions isolated', async () => {
    const pool1 = { query: vi.fn().mockResolvedValue({ rows: ['result1'] }), end: vi.fn().mockResolvedValue(undefined) }
    const pool2 = { query: vi.fn().mockResolvedValue({ rows: ['result2'] }), end: vi.fn().mockResolvedValue(undefined) }

    // This manual approach needs careful sequential execution
    ;(global as any)._currentMockPool = pool1
    await dbManager.connect('id-1', {})
    
    ;(global as any)._currentMockPool = pool2
    await dbManager.connect('id-2', {})

    const res1 = await dbManager.query('id-1', 'SELECT 1')
    expect(res1.rows).toEqual(['result1'])

    const res2 = await dbManager.query('id-2', 'SELECT 2')
    expect(res2.rows).toEqual(['result2'])
  })

  it('should disconnect and remove pool', async () => {
    const pool = { 
      query: vi.fn().mockResolvedValue({ rows: [] }), 
      end: vi.fn().mockResolvedValue(undefined) 
    }
    ;(global as any)._currentMockPool = pool
    
    await dbManager.connect('id', {})
    await dbManager.disconnect('id')

    expect(pool.end).toHaveBeenCalled()
    
    const res = await dbManager.query('id', 'SELECT 1')
    expect(res.success).toBe(false)
  })
})