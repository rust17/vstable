import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import mysql from 'mysql2/promise'
import { generateAlterTableSql, generateCreateTableSql, ColumnDefinition } from './diff'

describe('MySQL DDL Integration Tests', () => {
  let connection: mysql.Connection

  beforeAll(async () => {
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'password',
      database: 'quickpg_test'
    })
  })

  afterAll(async () => {
    await connection.end()
  })

  beforeEach(async () => {
    await connection.query('DROP TABLE IF EXISTS `integration_test_users`')
  })

  it('should successfully create a table and alter it', async () => {
    const schema = 'quickpg_test'
    const tableName = 'integration_test_users'

    // 1. Create Table
    const initialColumns: ColumnDefinition[] = [
      { id: '1', name: 'id', type: 'int', nullable: false, defaultValue: null, isPrimaryKey: true, isAutoIncrement: true },
      { id: '2', name: 'username', type: 'varchar', length: 50, nullable: false, defaultValue: null, isPrimaryKey: false }
    ]

    const createSqls = generateCreateTableSql(schema, tableName, initialColumns, [])
    for (const sql of createSqls) {
      await connection.query(sql)
    }

    // Verify table exists
    await connection.query(`INSERT INTO \`integration_test_users\` (\`username\`) VALUES ('testuser')`)

    // 2. Alter Table: Add column, rename/change column
    const alteredColumns: ColumnDefinition[] = [
      { id: '1', name: 'id', type: 'int', nullable: false, defaultValue: null, isPrimaryKey: true, isAutoIncrement: true, _original: initialColumns[0] },
      { id: '2', name: 'user_name', type: 'text', nullable: false, defaultValue: null, isPrimaryKey: false, _original: initialColumns[1] }, 
      { id: '3', name: 'status', type: 'varchar', length: 20, nullable: false, defaultValue: 'active', isPrimaryKey: false }
    ]

    const alterSqls = generateAlterTableSql(schema, tableName, alteredColumns, [], [], [])
    for (const sql of alterSqls) {
      await connection.query(sql)
    }

    // Verify alterations
    await connection.query(`INSERT INTO \`integration_test_users\` (\`user_name\`) VALUES ('testuser2')`)
    const [rows]: any = await connection.query(`SELECT * FROM \`integration_test_users\` WHERE \`user_name\` = 'testuser2'`)
    expect(rows[0].status).toBe('active')
  })
})
