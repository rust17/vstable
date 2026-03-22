import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { test as base } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, '../../backend/api/vstable.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const vstableProto = (grpc.loadPackageDefinition(packageDefinition) as any).vstable;

/**
 * Flattens google.protobuf.Struct to a plain JS object
 */
function flattenStruct(st: any): any {
  if (!st || !st.fields) return {};
  const res: any = {};
  for (const [key, value] of Object.entries(st.fields)) {
    res[key] = flattenValue(value);
  }
  return res;
}

function flattenValue(v: any): any {
  if (!v) return null;
  if (v.kind === 'structValue') return flattenStruct(v.structValue);
  if (v.kind === 'listValue') {
    return (v.listValue.values || []).map(flattenValue);
  }
  if (v.kind === 'nullValue') return null;
  // Use the value from the field matching its kind (e.g. stringValue, numberValue, etc)
  return v[v.kind];
}

/**
 * Converts JS value to google.protobuf.Value structure
 */
function toProstValue(v: any): any {
  if (v === null || v === undefined) return { nullValue: 0, kind: 'nullValue' };
  if (typeof v === 'string') return { stringValue: v, kind: 'stringValue' };
  if (typeof v === 'number') return { numberValue: v, kind: 'numberValue' };
  if (typeof v === 'boolean') return { boolValue: v, kind: 'boolValue' };
  if (Array.isArray(v)) {
    return {
      listValue: { values: v.map(toProstValue) },
      kind: 'listValue',
    };
  }
  if (typeof v === 'object') {
    const fields: any = {};
    for (const [key, val] of Object.entries(v)) {
      fields[key] = toProstValue(val);
    }
    return {
      structValue: { fields },
      kind: 'structValue',
    };
  }
  return { nullValue: 0, kind: 'nullValue' };
}

function toProstColumn(c: any): any {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    enum_values: c.enumValues || [],
    length: toProstValue(c.length),
    precision: toProstValue(c.precision),
    scale: toProstValue(c.scale),
    nullable: !!c.nullable,
    default_value: c.defaultValue ? { value: String(c.defaultValue) } : null,
    is_default_expression: !!c.isDefaultExpression,
    is_primary_key: !!c.isPrimaryKey,
    is_auto_increment: !!c.isAutoIncrement,
    is_identity: !!c.isIdentity,
    comment: c.comment || '',
    pk_constraint_name: c.pkConstraintName || '',
    original_index: c.originalIndex || 0,
    original: c.original ? toProstColumn(c.original) : null,
  };
}

function toProstIndex(idx: any): any {
  if (!idx) return null;
  return {
    id: idx.id,
    name: idx.name,
    columns: idx.columns || [],
    is_unique: !!idx.isUnique,
    original: idx.original ? toProstIndex(idx.original) : null,
  };
}

function toProstDiffRequest(req: any): any {
  if (!req) return null;
  return {
    dialect: req.dialect || '',
    schema: req.schema || '',
    table_name: req.tableName || '',
    old_table_name: req.oldTableName || '',
    columns: (req.columns || []).map(toProstColumn),
    indexes: (req.indexes || []).map(toProstIndex),
    deleted_columns: (req.deletedColumns || []).map(toProstColumn),
    deleted_indexes: (req.deletedIndexes || []).map(toProstIndex),
    // ... add more if needed
  };
}

export const test = base.extend<{ mockTauri: undefined }>({
  mockTauri: [
    async ({ page }, use) => {
      const client = new vstableProto.EngineService(
        'localhost:39082',
        grpc.credentials.createInsecure()
      );

      await page.exposeFunction('__playwright_invoke', async (cmd: string, args: any) => {
        // Handle DB Engine commands
        return new Promise((resolve, reject) => {
          const callback = (err: any, response: any) => {
            if (err) {
              reject(err.message || 'Unknown error');
            } else {
              if (response?.rows) {
                response.rows = response.rows.map(flattenStruct);
              }
              resolve(response);
            }
          };

          switch (cmd) {
            case 'db_connect':
              client.DbConnect(args, callback);
              break;
            case 'db_query':
              client.Query(args, callback);
              break;
            case 'db_disconnect':
              client.Disconnect(args, callback);
              break;
            case 'engine_ping':
              client.Ping({}, (err: any) => resolve(!err));
              break;
            case 'sql_generate_alter':
              client.GenerateAlterTable(toProstDiffRequest(args.req || args), callback);
              break;
            case 'sql_generate_create':
              client.GenerateCreateTable(toProstDiffRequest(args.req || args), callback);
              break;
            case 'window_toggle_maximize':
              resolve(null);
              break;
            default:
              reject(`Unknown command: ${cmd}`);
          }
        });
      });

      await page.addInitScript(() => {
        // Mock Tauri internals
        (window as any).__TAURI_INTERNALS__ = {
          invoke: async (cmd: string, args: any) => {
            try {
              const res = await (window as any).__playwright_invoke(cmd, args);
              return res;
            } catch (err) {
              if (typeof err === 'string') {
                throw { message: err };
              }
              throw err;
            }
          },
        };
        // Mocking core invoke if needed
        (window as any).__TAURI__ = {
          invoke: (window as any).__TAURI_INTERNALS__.invoke,
        };
      });

      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
