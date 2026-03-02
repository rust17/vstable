import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app } from 'electron'
import * as os from 'os'
import { existsSync } from 'fs'

export class DaemonManager {
  private engineProcess: ChildProcess | null = null
  public readonly port = 39082

  start() {
    console.log('[Daemon] Starting Go Engine...')
    
    // 开发环境下，直接运行 go run main.go
    // 生产环境下，运行打包进去的 vstable-engine 二进制文件
    const isDev = !app.isPackaged

    if (isDev) {
      // app.getAppPath() 通常指向 frontend 目录
      const frontendDir = app.getAppPath()
      const backendDir = join(frontendDir, '../backend')
      
      const binaryName = os.platform() === 'win32' ? 'vstable-engine.exe' : 'vstable-engine'
      const binaryPath = join(backendDir, binaryName)

      if (existsSync(binaryPath)) {
        console.log(`[Daemon] Spawning pre-built engine at ${binaryPath}`)
        this.engineProcess = spawn(binaryPath, [], {
          cwd: backendDir,
          env: { ...process.env, VSTABLE_PORT: this.port.toString() }
        })
      } else {
        // 解决某些环境下 PATH 找不到 go 的问题
        const goBin = process.platform === 'win32' ? 'go.exe' : '/usr/local/go/bin/go'
        
        console.log(`[Daemon] App Path: ${frontendDir}`)
        console.log(`[Daemon] Backend Dir: ${backendDir}`)
        console.log(`[Daemon] Spawning backend using ${goBin} run...`)

        this.engineProcess = spawn(goBin, ['run', 'main.go'], {
          cwd: backendDir,
          env: { ...process.env, VSTABLE_PORT: this.port.toString() }
        })
      }

      this.engineProcess.on('error', (err) => {
        console.error(`[Daemon] Failed to start Go engine: ${err.message}`)
        console.error(`[Daemon] Current PATH: ${process.env.PATH}`)
      })
    } else {
      // 假设二进制文件位于 app.getAppPath()/resources/engine/ 或类似路径
      // 注意: 这里暂留二进制执行的骨架，当前主要演示 dev 模式
      const binaryName = os.platform() === 'win32' ? 'vstable-engine.exe' : 'vstable-engine'
      const binaryPath = join(process.resourcesPath, 'engine', binaryName)
      this.engineProcess = spawn(binaryPath, [], {
        env: { ...process.env, VSTABLE_PORT: this.port.toString() }
      })
    }

    this.engineProcess.stdout?.on('data', (data) => {
      console.log(`[Go Engine] ${data.toString().trim()}`)
    })

    this.engineProcess.stderr?.on('data', (data) => {
      console.error(`[Go Engine ERROR] ${data.toString().trim()}`)
    })

    this.engineProcess.on('close', (code) => {
      console.log(`[Daemon] Go Engine exited with code ${code}`)
      this.engineProcess = null
    })
  }

  stop() {
    if (this.engineProcess) {
      console.log('[Daemon] Stopping Go Engine...')
      this.engineProcess.kill('SIGTERM')
      this.engineProcess = null
    }
  }
}

export const daemonManager = new DaemonManager()