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
  comment?: string
  originalIndex?: number
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

const formatType = (col: ColumnDefinition): string => {
  let type = col.type.toLowerCase()
  
  if (type === 'enum' && col.enumValues && col.enumValues.length > 0) {
    return `ENUM(${col.enumValues.map(v => `'${v}'`).join(', ')})`
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
  
  const typeLower = col.type.toLowerCase()
  const isString = typeLower.includes('char') || typeLower.includes('text') || typeLower === 'enum' || typeLower.includes('date') || typeLower.includes('time')
  if (isString && !col.defaultValue.startsWith("'")) {
    return `'${col.defaultValue}'`
  }
  return col.defaultValue
}

export const generateAlterTableSql = (
  schema: string, // In MySQL, schema is database
  tableName: string,
  columns: ColumnDefinition[],
  indexes: IndexDefinition[],
  deletedColumns: ColumnDefinition[],
  deletedIndexes: IndexDefinition[]
): string[] => {
  const sqls: string[] = []
  const safeTable = `\`${tableName}\``

  // 1. Handle Deleted Columns
  deletedColumns.forEach(col => {
    if (col._original) {
      sqls.push(`ALTER TABLE ${safeTable} DROP COLUMN \`${col._original.name}\`;`)
    }
  })

  // 2. Handle Deleted Indexes
  deletedIndexes.forEach(idx => {
    if (idx._original) {
      sqls.push(`ALTER TABLE ${safeTable} DROP INDEX \`${idx._original.name}\`;`)
    }
  })

  // 3. Handle Column Changes
  columns.forEach((col, index) => {
    const formattedType = formatType(col)
    const formattedDefault = formatDefault(col)
    
    let colDef = `\`${col.name}\` ${formattedType}`
    if (!col.nullable) colDef += ` NOT NULL`
    if (formattedDefault !== null) colDef += ` DEFAULT ${formattedDefault}`
    if (col.isAutoIncrement) colDef += ` AUTO_INCREMENT`
    if (col.comment) colDef += ` COMMENT '${col.comment.replace(/'/g, "''")}'`

    let positionSql = ''
    if (index === 0) {
      positionSql = ' FIRST'
    } else {
      const prevCol = columns[index - 1]
      positionSql = ` AFTER \`${prevCol.name}\``
    }

    if (!col._original) {
      // New Column
      sqls.push(`ALTER TABLE ${safeTable} ADD COLUMN ${colDef}${positionSql};`)
    } else {
      // Modified Column
      const original = col._original
      const isRename = col.name !== original.name
      
      const originalFormattedType = formatType(original as ColumnDefinition)
      const originalFormattedDefault = formatDefault(original as ColumnDefinition)
      
      const hasMetadataChange = 
        formattedType !== originalFormattedType ||
        formattedDefault !== originalFormattedDefault ||
        col.nullable !== original.nullable ||
        col.isAutoIncrement !== original.isAutoIncrement ||
        col.comment !== original.comment

      // Detect if position changed
      const originalOrderedCols = columns
        .filter(c => c._original)
        .sort((a, b) => (a._original!.originalIndex || 0) - (b._original!.originalIndex || 0))
        .map(c => c._original!.name)
      
      const originalIdx = originalOrderedCols.indexOf(original.name)
      const originalPrevColName = originalIdx > 0 ? originalOrderedCols[originalIdx - 1] : null
      
      const isFirst = index === 0
      const prevColName = index > 0 ? columns[index - 1].name : null
      const positionChanged = isFirst ? (originalIdx !== 0) : (prevColName !== originalPrevColName)

      if (isRename) {
        sqls.push(`ALTER TABLE ${safeTable} CHANGE COLUMN \`${original.name}\` ${colDef}${positionSql};`)
      } else if (hasMetadataChange || positionChanged) {
        sqls.push(`ALTER TABLE ${safeTable} MODIFY COLUMN ${colDef}${positionSql};`)
      }
    }
  })

  // 4. Handle Index Changes
  indexes.forEach(idx => {
    if (!idx._original) {
      const type = idx.isUnique ? 'UNIQUE INDEX' : 'INDEX'
      const cols = idx.columns.map(c => `\`${c}\``).join(', ')
      sqls.push(`ALTER TABLE ${safeTable} ADD ${type} \`${idx.name}\` (${cols});`)
    } else {
      const original = idx._original
      if (
        idx.name !== original.name ||
        idx.isUnique !== original.isUnique ||
        JSON.stringify(idx.columns) !== JSON.stringify(original.columns)
      ) {
        sqls.push(`ALTER TABLE ${safeTable} DROP INDEX \`${original.name}\`;`)
        const type = idx.isUnique ? 'UNIQUE INDEX' : 'INDEX'
        const cols = idx.columns.map(c => `\`${c}\``).join(', ')
        sqls.push(`ALTER TABLE ${safeTable} ADD ${type} \`${idx.name}\` (${cols});`)
      }
    }
  })

  // 5. PK Changes
  const pkChanged = columns.some(col => col._original && col.isPrimaryKey !== col._original.isPrimaryKey)
  if (pkChanged) {
     const hasOldPk = columns.some(col => col._original?.isPrimaryKey)
     if (hasOldPk) {
       sqls.push(`ALTER TABLE ${safeTable} DROP PRIMARY KEY;`)
     }
     const newPkCols = columns.filter(col => col.isPrimaryKey).map(col => `\`${col.name}\``)
     if (newPkCols.length > 0) {
       sqls.push(`ALTER TABLE ${safeTable} ADD PRIMARY KEY (${newPkCols.join(', ')});`)
     }
  }

  return sqls
}

export const generateCreateTableSql = (
  schema: string,
  tableName: string,
  columns: ColumnDefinition[],
  indexes: IndexDefinition[]
): string[] => {
  const sqls: string[] = []
  const safeTable = `\`${tableName}\``

  const columnDefs: string[] = []
  const pkColumns: string[] = []

  columns.forEach(col => {
    let def = `\`${col.name}\` ${formatType(col)}`
    if (!col.nullable) def += ` NOT NULL`
    const formattedDefault = formatDefault(col)
    if (formattedDefault !== null) def += ` DEFAULT ${formattedDefault}`
    if (col.isAutoIncrement) def += ` AUTO_INCREMENT`
    if (col.comment) def += ` COMMENT '${col.comment.replace(/'/g, "''")}'`
    
    columnDefs.push(def)
    if (col.isPrimaryKey) pkColumns.push(`\`${col.name}\``)
  })

  if (pkColumns.length > 0) {
    columnDefs.push(`PRIMARY KEY (${pkColumns.join(', ')})`)
  }

  // Add indexes in CREATE TABLE for MySQL
  indexes.forEach(idx => {
    const type = idx.isUnique ? 'UNIQUE KEY' : 'KEY'
    const cols = idx.columns.map(c => `\`${c}\``).join(', ')
    columnDefs.push(`${type} \`${idx.name}\` (${cols})`)
  })

  sqls.push(`CREATE TABLE ${safeTable} (\n  ${columnDefs.join(',\n  ')}\n);`)

  return sqls
}
