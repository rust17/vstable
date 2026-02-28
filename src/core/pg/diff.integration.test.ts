import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Pool } from 'pg'
import { generateAlterTableSql, generateCreateTableSql, ColumnDefinition } from './diff'

describe('PostgreSQL DDL Integration Tests', () => {
  let pool: Pool

  beforeAll(async () => {
    pool = new Pool({
      host: 'localhost',
      port: 5433,
      user: 'root',
      password: 'password',
      database: 'quickpg_test'
    })
    // Ensure connection is ready
    await pool.query('SELECT 1')
  })

  afterAll(async () => {
    await pool.end()
  })

  beforeEach(async () => {
    // Drop the table if it exists before each test to start clean
    await pool.query('DROP TABLE IF EXISTS "public"."integration_test_users" CASCADE')
  })

  it('should successfully create a table and alter it', async () => {
    const schema = 'public'
    const tableName = 'integration_test_users'

    // 1. Create Table
    const initialColumns: ColumnDefinition[] = [
      { id: '1', name: 'id', type: 'integer', nullable: false, defaultValue: null, isPrimaryKey: true, isIdentity: true },
      { id: '2', name: 'username', type: 'varchar', length: 50, nullable: false, defaultValue: null, isPrimaryKey: false }
    ]

    const createSqls = generateCreateTableSql(schema, tableName, initialColumns, [])
    for (const sql of createSqls) {
      await pool.query(sql)
    }

    // Verify table exists by inserting a row
    await pool.query(`INSERT INTO "public"."integration_test_users" ("username") VALUES ('testuser')`)

    // 2. Alter Table: Add column, rename column, change type
    const alteredColumns: ColumnDefinition[] = [
      { id: '1', name: 'id', type: 'integer', nullable: false, defaultValue: null, isPrimaryKey: true, isIdentity: true, _original: initialColumns[0] },
      { id: '2', name: 'user_name', type: 'text', nullable: false, defaultValue: null, isPrimaryKey: false, _original: initialColumns[1] }, // Rename and change type
      { id: '3', name: 'status', type: 'varchar', length: 20, nullable: false, defaultValue: 'active', isPrimaryKey: false } // Add column with default
    ]

    const alterSqls = generateAlterTableSql(schema, tableName, alteredColumns, [], [], [])
    for (const sql of alterSqls) {
      await pool.query(sql)
    }

    // Verify alterations by inserting a row with new schema
    await pool.query(`INSERT INTO "public"."integration_test_users" ("user_name") VALUES ('testuser2')`)
    const result = await pool.query(`SELECT * FROM "public"."integration_test_users" WHERE "user_name" = 'testuser2'`)
    expect(result.rows[0].status).toBe('active')
  })
})
