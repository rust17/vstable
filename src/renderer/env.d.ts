export interface IElectronAPI {
  connect: (id: string, config: any) => Promise<{ success: boolean; error?: string }>
  query: (id: string, sql: string, params?: any[]) => Promise<{ success: boolean; rows?: any[]; fields?: any[]; error?: string }>
  disconnect: (id: string) => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    api: IElectronAPI
    electron: any
  }
}
