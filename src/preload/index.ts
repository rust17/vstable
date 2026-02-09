import { contextBridge, ipcRenderer } from 'electron'
import { exposeElectronAPI } from '@electron-toolkit/preload'

// 暴露出基础的 Electron API
if (process.contextIsolated) {
  try {
    exposeElectronAPI()
    contextBridge.exposeInMainWorld('api', {
      connect: (config) => ipcRenderer.invoke('db:connect', config),
      query: (sql, params) => ipcRenderer.invoke('db:query', sql, params)
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in d.ts)
  window.electron = electronAPI
}
