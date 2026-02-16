export interface ColumnDefinition {
  id: string
  name: string
  type: string
  nullable: boolean
  defaultValue: string | null
  isPrimaryKey: boolean
  // Original state for diffing
  _original?: Omit<ColumnDefinition, 'id' | '_original'>
}

export interface IndexDefinition {
  id: string
  name: string
  columns: string[]
  isUnique: boolean
  // Original state for diffing
  _original?: Omit<IndexDefinition, 'id' | '_original'>
}

export const generateAlterTableSql = (
  schema: string,
  tableName: string,
  columns: ColumnDefinition[],
  indexes: IndexDefinition[],
  deletedColumns: ColumnDefinition[],
  deletedIndexes: IndexDefinition[]
): string[] => {
  const sqls: string[] = []
  const safeSchema = `"${schema}"`
  const safeTable = `"${tableName}"`
  const fullTableName = `${safeSchema}.${safeTable}`

  // 1. Handle Deleted Columns
  deletedColumns.forEach(col => {
    if (col._original) {
      sqls.push(`ALTER TABLE ${fullTableName} DROP COLUMN "${col._original.name}";`)
    }
  })

  // 2. Handle Deleted Indexes
  deletedIndexes.forEach(idx => {
    if (idx._original) {
      sqls.push(`DROP INDEX ${safeSchema}."${idx._original.name}";`)
    }
  })

  // 3. Handle Column Changes (Add / Modify)
  columns.forEach(col => {
    if (!col._original) {
      // New Column
      let line = `ALTER TABLE ${fullTableName} ADD COLUMN "${col.name}" ${col.type}`
      if (!col.nullable) line += ` NOT NULL`
      if (col.defaultValue) line += ` DEFAULT ${col.defaultValue}`
      sqls.push(line + ';')
    } else {
      // Modified Column
      const original = col._original
      
      // Rename
      if (col.name !== original.name) {
        sqls.push(`ALTER TABLE ${fullTableName} RENAME COLUMN "${original.name}" TO "${col.name}";`)
      }

      // Type
      if (col.type !== original.type) {
        sqls.push(`ALTER TABLE ${fullTableName} ALTER COLUMN "${col.name}" TYPE ${col.type} USING "${col.name}"::${col.type};`)
      }

      // Nullable
      if (col.nullable !== original.nullable) {
        if (col.nullable) {
          sqls.push(`ALTER TABLE ${fullTableName} ALTER COLUMN "${col.name}" DROP NOT NULL;`)
        } else {
          sqls.push(`ALTER TABLE ${fullTableName} ALTER COLUMN "${col.name}" SET NOT NULL;`)
        }
      }

      // Default
      if (col.defaultValue !== original.defaultValue) {
        if (col.defaultValue === null || col.defaultValue === '') {
           if (original.defaultValue) {
             sqls.push(`ALTER TABLE ${fullTableName} ALTER COLUMN "${col.name}" DROP DEFAULT;`)
           }
        } else {
           sqls.push(`ALTER TABLE ${fullTableName} ALTER COLUMN "${col.name}" SET DEFAULT ${col.defaultValue};`)
        }
      }
    }
  })

  // 4. Handle Index Changes (Add / Modify)
  indexes.forEach(idx => {
    if (!idx._original) {
      const unique = idx.isUnique ? 'UNIQUE' : ''
      const cols = idx.columns.map(c => `"${c}"`).join(', ')
      sqls.push(`CREATE ${unique} INDEX "${idx.name}" ON ${fullTableName} (${cols});`)
    } else {
      // Modified Index
      const original = idx._original
      if (
        idx.name !== original.name ||
        idx.isUnique !== original.isUnique ||
        JSON.stringify(idx.columns) !== JSON.stringify(original.columns)
      ) {
        // Drop original
        sqls.push(`DROP INDEX ${safeSchema}."${original.name}";`)
        // Create new
        const unique = idx.isUnique ? 'UNIQUE' : ''
        const cols = idx.columns.map(c => `"${c}"`).join(', ')
        sqls.push(`CREATE ${unique} INDEX "${idx.name}" ON ${fullTableName} (${cols});`)
      }
    }
  })

  return sqls
}
