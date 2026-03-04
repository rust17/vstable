import React, { useState } from 'react';
import { Database, Table as TableIcon, Plus, Trash2, Check, RefreshCw } from 'lucide-react';
import { useSession } from '../../stores/useSessionStore';

interface DatabaseTreeProps {
  databases: string[];
  schemas: string[];
  currentSchema: string;
  tables: { table_name: string; table_schema: string }[];
  activeTable?: { schema: string; name: string } | null;
  onSelectSchema: (schema: string) => void;
  onSelectTable: (schema: string, name: string) => void;
  onSwitchDatabase: (db: string) => void;
  onCreateDatabase: () => void;
  onDeleteDatabase: (db: string | string[]) => void;
  onCreateTable: () => void;
  onDeleteTable: (schema: string, name: string | string[]) => void;
  onRefreshTables?: () => void;
}

export const DatabaseTree: React.FC<DatabaseTreeProps> = ({
  databases,
  schemas,
  currentSchema,
  tables,
  activeTable,
  onSelectSchema,
  onSelectTable,
  onSwitchDatabase,
  onCreateDatabase,
  onDeleteDatabase,
  onCreateTable,
  onDeleteTable,
  onRefreshTables,
}) => {
  const { config } = useSession();
  const isMysql = config.dialect === 'mysql';
  const [dbListOpen, setDbListOpen] = useState(false);
  const [schemaListOpen, setSchemaListOpen] = useState(false);
  const [tableFilter, setTableFilter] = useState('');

  // Multi-select state
  const [selectedDbs, setSelectedDbs] = useState<Set<string>>(new Set());
  const [lastSelectedDb, setLastSelectedDb] = useState<string | null>(null);

  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [lastSelectedTable, setLastSelectedTable] = useState<string | null>(null);

  const handleDbClick = (e: React.MouseEvent, db: string) => {
    e.stopPropagation();
    const isMac = window.navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    let newSelection = new Set<string>();
    if (cmdOrCtrl) {
      newSelection = new Set(selectedDbs);
      if (newSelection.has(db)) newSelection.delete(db);
      else newSelection.add(db);
      setLastSelectedDb(db);
    } else if (e.shiftKey && lastSelectedDb) {
      newSelection = new Set(selectedDbs);
      const start = databases.indexOf(lastSelectedDb);
      const end = databases.indexOf(db);
      const min = Math.min(start, end);
      const max = Math.max(start, end);
      for (let i = min; i <= max; i++) {
        newSelection.add(databases[i]);
      }
    } else {
      onSwitchDatabase(db);
      setDbListOpen(false);
      return;
    }
    setSelectedDbs(newSelection);
  };

  const handleTableClick = (e: React.MouseEvent, schema: string, name: string) => {
    const tableKey = `${schema}.${name}`;
    const isMac = window.navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    let newSelection = new Set<string>();
    if (cmdOrCtrl) {
      newSelection = new Set(selectedTables);
      if (newSelection.has(tableKey)) newSelection.delete(tableKey);
      else newSelection.add(tableKey);
      setLastSelectedTable(tableKey);
    } else if (e.shiftKey && lastSelectedTable) {
      newSelection = new Set(selectedTables);
      const tableKeys = filteredTables.map((t) => `${t.table_schema}.${t.table_name}`);
      const start = tableKeys.indexOf(lastSelectedTable);
      const end = tableKeys.indexOf(tableKey);
      if (start !== -1 && end !== -1) {
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        for (let i = min; i <= max; i++) {
          newSelection.add(tableKeys[i]);
        }
      }
    } else {
      onSelectTable(schema, name);
      setSelectedTables(new Set([tableKey]));
      setLastSelectedTable(tableKey);
      return;
    }
    setSelectedTables(newSelection);
  };

  const filteredTables = tables.filter((table) => {
    if (!tableFilter) return true;
    try {
      const regex = new RegExp(tableFilter, 'i');
      return regex.test(table.table_name);
    } catch (e) {
      return table.table_name.toLowerCase().includes(tableFilter.toLowerCase());
    }
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Fixed Header (Aligns with Tab Bar) */}
      <div className="shrink-0 h-11 flex items-center px-2 border-b border-gray-200 bg-[#f8f9fa]">
        <div className="relative flex-1">
          <div
            onClick={() => setDbListOpen(!dbListOpen)}
            className="flex items-center justify-between px-2 h-8 rounded-md cursor-pointer hover:bg-gray-200/50 transition-all group"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Database size={14} className="text-primary-500 shrink-0" />
              <span className="text-[13px] font-bold text-gray-700 truncate">
                {config.database}
              </span>
            </div>
          </div>

          {dbListOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => {
                  setDbListOpen(false);
                  setSelectedDbs(new Set());
                }}
              />
              <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[400px]">
                <div className="overflow-y-auto flex-1 py-1">
                  {databases.map((db) => (
                    <div
                      key={db}
                      className={`px-3 py-2 flex items-center justify-between group/item hover:bg-gray-50 cursor-pointer ${db === config.database ? 'bg-primary-50 text-primary-700' : selectedDbs.has(db) ? 'bg-primary-100' : 'text-gray-700'}`}
                      onClick={(e) => handleDbClick(e, db)}
                    >
                      <span className="text-sm truncate flex-1">{db}</span>
                      {db !== config.database && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDatabase(db);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover/item:opacity-100 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      {db === config.database && <Check size={12} className="text-primary-600" />}
                    </div>
                  ))}
                </div>
                {selectedDbs.size > 1 && (
                  <div className="p-2 border-t border-red-100 bg-red-50/50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `Are you sure you want to delete ${selectedDbs.size} databases?`
                          )
                        ) {
                          onDeleteDatabase(Array.from(selectedDbs));
                          setSelectedDbs(new Set());
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 size={12} /> Delete Selected ({selectedDbs.size})
                    </button>
                  </div>
                )}
                <div className="border-t border-gray-100 p-1 bg-gray-50">
                  <button
                    onClick={() => {
                      onCreateDatabase();
                      setDbListOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-primary-600 hover:bg-primary-100 rounded transition-colors"
                  >
                    <Plus size={12} /> Create Database
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fixed Secondary Controls (Aligns with right FilterBar default height) */}
      <div className="shrink-0 px-3 py-2 flex flex-col justify-center gap-2 border-b border-gray-200/60 bg-white min-h-[95px]">
        {/* Schema Selector */}
        {!isMysql && (
          <div className="relative">
            <div
              onClick={() => setSchemaListOpen(!schemaListOpen)}
              className="flex items-center justify-between px-3 h-[34px] bg-white border border-gray-200 rounded-lg hover:border-primary-300 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-400/60" />
                <span className="text-xs font-semibold text-gray-500 truncate">
                  {currentSchema}
                </span>
              </div>
            </div>

            {schemaListOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSchemaListOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[200px] overflow-y-auto py-1">
                  {schemas.map((s) => (
                    <div
                      key={s}
                      className={`px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gray-50 cursor-pointer ${s === currentSchema ? 'text-primary-600 bg-primary-50 font-medium' : 'text-gray-600'}`}
                      onClick={() => {
                        onSelectSchema(s);
                        setSchemaListOpen(false);
                      }}
                    >
                      <span className="truncate">{s}</span>
                      {s === currentSchema && <Check size={10} />}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Table Filter */}
        {(tables.length > 0 || isMysql) && (
          <div className="shrink-0">
            <input
              type="text"
              placeholder="Filter tables..."
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="w-full px-3 h-[34px] text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400/30 bg-white hover:border-gray-300 transition-all"
            />
          </div>
        )}
      </div>

      {/* Scrollable Table List */}
      <div className="flex-1 overflow-y-auto elastic-scroll overscroll-y-auto bg-white p-3 pt-4">
        {/* Table List Header */}
        <div className="flex items-center justify-between mb-3 pb-1 border-b border-gray-100 shrink-0 px-1">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            {selectedTables.size > 1 ? `${selectedTables.size} Selected` : 'Tables'}
          </h3>
          <div className="flex items-center gap-1">
            {onRefreshTables && (
              <button
                data-testid="btn-refresh-tables"
                onClick={onRefreshTables}
                className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="Refresh Tables"
              >
                <RefreshCw size={12} />
              </button>
            )}
            {selectedTables.size > 1 && (
              <button
                onClick={() => {
                  if (
                    window.confirm(`Are you sure you want to delete ${selectedTables.size} tables?`)
                  ) {
                    const tablesToDelete = Array.from(selectedTables).map((key) => {
                      const [schema, name] = key.split('.');
                      return { schema, name };
                    });
                    // We need to handle multiple deletions. For now, we'll call onDeleteTable multiple times or pass the array.
                    // Based on the updated props, it accepts string | string[].
                    onDeleteTable(
                      currentSchema,
                      Array.from(selectedTables).map((k) => k.split('.')[1])
                    );
                    setSelectedTables(new Set());
                  }
                }}
                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Delete Selected"
              >
                <Trash2 size={12} />
              </button>
            )}
            <button
              data-testid="btn-create-table"
              onClick={onCreateTable}
              className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
              title="Create Table"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        {/* Table List */}
        <div className="space-y-0.5" onMouseLeave={() => {}}>
          {filteredTables.map((table, i) => {
            const tableKey = `${table.table_schema}.${table.table_name}`;
            const isSelected = selectedTables.has(tableKey);
            const isActive =
              activeTable &&
              activeTable.schema === table.table_schema &&
              activeTable.name === table.table_name;
            return (
              <div
                key={i}
                data-testid={`table-item-${table.table_name}`}
                onClick={(e) => handleTableClick(e, table.table_schema, table.table_name)}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-gray-600 cursor-pointer ${isActive ? 'bg-primary-100 text-primary-700' : isSelected ? 'bg-gray-100' : 'hover:bg-primary-50'}`}
              >
                <TableIcon
                  size={14}
                  className={`shrink-0 ${isActive ? 'text-primary-500' : isSelected ? 'text-primary-500' : 'group-hover:text-primary-500 text-gray-400'}`}
                />
                <span
                  className={`truncate text-[13px] flex-1 ${isActive || isSelected ? 'font-bold' : 'font-medium'}`}
                >
                  {table.table_name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTable(table.table_schema, table.table_name);
                  }}
                  className={`p-1 hover:text-red-500 hover:bg-red-100 rounded transition-all opacity-0 group-hover:opacity-100 ${isActive || isSelected ? 'text-red-400' : 'text-gray-400'}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
          {tables.length === 0 && (
            <div className="mt-4 text-center">
              <span className="text-xs text-gray-400 italic block mb-2">No tables in schema</span>
              <button
                onClick={onCreateTable}
                className="text-xs text-primary-600 hover:underline flex items-center justify-center gap-1 w-full"
              >
                <Plus size={12} /> Create Table
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
