import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { app } from 'electron';
import { join } from 'path';

function wrapValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: 0 };
  if (typeof val === 'number') return { numberValue: val };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { boolValue: val };
  if (Array.isArray(val)) return { listValue: { values: val.map(wrapValue) } };
  if (typeof val === 'object') return { structValue: wrapStruct(val) };
  return { stringValue: String(val) };
}

function wrapStruct(obj: any): any {
  if (!obj) return { fields: {} };
  const fields: any = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = wrapValue(v);
  }
  return { fields };
}

function unwrapValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (val.nullValue !== undefined) return null;
  if (val.numberValue !== undefined) return val.numberValue;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.boolValue !== undefined) return val.boolValue;
  if (val.structValue !== undefined) return unwrapStruct(val.structValue);
  if (val.listValue !== undefined)
    return val.listValue.values ? val.listValue.values.map(unwrapValue) : [];
  return val;
}

function unwrapStruct(struct: any): any {
  if (!struct || !struct.fields) return {};
  const res: any = {};
  for (const [k, v] of Object.entries(struct.fields)) {
    res[k] = unwrapValue(v);
  }
  return res;
}

function processDiffRequest(req: any): any {
  if (!req) return req;
  const processed = JSON.parse(JSON.stringify(req));

  const processCol = (col: any) => {
    if (!col) return;
    if ('length' in col) col.length = wrapValue(col.length);
    if ('precision' in col) col.precision = wrapValue(col.precision);
    if ('scale' in col) col.scale = wrapValue(col.scale);
    if (col.defaultValue !== undefined && col.defaultValue !== null) {
      col.defaultValue = { value: String(col.defaultValue) };
    } else {
      col.defaultValue = null;
    }
    if (col.original) processCol(col.original);
  };

  const processCols = (cols: any[]) => {
    if (!Array.isArray(cols)) return;
    cols.forEach(processCol);
  };

  processCols(processed.columns);
  processCols(processed.deletedColumns);
  return processed;
}

export class GrpcClient {
  private client: any;

  constructor(port: number) {
    const isDev = !app.isPackaged;
    const protoPath = isDev
      ? join(app.getAppPath(), 'resources/api/vstable.proto')
      : join(process.resourcesPath, 'api/vstable.proto');

    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: false, // use camelCase for standard gRPC JS behavior
      longs: String,
      enums: String,
      defaults: false,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const vstable = protoDescriptor.vstable as any;

    this.client = new vstable.EngineService(`127.0.0.1:${port}`, grpc.credentials.createInsecure());
  }

  private callRpc(method: string, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client[method](request, (err: any, response: any) => {
        if (err) {
          console.error(`[gRPC] Error calling ${method}:`, err);
          resolve({ success: false, error: err.details || err.message || 'Unknown error' });
        } else {
          resolve({ ...response, success: true });
        }
      });
    });
  }

  async ping() {
    const res = await this.callRpc('Ping', {});
    if (!res.success) throw new Error(res.error);
    return res;
  }

  async connect(req: any) {
    return this.callRpc('Connect', req);
  }

  async disconnect(id: string) {
    return this.callRpc('Disconnect', { id });
  }

  async query(id: string, sql: string, params: any[]) {
    const pbParams = { values: params.map(wrapValue) };
    const res = await this.callRpc('Query', { id, sql, params: pbParams });
    if (!res.success) return res;

    // Unwrap the rows from google.protobuf.Struct
    const rows = res.rows ? res.rows.map(unwrapStruct) : [];
    return { ...res, rows, data: rows };
  }

  async generateAlterTable(req: any) {
    const res = await this.callRpc('GenerateAlterTable', processDiffRequest(req));
    if (!res.success) throw new Error(res.error);
    return res.sqls || [];
  }

  async generateCreateTable(req: any) {
    const res = await this.callRpc('GenerateCreateTable', processDiffRequest(req));
    if (!res.success) throw new Error(res.error);
    return res.sqls || [];
  }
}
