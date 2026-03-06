export interface QueryResult {
  success: boolean;
  rows?: any[];
  fields?: any[];
  error?: string;
  capabilities?: Capabilities;
}

export interface TypeGroup {
  label: string;
  types: string[];
}

export interface Capabilities {
  dialect: string;
  quoteChar: string;
  supportsSchemas: boolean;
  typeGroups: TypeGroup[];
  queryTemplates: {
    listDatabases: string;
    listSchemas?: string;
    listTables: string;
    listColumns: string;
    listIndexes: string;
    getPrimaryKey: string;
  };
}

export interface ConnectionConfig {
  id?: string;
  name?: string;
  dialect?: 'postgres' | 'mysql';
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export interface SortCondition {
  column: string;
  direction: 'ASC' | 'DESC';
}

export interface TableTab {
  id: string;
  type: 'table' | 'query' | 'structure';
  schema?: string;
  name: string;
  pk?: string | null;
  mode?: 'create' | 'edit';
  initialSchema?: string;
  initialTableName?: string;
  page?: number;
  pageSize?: number;
  totalRows?: number;
  results: { rows: any[]; fields: any[] } | null;
  structure?: any[];
  query: string;
  filters?: FilterCondition[];
  sorts?: SortCondition[];
  isAddingRow?: boolean;
  newRowData?: Record<string, any>;
  refreshKey?: number;
  focusKey?: number;
}

export interface FilterCondition {
  id: string;
  column: string;
  operator: string;
  value: string;
  enabled: boolean;
}

export interface PersistedTab {
  id: string;
  type: 'table' | 'query' | 'structure';
  name: string;
  schema?: string;
  query?: string;
  pk?: string | null;
  structure?: any[];
  page?: number;
  pageSize?: number;
  filters?: FilterCondition[];
  sorts?: SortCondition[];
  mode?: 'create' | 'edit';
  initialSchema?: string;
  initialTableName?: string;
}

export interface PersistedSession {
  id: string;
  title: string;
  config?: ConnectionConfig;
  tabs: PersistedTab[];
  activeTabId: string | null;
  mruTabIds: string[];
}

export interface PersistedWorkspace {
  activeSessionId: string;
  sessions: PersistedSession[];
}
