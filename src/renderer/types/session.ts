export interface QueryResult {
  success: boolean
  rows?: any[]
  fields?: any[]
  error?: string
}

export interface ConnectionConfig {
  id?: string
  name?: string
  dialect?: 'postgres' | 'mysql'
  host: string
  port: number
  user: string
  password?: string
  database: string
}

export interface TableTab {
  id: string
  type: 'table' | 'query' | 'structure'
  schema?: string
  name: string
  pk?: string | null
  mode?: 'create' | 'edit'
  initialSchema?: string
  initialTableName?: string
  page?: number
  pageSize?: number
  totalRows?: number
  results: {rows: any[], fields: any[]} | null
  structure?: any[]
  query: string
  filters?: FilterCondition[]
  isAddingRow?: boolean
  newRowData?: Record<string, any>
  refreshKey?: number
  focusKey?: number
}

export interface FilterCondition {
  id: string
  column: string
  operator: string
  value: string
  enabled: boolean
}
