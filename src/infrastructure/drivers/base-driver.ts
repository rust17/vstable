export interface QueryResult {
  success: boolean
  rows?: any[]
  fields?: any[]
  error?: string
}

export interface BaseDriver {
  connect(config: any): Promise<QueryResult>
  disconnect(): Promise<QueryResult>
  query(sql: string, params?: any[]): Promise<QueryResult>
  close(): Promise<void>
}
