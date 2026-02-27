import { describe, it, expect } from 'vitest'
import { generateAlterTableSql, generateCreateTableSql, ColumnDefinition, IndexDefinition } from './diff'

describe('MySQL Table Structure Change - SQL Generation', () => {
  const schema = 'test_db'
  const tableName = 'users'

  describe('1. Basic Table Operations', () => {
    it('should generate CREATE TABLE with backticks and MySQL specific types', () => {
      const columns: ColumnDefinition[] = [
        { 
          id: '1', name: 'id', type: 'int', nullable: false, defaultValue: null, 
          isPrimaryKey: true, isAutoIncrement: true 
        },
        { 
          id: '2', name: 'username', type: 'varchar', length: 255, nullable: false, defaultValue: null, isPrimaryKey: false 
        },
        { 
          id: '3', name: 'created_at', type: 'datetime', nullable: true, defaultValue: 'CURRENT_TIMESTAMP', isDefaultExpression: true, isPrimaryKey: false
        }
      ]
      const sqls = generateCreateTableSql(schema, tableName, columns, [])
      const createSql = sqls[0]
      
      expect(createSql).toContain('CREATE TABLE `users`')
      expect(createSql).toContain('`id` int NOT NULL AUTO_INCREMENT')
      expect(createSql).toContain('PRIMARY KEY (`id`)')
      expect(createSql).toContain('DEFAULT CURRENT_TIMESTAMP')
    })
  })

  describe('2. Column Operations', () => {
    it('should generate CHANGE COLUMN for renaming', () => {
      const columns: ColumnDefinition[] = [
        { 
          id: '1', name: 'new_name', type: 'varchar', length: 100, nullable: true, defaultValue: null, isPrimaryKey: false,
          _original: { name: 'old_name', type: 'varchar', length: 100, nullable: true, defaultValue: null, isPrimaryKey: false } 
        }
      ]
      const sqls = generateAlterTableSql(schema, tableName, columns, [], [], [])
      expect(sqls[0]).toContain('CHANGE COLUMN `old_name` `new_name` varchar(100)')
    })

    it('should use MODIFY COLUMN for type or constraint changes without renaming', () => {
      const columns: ColumnDefinition[] = [
        { 
          id: '1', name: 'email', type: 'text', nullable: false, defaultValue: null, isPrimaryKey: false,
          _original: { name: 'email', type: 'varchar', length: 255, nullable: true, defaultValue: null, isPrimaryKey: false } 
        }
      ]
      const sqls = generateAlterTableSql(schema, tableName, columns, [], [], [])
      expect(sqls[0]).toContain('MODIFY COLUMN `email` text NOT NULL')
    })

    it('should handle adding and dropping columns', () => {
      const newCol: ColumnDefinition = { id: '2', name: 'age', type: 'int', nullable: true, defaultValue: '18', isPrimaryKey: false }
      const delCol: ColumnDefinition = { id: '3', name: 'bio', type: 'text', nullable: true, defaultValue: null, isPrimaryKey: false,
        _original: { name: 'bio', type: 'text', nullable: true, defaultValue: null, isPrimaryKey: false }
      }
      
      const sqls = generateAlterTableSql(schema, tableName, [newCol], [], [delCol], [])
      const joined = sqls.join(' ')
      expect(joined).toContain("ADD COLUMN `age` int DEFAULT 18")
      expect(joined).toContain('DROP COLUMN `bio`')
    })
  })

  describe('3. Index Operations', () => {
    it('should generate MySQL index syntax', () => {
      const index: IndexDefinition = { 
        id: 'i1', name: 'idx_user_email', columns: ['email'], isUnique: true 
      }
      const sqls = generateCreateTableSql(schema, tableName, [
        { id: '1', name: 'email', type: 'varchar', length: 255, nullable: false, defaultValue: null, isPrimaryKey: false }
      ], [index])
      
      expect(sqls[0]).toContain('UNIQUE KEY `idx_user_email` (`email`)')
    })

    it('should handle dropping and adding indexes in ALTER TABLE', () => {
      const oldIdx: IndexDefinition = { id: 'i1', name: 'old_idx', columns: ['col1'], isUnique: false,
        _original: { name: 'old_idx', columns: ['col1'], isUnique: false }
      }
      const newIdx: IndexDefinition = { 
        id: 'i2', name: 'new_idx', columns: ['col2'], isUnique: false 
      }
      
      const sqls = generateAlterTableSql(schema, tableName, [], [newIdx], [], [oldIdx])
      const joined = sqls.join(' ')
      expect(joined).toContain('DROP INDEX `old_idx`')
      expect(joined).toContain('ADD INDEX `new_idx` (`col2`)')
    })
  })

  describe('4. Comments', () => {
    it('should include comments in column definitions', () => {
      const columns: ColumnDefinition[] = [
        { 
          id: '1', name: 'status', type: 'int', nullable: false, defaultValue: '0', isPrimaryKey: false,
          comment: '0: inactive, 1: active' 
        }
      ]
      const sqls = generateCreateTableSql(schema, tableName, columns, [])
      expect(sqls[0]).toContain("COMMENT '0: inactive, 1: active'")
    })
  })
})
