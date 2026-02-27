import mysql from 'mysql2/promise'
import { BaseDriver, QueryResult } from './base-driver'

export class MysqlDriver implements BaseDriver {
  private pool: mysql.Pool | null = null

  async connect(config: any): Promise<QueryResult> {
    try {
      if (this.pool) {
        await this.pool.end()
      }
      this.pool = mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      })
      // Test connection
      await this.pool.query('SELECT 1')
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
    if (!this.pool) return { success: false, error: 'No MySQL connection' }
    try {
      const [rows, fields] = await this.pool.query(sql, params)
      // Format fields to match what frontend expects (name property)
      const formattedFields = fields?.map((f: any) => ({ name: f.name }))
      return { success: true, rows: rows as any[], fields: formattedFields }
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
