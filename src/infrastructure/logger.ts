import * as fs from 'fs'
import * as path from 'path'

class DebugLogger {
  private logPath: string
  private isEnabled: boolean

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true'
    // In dev mode, output to the project root directory
    this.logPath = this.isEnabled ? path.join(process.cwd(), '.debug.log') : ''
  }

  private writeLog(type: string, message: string, data?: any) {
    if (!this.isEnabled) return
    const timestamp = new Date().toISOString()
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : ''
    const logLine = `[${timestamp}] [${type}] ${message}${dataStr}\n`

    try {
      fs.appendFileSync(this.logPath, logLine, 'utf-8')
    } catch (error) {
      console.error('Failed to write debug log:', error)
    }
  }

  logIpc(channel: string, status: string, data?: any) {
    this.writeLog('IPC', `[${channel}] ${status}`, data)
  }

  logQuery(id: string, sql: string, params?: any[], durationMs?: number, rowCount?: number) {
    this.writeLog('SQL', `[Connection: ${id}] Executed in ${durationMs?.toFixed(2)}ms | Affected/Rows: ${rowCount !== undefined ? rowCount : 'N/A'}`, {
      sql: sql.trim().replace(/\n/g, ' '),
      params
    })
  }

  logError(context: string, error: any) {
    this.writeLog('ERROR', `[${context}]`, { message: error?.message || error })
  }
}

export const logger = new DebugLogger()
