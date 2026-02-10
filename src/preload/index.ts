import { contextBridge, ipcRenderer } from 'electron'
import { exposeElectronAPI } from '@electron-toolkit/preload'

// 暴露出基础的 Electron API
if (process.contextIsolated) {
  try {
    exposeElectronAPI()
    contextBridge.exposeInMainWorld('api', {
      connect: (id, config) => ipcRenderer.invoke('db:connect', { id, config }),
      query: (id, sql, params) => ipcRenderer.invoke('db:query', { id, sql, params }),
      disconnect: (id) => ipcRenderer.invoke('db:disconnect', id)
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in d.ts)
  window.electron = electronAPI
}
