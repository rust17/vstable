import React, { useState } from 'react'
import { Database, Table as TableIcon, Plus, Trash2, Check } from 'lucide-react'
import { useSession } from '../SessionContext'

interface DatabaseTreeProps {
  databases: string[]
  schemas: string[]
  currentSchema: string
  tables: {table_name: string, table_schema: string}[]
  onSelectSchema: (schema: string) => void
  onSelectTable: (schema: string, name: string) => void
  onSwitchDatabase: (db: string) => void
  onCreateDatabase: () => void
  onDeleteDatabase: (db: string) => void
  onCreateTable: () => void
  onDeleteTable: (schema: string, name: string) => void
}

export const DatabaseTree: React.FC<DatabaseTreeProps> = ({ 
  databases, schemas, currentSchema, tables, 
  onSelectSchema, onSelectTable, onSwitchDatabase, 
  onCreateDatabase, onDeleteDatabase, onCreateTable, onDeleteTable 
}) => {
  const { config } = useSession()
  const [dbListOpen, setDbListOpen] = useState(false)
  const [schemaListOpen, setSchemaListOpen] = useState(false)
  const [tableFilter, setTableFilter] = useState('')

  const filteredTables = tables.filter(table => {
    if (!tableFilter) return true
    try {
      const regex = new RegExp(tableFilter, 'i')
      return regex.test(table.table_name)
    } catch (e) {
      return table.table_name.toLowerCase().includes(tableFilter.toLowerCase())
    }
  })

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Fixed Header (Aligns with Tab Bar) */}
      <div className="shrink-0 h-10 flex items-center px-3 border-b border-gray-200 bg-gray-50">
        <div className="relative flex-1">
          <div 
            onClick={() => setDbListOpen(!dbListOpen)}
            className="flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-200/50 transition-all group"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Database size={14} className="text-blue-500 shrink-0" />
              <span className="text-[13px] font-bold text-gray-700 truncate">{config.database}</span>
            </div>
          </div>
          
          {dbListOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDbListOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[300px]">
                <div className="overflow-y-auto flex-1 py-1">
                  {databases.map(db => (
                    <div 
                      key={db}
                      className={`px-3 py-2 flex items-center justify-between group/item hover:bg-gray-50 cursor-pointer ${db === config.database ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                      onClick={() => {
                        onSwitchDatabase(db)
                        setDbListOpen(false)
                      }}
                    >
                      <span className="text-sm truncate flex-1">{db}</span>
                      {db !== config.database && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteDatabase(db)
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover/item:opacity-100 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      {db === config.database && <Check size={12} className="text-blue-600" />}
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 p-1 bg-gray-50">
                  <button 
                    onClick={() => {
                      onCreateDatabase()
                      setDbListOpen(false)
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100 rounded transition-colors"
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
      <div className="shrink-0 px-3 flex flex-col justify-center gap-2 border-b border-gray-200/60 bg-white h-[94px]">
        {/* Schema Selector */}
        <div className="relative">
          <div 
            onClick={() => setSchemaListOpen(!schemaListOpen)}
            className="flex items-center justify-between px-3 h-[34px] bg-white border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
              <span className="text-xs font-semibold text-gray-500 truncate">{currentSchema}</span>
            </div>
          </div>

          {schemaListOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSchemaListOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[200px] overflow-y-auto py-1">
                {schemas.map(s => (
                  <div 
                    key={s}
                    className={`px-3 py-1.5 text-xs flex items-center justify-between hover:bg-gray-50 cursor-pointer ${s === currentSchema ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-600'}`}
                    onClick={() => {
                      onSelectSchema(s)
                      setSchemaListOpen(false)
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

        {/* Table Filter */}
        {tables.length > 0 && (
          <div className="shrink-0">
            <input
              type="text"
              placeholder="Filter tables..."
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="w-full px-3 h-[34px] text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400/30 bg-white hover:border-gray-300 transition-all"
            />
          </div>
        )}
      </div>

      {/* Scrollable Table List */}
      <div className="flex-1 overflow-y-auto elastic-scroll overscroll-y-auto bg-white p-3 pt-4">
          {/* Table List Header */}
          <div className="flex items-center justify-between mb-3 pb-1 border-b border-gray-100 shrink-0 px-1">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Tables</h3>
            <button 
              onClick={onCreateTable}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Create Table"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Table List */}
          <div className="space-y-0.5">
            {filteredTables.map((table, i) => (
              <div 
                key={i} 
                data-testid={`table-item-${table.table_name}`}
                onClick={() => onSelectTable(table.table_schema, table.table_name)} 
                className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-blue-50 cursor-pointer transition-colors text-gray-600"
              >
                <TableIcon size={14} className="shrink-0 group-hover:text-blue-500 text-gray-400" />
                <span className="truncate text-[13px] flex-1 font-medium">{table.table_name}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteTable(table.table_schema, table.table_name)
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {tables.length === 0 && (
                 <div className="mt-4 text-center">
                    <span className="text-xs text-gray-400 italic block mb-2">No tables in schema</span>
                    <button 
                        onClick={onCreateTable}
                        className="text-xs text-blue-600 hover:underline flex items-center justify-center gap-1 w-full"
                    >
                        <Plus size={12} /> Create Table
                    </button>
                 </div>
            )}
          </div>
        </div>
    </div>
  )
}
