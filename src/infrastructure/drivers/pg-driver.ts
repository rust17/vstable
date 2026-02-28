import { Pool } from 'pg'
import { BaseDriver, QueryResult, Capabilities } from './base-driver'

export class PgDriver implements BaseDriver {
  private pool: Pool | null = null

  getCapabilities(): Capabilities {
    return {
      dialect: 'postgres',
      quoteChar: '"',
      supportsSchemas: true,
      typeGroups: [
        {
          label: 'Numeric',
          types: ['integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision', 'decimal', 'serial', 'bigserial']
        },
        {
          label: 'String',
          types: ['varchar', 'text', 'char', 'bpchar', 'uuid', 'enum']
        },
        {
          label: 'Date/Time',
          types: ['timestamp', 'timestamp with time zone', 'date', 'time', 'interval']
        },
        {
          label: 'JSON',
          types: ['json', 'jsonb']
        },
        {
          label: 'Binary/Other',
          types: ['boolean', 'bytea', 'xml', 'bit', 'varbit', 'inet', 'cidr', 'macaddr']
        }
      ],
      queryTemplates: {
        listDatabases: `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;`,
        listSchemas: `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog') ORDER BY schema_name;`,
        listTables: `SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema = '{{schema}}' ORDER BY table_name;`,
        listColumns: `
          SELECT 
            c.column_name, 
            c.data_type, 
            c.is_nullable, 
            c.column_default,
            c.ordinal_position,
            c.character_maximum_length,
            c.numeric_precision,
            c.numeric_scale,
            c.is_identity,
            pg_catalog.col_description(t.oid, c.ordinal_position) as column_comment,
            (SELECT kcu.constraint_name FROM information_schema.key_column_usage kcu 
             JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name 
             WHERE kcu.table_schema = c.table_schema AND kcu.table_name = c.table_name 
             AND kcu.column_name = c.column_name AND tc.constraint_type = 'PRIMARY KEY' LIMIT 1) as pk_constraint_name
          FROM information_schema.columns c
          JOIN pg_class t ON t.relname = c.table_name
          JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = c.table_schema
          WHERE c.table_schema = '{{schema}}' AND c.table_name = '{{table}}' 
          ORDER BY c.ordinal_position;
        `,
        listIndexes: `
          SELECT
              i.relname as index_name,
              array_agg(a.attname) as column_names,
              ix.indisunique as is_unique
          FROM
              pg_class t
              JOIN pg_index ix ON t.oid = ix.indrelid
              JOIN pg_class i ON i.oid = ix.indexrelid
              JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
              JOIN pg_namespace n ON n.oid = t.relnamespace
          WHERE
              t.relname = '{{table}}' AND n.nspname = '{{schema}}'
          GROUP BY
              i.relname, ix.indisunique;
        `,
        getPrimaryKey: `
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = '{{table}}'
            AND tc.table_schema = '{{schema}}';
        `
      }
    }
  }

  async connect(config: any): Promise<QueryResult> {
    try {
      if (this.pool) {
        await this.pool.end()
      }
      this.pool = new Pool(config)
      // Test connection
      await this.pool.query('SELECT NOW()')
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async disconnect(): Promise<QueryResult> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
    return { success: true }
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.pool) return { success: false, error: 'No PostgreSQL connection' }
    try {
      const result = await this.pool.query(sql, params)
      return { success: true, rows: result.rows, fields: result.fields, rowCount: result.rowCount ?? undefined }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }
}
