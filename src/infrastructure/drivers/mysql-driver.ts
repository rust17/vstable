import mysql from 'mysql2/promise'
import { BaseDriver, QueryResult, Capabilities } from './base-driver'

export class MysqlDriver implements BaseDriver {
  private pool: mysql.Pool | null = null

  getCapabilities(): Capabilities {
    return {
      dialect: 'mysql',
      quoteChar: '`',
      supportsSchemas: false,
      typeGroups: [
        {
          label: 'Numeric',
          types: ['int', 'tinyint', 'smallint', 'mediumint', 'bigint', 'decimal', 'float', 'double', 'bit']
        },
        {
          label: 'String',
          types: ['varchar', 'char', 'text', 'tinytext', 'mediumtext', 'longtext', 'blob', 'enum', 'set']
        },
        {
          label: 'Date/Time',
          types: ['datetime', 'timestamp', 'date', 'time', 'year']
        },
        {
          label: 'JSON',
          types: ['json']
        },
        {
          label: 'Binary/Other',
          types: ['binary', 'varbinary', 'geometry', 'point', 'linestring', 'polygon']
        }
      ],
      queryTemplates: {
        listDatabases: `SHOW DATABASES;`,
        listTables: `SHOW TABLES FROM \`{{db}}\`;`,
        listColumns: `SELECT column_name, data_type, is_nullable, column_default, extra, column_key, column_comment, character_maximum_length, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_schema = '{{db}}' AND table_name = '{{table}}' ORDER BY ordinal_position;`,
        listIndexes: `SHOW INDEX FROM \`{{table}}\` FROM \`{{db}}\`;`,
        getPrimaryKey: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = '{{db}}'
            AND table_name = '{{table}}'
            AND column_key = 'PRI';
        `
      }
    }
  }

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
