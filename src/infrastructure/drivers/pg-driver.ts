import { Pool } from 'pg'
import { BaseDriver, QueryResult } from './base-driver'

export class PgDriver implements BaseDriver {
  private pool: Pool | null = null

  async connect(config: any): Promise<QueryResult> {
    try {
      if (this.pool) {
        await this.pool.end()
      }
      this.pool = new Pool(config)
      // Test connection
      await this.pool.query('SELECT NOW()')
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async disconnect(): Promise<QueryResult> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
    return { success: true }
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.pool) return { success: false, error: 'No PostgreSQL connection' }
    try {
      const result = await this.pool.query(sql, params)
      return { success: true, rows: result.rows, fields: result.fields }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }
}
