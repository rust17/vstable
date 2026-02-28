import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { dbManager } from '../infrastructure/db-manager'
import * as store from './store'
import { logger } from '../infrastructure/logger'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function handleIPC(channel: string, listener: (event: any, ...args: any[]) => any) {
  ipcMain.handle(channel, async (event, ...args) => {
    const startTime = performance.now()
    logger.logIpc(channel, 'Request', args)
    try {
      const result = await listener(event, ...args)
      const duration = performance.now() - startTime
      logger.logIpc(channel, 'Response', { durationMs: duration })
      return result
    } catch (error: any) {
      const duration = performance.now() - startTime
      logger.logIpc(channel, 'Error', { durationMs: duration, error: error.message })
      throw error
    }
  })
}

// 数据库 IPC 处理
handleIPC('db:connect', async (_, { id, config }) => {
  return await dbManager.connect(id, config)
})

handleIPC('db:disconnect', async (_, id) => {
  return await dbManager.disconnect(id)
})

handleIPC('db:query', async (_, { id, sql, params }) => {
  return await dbManager.query(id, sql, params)
})

// 存储 IPC 处理
handleIPC('store:get-all', () => {
  const connections = store.getSavedConnections()
  // 返回时解密密码，方便前端填充（仅在 IPC 通道传输）
  return connections.map(c => ({
    ...c,
    password: c.encryptedPassword ? store.decryptPassword(c.encryptedPassword) : ''
  }))
})

handleIPC('store:save', (_, config) => {
  store.saveConnection(config)
})

handleIPC('store:delete', (_, id) => {
  store.deleteConnection(id)
})

handleIPC('window:toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
})

app.whenReady().then(() => {
  // Set app user model id for windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.quickpg.app')
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})