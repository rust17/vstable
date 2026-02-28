import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import mysql from 'mysql2/promise'
import { generateAlterTableSql, generateCreateTableSql, ColumnDefinition } from './diff'

describe('MySQL DDL Integration Tests', () => {
  let connection: mysql.Connection

  beforeAll(async () => {
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
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

    // Make data unique before setting status as Primary Key
    await connection.query(`UPDATE \`integration_test_users\` SET \`status\` = 'inactive' WHERE \`user_name\` = 'testuser2'`)

    // 3. Alter Table: Drop Column, Change Nullability/Default, Add Index, Modify PK
    const finalColumns: ColumnDefinition[] = [
      // Modify PK: Remove PK from 'id', keep it as column. Must remove auto_increment to avoid MySQL errors.
      { id: '1', name: 'id', type: 'int', nullable: false, defaultValue: null, isPrimaryKey: false, isAutoIncrement: false, _original: alteredColumns[0] },
      // Modify Nullable/Default: 'status' becomes nullable, remove default, and make it the NEW PK
      { id: '3', name: 'status', type: 'varchar', length: 20, nullable: false, defaultValue: null, isPrimaryKey: true, _original: alteredColumns[2] }, // PK in MySQL should be NOT NULL generally
      // Add a new column to test index
      { id: '4', name: 'email', type: 'varchar', length: 100, nullable: true, defaultValue: null, isPrimaryKey: false }
    ]

    const deletedColumns: ColumnDefinition[] = [{ ...alteredColumns[1], _original: alteredColumns[1] }] // Drop 'user_name'

    const indexes = [
      { id: 'idx_1', name: 'idx_status_email', columns: ['status', 'email'], isUnique: true }
    ]
    const deletedIndexes = [] // No index to drop yet

    const finalAlterSqls = generateAlterTableSql(schema, tableName, finalColumns, indexes, deletedColumns, deletedIndexes)
    for (const sql of finalAlterSqls) {
      await connection.query(sql)
    }

    // Verify Drop Column and New Columns/PK
    await connection.query(`INSERT INTO \`integration_test_users\` (\`id\`, \`status\`, \`email\`) VALUES (10, 'admin', 'admin@example.com')`)
    
    // Verify Unique Index: Inserting duplicate status and email should fail
    try {
      await connection.query(`INSERT INTO \`integration_test_users\` (\`id\`, \`status\`, \`email\`) VALUES (11, 'admin', 'admin@example.com')`)
      expect.unreachable('Should have thrown unique constraint error')
    } catch (e: any) {
      expect(e.code).toBe('ER_DUP_ENTRY') // MySQL duplicate entry error
    }

    // Verify 'user_name' is dropped
    try {
      await connection.query(`SELECT \`user_name\` FROM \`integration_test_users\``)
      expect.unreachable('Should have thrown column does not exist error')
    } catch (e: any) {
      expect(e.code).toBe('ER_BAD_FIELD_ERROR') // MySQL unknown column error
    }

    // 4. Alter Table: Modify Index (Rename, Change Columns, Remove Unique)
    const finalIndexes = [
      { id: 'idx_1', name: 'idx_email_only', columns: ['email'], isUnique: false, _original: indexes[0] }
    ]
    
    const step4Columns = finalColumns.map(c => ({ ...c, _original: c }))

    const indexAlterSqls = generateAlterTableSql(schema, tableName, step4Columns, finalIndexes, [], [])
    for (const sql of indexAlterSqls) {
      await connection.query(sql)
    }
    
    // Verify Index Modify (Unique constraint is gone)
    await connection.query(`INSERT INTO \`integration_test_users\` (\`id\`, \`status\`, \`email\`) VALUES (12, 'guest', 'admin@example.com')`)

    // 5. Alter Table: Drop Index
    const deletedFinalIndexes = [{ ...finalIndexes[0], _original: finalIndexes[0] }]
    const dropIndexSqls = generateAlterTableSql(schema, tableName, step4Columns, [], [], deletedFinalIndexes)
    for (const sql of dropIndexSqls) {
      await connection.query(sql)
    }

    // Verify index is dropped by checking SHOW INDEX
    const [indexRows]: any = await connection.query(`SHOW INDEX FROM \`integration_test_users\` WHERE Key_name = 'idx_email_only'`)
    expect(indexRows.length).toBe(0)
  })
})
