export interface IElectronAPI {
  // DB Ops
  connect: (id: string, config: any) => Promise<{ success: boolean; error?: string; capabilities?: any }>
  query: (id: string, sql: string, params?: any[]) => Promise<{ success: boolean; rows?: any[]; fields?: any[]; error?: string }>
  disconnect: (id: string) => Promise<{ success: boolean }>
  
  // Engine & SQL
  enginePing: () => Promise<{ status: string }>
  generateAlterSql: (req: any) => Promise<{ success: boolean; data: string[]; error?: string }>
  generateCreateSql: (req: any) => Promise<{ success: boolean; data: string[]; error?: string }>
  
  // Window
  toggleMaximize: () => Promise<void>
  
  // Store
  getSavedConnections: () => Promise<any[]>
  saveConnection: (config: any) => Promise<void>
  deleteConnection: (id: string) => Promise<void>
}

declare global {
  interface Window {
    api: IElectronAPI
    electron: any
  }
}
