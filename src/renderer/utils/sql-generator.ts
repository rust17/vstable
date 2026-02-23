export interface ColumnDefinition {
  id: string
  name: string
  type: string
  enumValues?: string[]
  length?: number | string | null
  precision?: number | string | null
  scale?: number | string | null
  nullable: boolean
  defaultValue: string | null
  isDefaultExpression?: boolean
  isPrimaryKey: boolean
  isAutoIncrement?: boolean
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

const formatType = (col: ColumnDefinition, tableName?: string): string => {
  let type = col.type.toLowerCase()
  
  if (type === 'enum' && col.enumValues && col.enumValues.length > 0) {
    // For simplicity, we use a naming convention for the custom enum type
    return `"${tableName || 'table'}_${col.name}_enum"`
  }

  // Handle Auto Increment for PG
  if (col.isAutoIncrement) {
    if (type === 'integer' || type === 'int' || type === 'int4') return 'SERIAL'
    if (type === 'bigint' || type === 'int8') return 'BIGSERIAL'
    if (type === 'smallint' || type === 'int2') return 'SMALLSERIAL'
  }

  if (col.length) {
    return `${type}(${col.length})`
  }
  if (col.precision !== undefined && col.precision !== null) {
    if (col.scale !== undefined && col.scale !== null) {
      return `${type}(${col.precision},${col.scale})`
    }
    return `${type}(${col.precision})`
  }
  return type
}

const formatDefault = (col: ColumnDefinition): string | null => {
  if (col.defaultValue === null || col.defaultValue === undefined) return null
  if (col.isDefaultExpression) return col.defaultValue
  
  // If it's a string type and doesn't have quotes, add them
  const typeLower = col.type.toLowerCase()
  const isString = typeLower.includes('char') || typeLower.includes('text') || typeLower.includes('uuid') || typeLower === 'enum'
  if (isString && !col.defaultValue.startsWith("'")) {
    return `'${col.defaultValue}'`
  }
  return col.defaultValue
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
    const formattedType = formatType(col, tableName)
    const formattedDefault = formatDefault(col)
    
    if (col.type.toLowerCase() === 'enum' && col.enumValues && col.enumValues.length > 0) {
      const typeName = formattedType
      sqls.push(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${typeName.replace(/"/g, '')}') THEN CREATE TYPE ${safeSchema}.${typeName} AS ENUM (${col.enumValues.map(v => `'${v}'`).join(', ')}); END IF; END $$;`)
    }

    if (!col._original) {
      // New Column
      let line = `ALTER TABLE ${fullTableName} ADD COLUMN "${col.name}" ${formattedType}`
      if (!col.nullable) line += ` NOT NULL`
      if (formattedDefault !== null) line += ` DEFAULT ${formattedDefault}`
      sqls.push(line + ';')
    } else {
      // Modified Column
      const original = col._original
      const originalFormattedType = formatType(original as ColumnDefinition, tableName)
      const originalFormattedDefault = formatDefault(original as ColumnDefinition)
      
      // Rename
      if (col.name !== original.name) {
        sqls.push(`ALTER TABLE ${fullTableName} RENAME COLUMN "${original.name}" TO "${col.name}";`)
      }

      // Type / Parameters change
      if (formattedType !== originalFormattedType) {
        sqls.push(`ALTER TABLE ${fullTableName} ALTER COLUMN "${col.name}" TYPE ${formattedType} USING "${col.name}"::${formattedType};`)
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
      if (formattedDefault !== originalFormattedDefault) {
        if (formattedDefault === null) {
           sqls.push(`ALTER TABLE ${fullTableName} ALTER COLUMN "${col.name}" DROP DEFAULT;`)
        } else {
           sqls.push(`ALTER TABLE ${fullTableName} ALTER COLUMN "${col.name}" SET DEFAULT ${formattedDefault};`)
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

export const generateCreateTableSql = (
  schema: string,
  tableName: string,
  columns: ColumnDefinition[],
  indexes: IndexDefinition[]
): string[] => {
  const sqls: string[] = []
  const safeSchema = `"${schema}"`
  const safeTable = `"${tableName}"`
  const fullTableName = `${safeSchema}.${safeTable}`

  // 1. Create Enum Types if needed
  columns.forEach(col => {
    if (col.type.toLowerCase() === 'enum' && col.enumValues && col.enumValues.length > 0) {
      const typeName = formatType(col, tableName)
      sqls.push(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${typeName.replace(/"/g, '')}') THEN CREATE TYPE ${safeSchema}.${typeName} AS ENUM (${col.enumValues.map(v => `'${v}'`).join(', ')}); END IF; END $$;`)
    }
  })

  // 2. Create Table
  const columnDefs: string[] = []
  const pkColumns: string[] = []

  columns.forEach(col => {
    let def = `"${col.name}" ${formatType(col, tableName)}`
    if (!col.nullable) def += ` NOT NULL`
    const formattedDefault = formatDefault(col)
    if (formattedDefault !== null) {
       def += ` DEFAULT ${formattedDefault}`
    }
    columnDefs.push(def)

    if (col.isPrimaryKey) {
      pkColumns.push(`"${col.name}"`)
    }
  })

  if (pkColumns.length > 0) {
    columnDefs.push(`PRIMARY KEY (${pkColumns.join(', ')})`)
  }

  sqls.push(`CREATE TABLE ${fullTableName} (\n  ${columnDefs.join(',\n  ')}\n);`)

  // 3. Create Indexes
  indexes.forEach(idx => {
    const unique = idx.isUnique ? 'UNIQUE' : ''
    const cols = idx.columns.map(c => `"${c}"`).join(', ')
    sqls.push(`CREATE ${unique} INDEX "${idx.name}" ON ${fullTableName} (${cols});`)
  })

  return sqls
}
