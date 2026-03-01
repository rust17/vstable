import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as store from './store'
import { logger } from './logger'

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

// 辅助函数：向 Go 引擎发送请求
async function engineFetch(path: string, method: string, body?: any) {
  const url = `http://127.0.0.1:${daemonManager.port}${path}`
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    })
    const result = await response.json()
    return result
  } catch (error: any) {
    console.error(`[Main] engineFetch error for ${path}:`, error.message, error.code)
    return { success: false, error: `Engine communication error: ${error.message}` }
  }
}

// 数据库 IPC 处理 (代理到 Go)
handleIPC('db:connect', async (_, id, config) => {
  // 将前端配置转为 Go 引擎需要的 DSN
  let dsn = ''
  if (config.dialect === 'pg' || config.dialect === 'postgres' || config.dialect === 'postgresql') {
    dsn = `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}?sslmode=disable`
  } else {
    dsn = `${config.user}:${config.password}@tcp(${config.host}:${config.port})/${config.database}`
  }

  return await engineFetch('/api/connect', 'POST', {
    id,
    dialect: config.dialect,
    dsn
  })
})

handleIPC('db:disconnect', async (_, id) => {
  return await engineFetch(`/api/disconnect?id=${id}`, 'GET')
})

handleIPC('db:query', async (_, id, sql, params) => {
  // query 接口前端需要返回的也是完整对象 { success, data, error }
  return await engineFetch('/api/query', 'POST', {
    id,
    sql,
    params: params || []
  })
})

// SQL 生成代理
handleIPC('sql:generate-alter', async (_, req) => {
  const result = await engineFetch('/api/diff', 'POST', req)
  if (result.success) return result.data || []
  throw new Error(result.error || 'SQL generation failed')
})

handleIPC('sql:generate-create', async (_, req) => {
  const result = await engineFetch('/api/create-table', 'POST', req)
  if (result.success) return result.data || []
  throw new Error(result.error || 'SQL generation failed')
})

// Go Engine 通信测试代理
handleIPC('engine:ping', async () => {
  try {
    const response = await fetch(`http://127.0.0.1:${daemonManager.port}/api/ping`)
    return await response.json()
  } catch (error: any) {
    console.error('Failed to ping Go engine:', error)
    throw error
  }
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

import { daemonManager } from './daemon'

app.whenReady().then(() => {
  daemonManager.start()

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

app.on('before-quit', () => {
  daemonManager.stop()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})