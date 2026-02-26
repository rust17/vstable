import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { dbManager } from './db-manager'
import * as store from './store'

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

// 数据库 IPC 处理
ipcMain.handle('db:connect', async (_, { id, config }) => {
  return await dbManager.connect(id, config)
})

ipcMain.handle('db:disconnect', async (_, id) => {
  return await dbManager.disconnect(id)
})

ipcMain.handle('db:query', async (_, { id, sql, params }) => {
  return await dbManager.query(id, sql, params)
})

// 存储 IPC 处理
ipcMain.handle('store:get-all', () => {
  const connections = store.getSavedConnections()
  // 返回时解密密码，方便前端填充（仅在 IPC 通道传输）
  return connections.map(c => ({
    ...c,
    password: c.encryptedPassword ? store.decryptPassword(c.encryptedPassword) : ''
  }))
})

ipcMain.handle('store:save', (_, config) => {
  store.saveConnection(config)
})

ipcMain.handle('store:delete', (_, id) => {
  store.deleteConnection(id)
})

ipcMain.handle('window:toggle-maximize', (event) => {
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