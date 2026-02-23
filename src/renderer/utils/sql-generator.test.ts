import { describe, it, expect } from 'vitest'
import { generateAlterTableSql, generateCreateTableSql, ColumnDefinition, IndexDefinition } from './sql-generator'

describe('Table Structure Change - SQL Generation', () => {
  const schema = 'public'
  const tableName = 'users'

  describe('1. Primary Key Operations', () => {
    it('should generate SQL to add a primary key (Scenario: Add PK)', () => {
      const columns: ColumnDefinition[] = [
        { 
          id: '1', name: 'id', type: 'integer', nullable: false, defaultValue: null, isPrimaryKey: true, 
          _original: { name: 'id', type: 'integer', nullable: false, defaultValue: null, isPrimaryKey: false } 
        }
      ]
      const sqls = generateAlterTableSql(schema, tableName, columns, [], [], [])
      // Note: Current implementation might not support ADD PRIMARY KEY yet
      expect(sqls.join(' ')).toContain('ADD PRIMARY KEY ("id")')
    })

    it('should handle composite primary keys (Scenario: Composite PK)', () => {
      const columns: ColumnDefinition[] = [
        { 
          id: '1', name: 'order_id', type: 'integer', nullable: false, defaultValue: null, isPrimaryKey: true,
          _original: { name: 'order_id', type: 'integer', nullable: false, defaultValue: null, isPrimaryKey: true } 
        },
        { 
          id: '2', name: 'item_id', type: 'integer', nullable: false, defaultValue: null, isPrimaryKey: true,
          _original: { name: 'item_id', type: 'integer', nullable: false, defaultValue: null, isPrimaryKey: false } 
        }
      ]
      const sqls = generateAlterTableSql(schema, tableName, columns, [], [], [])
      expect(sqls.join(' ')).toContain('ADD PRIMARY KEY ("order_id", "item_id")')
    })

    it('should handle PK drop (Scenario: Drop PK)', () => {
        const columns: ColumnDefinition[] = [
          { 
            id: '1', name: 'id', type: 'integer', nullable: false, defaultValue: null, isPrimaryKey: false,
            _original: { name: 'id', type: 'integer', nullable: false, defaultValue: null, isPrimaryKey: true, pkConstraintName: 'users_pkey' } 
          }
        ]
        const sqls = generateAlterTableSql(schema, tableName, columns, [], [], [])
        expect(sqls.join(' ')).toContain('DROP CONSTRAINT "users_pkey"')
    })
  })

  describe('2. Column Operations (Columns)', () => {
    it('should generate RENAME COLUMN when name changes (Scenario: Rename Column)', () => {
      const columns: ColumnDefinition[] = [
        { 
          id: '1', name: 'new_name', type: 'varchar', nullable: true, defaultValue: null, isPrimaryKey: false,
          _original: { name: 'old_name', type: 'varchar', nullable: true, defaultValue: null, isPrimaryKey: false } 
        }
      ]
      const sqls = generateAlterTableSql(schema, tableName, columns, [], [], [])
      expect(sqls).toContain('ALTER TABLE "public"."users" RENAME COLUMN "old_name" TO "new_name";')
    })

    it('should generate USING clause for type casting (Scenario: Type Casting)', () => {
      const columns: ColumnDefinition[] = [
        { 
          id: '1', name: 'age', type: 'integer', nullable: true, defaultValue: null, isPrimaryKey: false,
          _original: { name: 'age', type: 'varchar', nullable: true, defaultValue: null, isPrimaryKey: false } 
        }
      ]
      const sqls = generateAlterTableSql(schema, tableName, columns, [], [], [])
      expect(sqls[0]).toContain('ALTER COLUMN "age" TYPE integer USING "age"::integer')
    })

    it('should handle NULL to NOT NULL change (Scenario: Constraint Change)', () => {
        const columns: ColumnDefinition[] = [
          { 
            id: '1', name: 'status', type: 'text', nullable: false, defaultValue: null, isPrimaryKey: false,
            _original: { name: 'status', type: 'text', nullable: true, defaultValue: null, isPrimaryKey: false } 
          }
        ]
        const sqls = generateAlterTableSql(schema, tableName, columns, [], [], [])
        expect(sqls).toContain('ALTER TABLE "public"."users" ALTER COLUMN "status" SET NOT NULL;')
    })
  })

  describe('3. Default Values & Expressions', () => {
    it('should not quote SQL expressions like NOW() (Scenario: Time expressions)', () => {
      const columns: ColumnDefinition[] = [
        { id: '1', name: 'created_at', type: 'timestamp', nullable: false, defaultValue: 'NOW()', isDefaultExpression: true, isPrimaryKey: false }
      ]
      const sqls = generateCreateTableSql(schema, tableName, columns, [])
      const createTableSql = sqls.find(s => s.startsWith('CREATE TABLE'))
      expect(createTableSql).toContain('DEFAULT NOW()')
      expect(createTableSql).not.toContain("DEFAULT 'NOW()'")
    })

    it('should quote string literals for defaults (Scenario: String default)', () => {
      const columns: ColumnDefinition[] = [
        { id: '1', name: 'status', type: 'varchar', nullable: false, defaultValue: 'active', isDefaultExpression: false, isPrimaryKey: false }
      ]
      const sqls = generateCreateTableSql(schema, tableName, columns, [])
      const createTableSql = sqls.find(s => s.startsWith('CREATE TABLE'))
      expect(createTableSql).toContain("DEFAULT 'active'")
    })
  })

  describe('4. Reserved Words & Special Characters', () => {
    it('should quote reserved words (Scenario: Reserved Words)', () => {
      const columns: ColumnDefinition[] = [
        { id: '1', name: 'user', type: 'integer', nullable: true, defaultValue: null, isPrimaryKey: false },
        { id: '2', name: 'order', type: 'integer', nullable: true, defaultValue: null, isPrimaryKey: false }
      ]
      const sqls = generateCreateTableSql(schema, tableName, columns, [])
      const createTableSql = sqls.find(s => s.startsWith('CREATE TABLE'))
      expect(createTableSql).toContain('"user" integer')
      expect(createTableSql).toContain('"order" integer')
    })

    it('should handle emoji in column names (Scenario: Special Characters)', () => {
      const columns: ColumnDefinition[] = [
        { id: '1', name: '🔥_index', type: 'numeric', nullable: true, defaultValue: null, isPrimaryKey: false }
      ]
      const sqls = generateCreateTableSql(schema, tableName, columns, [])
      const createTableSql = sqls.find(s => s.startsWith('CREATE TABLE'))
      expect(createTableSql).toContain('"🔥_index" numeric')
    })
  })

  describe('5. Index Management', () => {
    it('should drop and recreate index when columns change (Scenario: Index Linkage)', () => {
      const oldIdx: IndexDefinition = { id: 'i1', name: 'idx_test', columns: ['col1'], isUnique: false }
      const newIdx: IndexDefinition = { 
        id: 'i1', name: 'idx_test', columns: ['col1', 'col2'], isUnique: false,
        _original: { name: 'idx_test', columns: ['col1'], isUnique: false } 
      }
      
      const sqls = generateAlterTableSql(schema, tableName, [], [newIdx], [], [])
      expect(sqls).toContain('DROP INDEX "public"."idx_test";')
      expect(sqls).toContain('CREATE  INDEX "idx_test" ON "public"."users" ("col1", "col2");')
    })
  })

  describe('6. Modern PG Features & Constraints (Gaps)', () => {
    it('should support Identity Columns (Scenario: Identity)', () => {
      const columns: ColumnDefinition[] = [
        { 
            id: '1', name: 'id', type: 'integer', nullable: false, defaultValue: null, isPrimaryKey: true, 
            isIdentity: true 
        }
      ]
      const sqls = generateCreateTableSql(schema, tableName, columns, [])
      expect(sqls.join(' ')).toContain('GENERATED BY DEFAULT AS IDENTITY')
    })

    it('should support Column Comments (Scenario: Documentation)', () => {
      const columns: ColumnDefinition[] = [
        { 
            id: '1', name: 'status', type: 'text', nullable: true, defaultValue: null, isPrimaryKey: false,
            comment: 'Active or inactive',
            _original: { name: 'status', type: 'text', nullable: true, defaultValue: null, isPrimaryKey: false, comment: '' }
        }
      ]
      const sqls = generateAlterTableSql(schema, tableName, columns, [], [], [])
      expect(sqls.join(' ')).toContain("COMMENT ON COLUMN \"public\".\"users\".\"status\" IS 'Active or inactive'")
    })
  })
})
