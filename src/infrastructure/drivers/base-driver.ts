export interface QueryResult {
  success: boolean
  rows?: any[]
  fields?: any[]
  rowCount?: number
  error?: string
}

export interface TypeGroup {
  label: string
  types: string[]
}

export interface Capabilities {
  dialect: string
  quoteChar: string
  supportsSchemas: boolean
  typeGroups: TypeGroup[]
  queryTemplates: {
    listDatabases: string
    listSchemas?: string
    listTables: string
    listColumns: string
    listIndexes: string
    getPrimaryKey: string
  }
}

export interface BaseDriver {
  connect(config: any): Promise<QueryResult>
  disconnect(): Promise<QueryResult>
  query(sql: string, params?: any[]): Promise<QueryResult>
  close(): Promise<void>
  getCapabilities(): Capabilities
}
