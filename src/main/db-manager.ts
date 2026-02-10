import { Pool } from 'pg'

export interface QueryResult {
  success: boolean
  rows?: any[]
  fields?: any[]
  error?: string
}

export class DbManager {
  private pools: Map<string, Pool> = new Map()

  async connect(id: string, config: any): Promise<QueryResult> {
    try {
      if (this.pools.has(id)) {
        await this.pools.get(id)!.end()
      }
      const pool = new Pool(config)
      // Test connection
      await pool.query('SELECT NOW()')
      this.pools.set(id, pool)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async disconnect(id: string): Promise<QueryResult> {
    if (this.pools.has(id)) {
      await this.pools.get(id)!.end()
      this.pools.delete(id)
    }
    return { success: true }
  }

  async query(id: string, sql: string, params?: any[]): Promise<QueryResult> {
    const pool = this.pools.get(id)
    if (!pool) return { success: false, error: 'No database connection' }
    try {
      const result = await pool.query(sql, params)
      return { success: true, rows: result.rows, fields: result.fields }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async closeAll(): Promise<void> {
    for (const pool of this.pools.values()) {
      await pool.end()
    }
    this.pools.clear()
  }
}

export const dbManager = new DbManager()
