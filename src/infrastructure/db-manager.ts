import { BaseDriver, QueryResult } from './drivers/base-driver'
import { PgDriver } from './drivers/pg-driver'
import { MysqlDriver } from './drivers/mysql-driver'

export class DbManager {
  private drivers: Map<string, BaseDriver> = new Map()

  async connect(id: string, config: any): Promise<QueryResult> {
    try {
      if (this.drivers.has(id)) {
        await this.drivers.get(id)!.close()
        this.drivers.delete(id)
      }

      let driver: BaseDriver
      const dialect = config.dialect || 'postgres'

      if (dialect === 'mysql') {
        driver = new MysqlDriver()
      } else {
        driver = new PgDriver()
      }

      const result = await driver.connect(config)
      if (result.success) {
        this.drivers.set(id, driver)
      }
      return result
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async disconnect(id: string): Promise<QueryResult> {
    const driver = this.drivers.get(id)
    if (driver) {
      const result = await driver.disconnect()
      this.drivers.delete(id)
      return result
    }
    return { success: true }
  }

  async query(id: string, sql: string, params?: any[]): Promise<QueryResult> {
    const driver = this.drivers.get(id)
    if (!driver) return { success: false, error: 'No database connection' }
    return driver.query(sql, params)
  }

  async closeAll(): Promise<void> {
    for (const driver of this.drivers.values()) {
      await driver.close()
    }
    this.drivers.clear()
  }
}

export const dbManager = new DbManager()
export type { QueryResult } from './drivers/base-driver'
