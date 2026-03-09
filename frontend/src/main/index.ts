import { is, optimizer } from '@electron-toolkit/utils';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { GrpcClient } from './grpcClient';
import { logger } from './logger';
import * as store from './store';

let grpcClient: GrpcClient;

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
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function handleIPC(channel: string, listener: (event: any, ...args: any[]) => any) {
  ipcMain.handle(channel, async (event, ...args) => {
    const startTime = performance.now();
    logger.logIpc(channel, 'Request', args);
    try {
      const result = await listener(event, ...args);
      const duration = performance.now() - startTime;
      logger.logIpc(channel, 'Response', { durationMs: duration });
      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;
      logger.logIpc(channel, 'Error', { durationMs: duration, error: error.message });
      throw error;
    }
  });
}

// 数据库 IPC 处理 (代理到 Go gRPC)
handleIPC('db:connect', async (_, id, config) => {
  // 处理保存的加密密码
  let password = config.password || '';
  if (!password && config.encryptedPassword) {
    password = store.decryptPassword(config.encryptedPassword);
  }

  // 将前端配置转为 Go 引擎需要的 DSN
  let dsn = '';
  if (config.dialect === 'pg' || config.dialect === 'postgres' || config.dialect === 'postgresql') {
    dsn = `postgres://${config.user}:${password}@${config.host}:${config.port}/${config.database}?sslmode=disable`;
  } else {
    dsn = `${config.user}:${password}@tcp(${config.host}:${config.port})/${config.database}`;
  }

  return await grpcClient.connect({
    id,
    dialect: config.dialect,
    dsn,
  });
});

handleIPC('db:disconnect', async (_, id) => {
  return await grpcClient.disconnect(id);
});

handleIPC('db:query', async (_, id, sql, params) => {
  return await grpcClient.query(id, sql, params || []);
});

// SQL 生成代理
handleIPC('sql:generate-alter', async (_, req) => {
  try {
    return await grpcClient.generateAlterTable(req);
  } catch (err: any) {
    throw new Error(err.message || 'SQL generation failed');
  }
});

handleIPC('sql:generate-create', async (_, req) => {
  try {
    return await grpcClient.generateCreateTable(req);
  } catch (err: any) {
    throw new Error(err.message || 'SQL generation failed');
  }
});

// Go Engine 通信测试代理
handleIPC('engine:ping', async () => {
  try {
    return await grpcClient.ping();
  } catch (error: any) {
    console.error('Failed to ping Go engine:', error);
    throw error;
  }
});

// 存储 IPC 处理
handleIPC('store:get-all', () => {
  const connections = store.getSavedConnections();
  // 返回时解密密码，方便前端填充（仅在 IPC 通道传输）
  return connections.map((c) => ({
    ...c,
    password: c.encryptedPassword ? store.decryptPassword(c.encryptedPassword) : c.password || '',
  }));
});

handleIPC('store:save', (_, config) => {
  store.saveConnection(config);
});

handleIPC('store:delete', (_, id) => {
  store.deleteConnection(id);
});

handleIPC('store:get-workspace', () => {
  const workspace = store.getWorkspace();
  // decrypt passwords just like we do for get-all
  if (workspace?.sessions) {
    workspace.sessions.forEach((s: any) => {
      if (s.config?.encryptedPassword) {
        s.config.password = store.decryptPassword(s.config.encryptedPassword);
      }
      // If encryptedPassword is not present, it means password was saved as plain text or is empty.
      // It is already in s.config.password from JSON if plain text, so no action needed.
    });
  }
  return workspace;
});

handleIPC('store:save-workspace', (_, data) => {
  store.saveWorkspace(data);
});

handleIPC('window:toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

import { daemonManager } from './daemon';

app.whenReady().then(() => {
  daemonManager.start();
  grpcClient = new GrpcClient(daemonManager.port);

  // Set app user model id for windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.vstable.app');
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  daemonManager.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
