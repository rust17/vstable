export interface IElectronAPI {
  connect: (config: any) => Promise<{ success: boolean; error?: string }>
  query: (sql: string, params?: any[]) => Promise<{ success: boolean; rows?: any[]; fields?: any[]; error?: string }>
}

declare global {
  interface Window {
    api: IElectronAPI
    electron: any
  }
}
