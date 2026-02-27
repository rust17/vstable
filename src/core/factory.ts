import * as pgDiff from './pg/diff'
import * as mysqlDiff from './mysql/diff'

export interface DiffEngine {
  generateAlterTableSql: typeof pgDiff.generateAlterTableSql
  generateCreateTableSql: typeof pgDiff.generateCreateTableSql
}

export class DiffFactory {
  static get(dialect: string): DiffEngine {
    if (dialect === 'mysql') {
      return mysqlDiff as any
    }
    return pgDiff as any
  }
}
