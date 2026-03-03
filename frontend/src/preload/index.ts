import { contextBridge, ipcRenderer } from 'electron'
import { exposeElectronAPI } from '@electron-toolkit/preload'

// 暴露出基础的 Electron API
if (process.contextIsolated) {
  try {
    exposeElectronAPI()
    contextBridge.exposeInMainWorld('api', {
      connect: (id: string, config: any) => ipcRenderer.invoke('db:connect', id, config),
      query: (id: string, sql: string, params?: any[]) => ipcRenderer.invoke('db:query', id, sql, params),
      disconnect: (id: string) => ipcRenderer.invoke('db:disconnect', id),
      enginePing: () => ipcRenderer.invoke('engine:ping'),
      generateAlterSql: (req: any) => ipcRenderer.invoke('sql:generate-alter', req),
      generateCreateSql: (req: any) => ipcRenderer.invoke('sql:generate-create', req),
      toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
      // Store APIs
      getSavedConnections: () => ipcRenderer.invoke('store:get-all'),
      saveConnection: (config: any) => ipcRenderer.invoke('store:save', config),
      deleteConnection: (id: string) => ipcRenderer.invoke('store:delete', id)
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in d.ts)
  window.electron = electronAPI
}
