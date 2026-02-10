import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { Pool } from 'pg'

let pools = new Map<string, Pool>()

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
  try {
    if (pools.has(id)) {
      await pools.get(id)!.end()
    }
    const pool = new Pool(config)
    await pool.query('SELECT NOW()')
    pools.set(id, pool)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:disconnect', async (_, id) => {
  if (pools.has(id)) {
    await pools.get(id)!.end()
    pools.delete(id)
  }
  return { success: true }
})

ipcMain.handle('db:query', async (_, { id, sql, params }) => {
  const pool = pools.get(id)
  if (!pool) return { success: false, error: 'No database connection' }
  try {
    const result = await pool.query(sql, params)
    return { success: true, rows: result.rows, fields: result.fields }
  } catch (error: any) {
    return { success: false, error: error.message }
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