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

    // Make data unique before setting status as Primary Key
    await pool.query(`UPDATE "public"."integration_test_users" SET "status" = 'inactive' WHERE "user_name" = 'testuser2'`)

    // Prepare for next alteration: set the system-generated PK constraint name
    alteredColumns[0].pkConstraintName = 'integration_test_users_pkey'

    // 3. Alter Table: Drop Column, Change Nullability/Default, Add Index, Modify PK
    const finalColumns: ColumnDefinition[] = [
      // Modify PK: Remove PK from 'id', keep it as column
      { id: '1', name: 'id', type: 'integer', nullable: false, defaultValue: null, isPrimaryKey: false, isIdentity: true, _original: alteredColumns[0] },
      // Modify Nullable/Default: 'status' becomes nullable, remove default, and make it the NEW PK
      { id: '3', name: 'status', type: 'varchar', length: 20, nullable: true, defaultValue: null, isPrimaryKey: true, _original: alteredColumns[2] },
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
      await pool.query(sql)
    }

    // Verify Drop Column and New Columns/PK
    await pool.query(`INSERT INTO "public"."integration_test_users" ("status", "email") VALUES ('admin', 'admin@example.com')`)
    
    // Verify Unique Index: Inserting duplicate status and email should fail
    try {
      await pool.query(`INSERT INTO "public"."integration_test_users" ("status", "email") VALUES ('admin', 'admin@example.com')`)
      expect.unreachable('Should have thrown unique constraint error')
    } catch (e: any) {
      expect(e.code).toBe('23505') // PostgreSQL unique_violation
    }

    // Verify 'user_name' is dropped
    try {
      await pool.query(`SELECT "user_name" FROM "public"."integration_test_users"`)
      expect.unreachable('Should have thrown column does not exist error')
    } catch (e: any) {
      expect(e.code).toBe('42703') // PostgreSQL undefined_column
    }
    
    // 4. Alter Table: Modify Index (Rename, Change Columns, Remove Unique)
    const finalIndexes = [
      { id: 'idx_1', name: 'idx_email_only', columns: ['email'], isUnique: false, _original: indexes[0] }
    ]
    
    const step4Columns = finalColumns.map(c => ({ ...c, _original: c }))
    
    const indexAlterSqls = generateAlterTableSql(schema, tableName, step4Columns, finalIndexes, [], [])
    for (const sql of indexAlterSqls) {
      await pool.query(sql)
    }
    
    // Verify Index Modify (Unique constraint is gone, we can insert same email with different status)
    await pool.query(`INSERT INTO "public"."integration_test_users" ("status", "email") VALUES ('guest', 'admin@example.com')`)

    // 5. Alter Table: Drop Index
    const deletedFinalIndexes = [{ ...finalIndexes[0], _original: finalIndexes[0] }]
    const dropIndexSqls = generateAlterTableSql(schema, tableName, step4Columns, [], [], deletedFinalIndexes)
    for (const sql of dropIndexSqls) {
      await pool.query(sql)
    }

    // Since we don't have an easy way to verify index drop via data insertion, 
    // we query pg_class to ensure the index 'idx_email_only' is gone.
    const indexCheck = await pool.query(`SELECT 1 FROM pg_class WHERE relname = 'idx_email_only'`)
    expect(indexCheck.rowCount).toBe(0)
  })
})
