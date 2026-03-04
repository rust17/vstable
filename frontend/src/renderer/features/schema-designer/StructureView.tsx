import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, RefreshCw, Save, Database, Trash2, Key, Check, AlertCircle, Search, ChevronDown, Copy, RotateCcw, FileText } from 'lucide-react'
import { useSession } from '../../stores/useSessionStore'
import { useDropdownPosition } from '../../hooks/useDropdownPosition'
import { Capabilities } from '../../types/session'

export interface ColumnDefinition {
  id: string
  name: string
  type: string
  length?: string | number
  precision?: string | number
  scale?: string | number
  nullable: boolean
  defaultValue: any
  isPrimaryKey: boolean
  isAutoIncrement?: boolean
  isIdentity?: boolean
  comment?: string
  pkConstraintName?: string
  isDefaultExpression?: boolean
  enumValues?: string[]
  _original?: any
}

export interface IndexDefinition {
  id: string
  name: string
  columns: string[]
  isUnique: boolean
  _original?: any
}

interface StructureViewProps {
  connectionId: string
  schema: string
  tableName: string
  mode?: 'create' | 'edit'
  onClose: () => void
  onSaveSuccess?: (schema: string, name: string) => void
}

interface ColumnContextMenuProps {
  x: number
  y: number
  column: ColumnDefinition
  onClose: () => void
  onDuplicate: () => void
  onInsertBefore: () => void
  onInsertAfter: () => void
  onReset: () => void
  onCopySql: () => void
  onDelete: () => void
}

const ColumnContextMenu: React.FC<ColumnContextMenuProps> = ({ x, y, column, onClose, onDuplicate, onInsertBefore, onInsertAfter, onReset, onCopySql, onDelete }) => {
  useEffect(() => {
    const handleClick = () => onClose()
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [onClose])

  return (
    <div
      className="fixed z-[500] bg-white border border-gray-200 shadow-xl rounded-lg py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
      style={{ top: y, left: x }}
      onClick={e => e.stopPropagation()}
    >
      <button onClick={() => { onDuplicate(); onClose() }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-primary-50 flex items-center gap-2">
        <Copy size={14} className="text-gray-400" /> Duplicate Column
      </button>
      <button onClick={() => { onInsertBefore(); onClose() }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-primary-50 flex items-center gap-2">
        <Plus size={14} className="text-gray-400" /> Insert Before
      </button>
      <button onClick={() => { onInsertAfter(); onClose() }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-primary-50 flex items-center gap-2">
        <Plus size={14} className="text-gray-400" /> Insert After
      </button>
      {column._original && (
        <button onClick={() => { onReset(); onClose() }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-primary-50 flex items-center gap-2">
            <RotateCcw size={14} className="text-gray-400" /> Reset Changes
        </button>
      )}
      <button onClick={() => { onCopySql(); onClose() }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-primary-50 flex items-center gap-2 border-b border-gray-100 mb-1 pb-2">
        <FileText size={14} className="text-gray-400" /> Copy SQL Definition
      </button>
      <button onClick={() => { onDelete(); onClose() }} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
        <Trash2 size={14} /> Delete Column
      </button>
    </div>
  )
}

const EnumManagerModal: React.FC<{
    values: string[],
    onClose: () => void,
    onSave: (values: string[]) => void
}> = ({ values: initialValues, onClose, onSave }) => {
    const [values, setValues] = useState<string[]>(initialValues.length > 0 ? initialValues : [''])

    return createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-gray-200 flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">Manage Enum Values</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X size={18} className="text-gray-400" /></button>
                </div>
                <div className="p-6 space-y-3 max-h-[60vh] overflow-auto">
                    {values.map((v, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input
                                autoFocus={i === values.length - 1}
                                value={v}
                                onChange={e => {
                                    const newVals = [...values]
                                    newVals[i] = e.target.value
                                    setValues(newVals)
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') setValues([...values, ''])
                                }}
                                placeholder="Value..."
                                className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:border-primary-500 focus:bg-white transition-all"
                            />
                            <button
                                onClick={() => setValues(values.filter((_, idx) => idx !== i))}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => setValues([...values, ''])}
                        className="w-full py-2 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-primary-400 hover:text-primary-500 transition-all flex items-center justify-center gap-1"
                    >
                        <Plus size={14} /> Add Value
                    </button>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button
                        onClick={() => onSave(values.filter(v => v.trim()))}
                        className="px-6 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm transition-colors"
                    >
                        Save Enum
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

const TypeSelector: React.FC<{ value: string; capabilities: Capabilities | null; onChange: (val: string) => void }> = ({ value, capabilities, onChange }) => {
  const [search, setSearch] = useState('')
  const { isOpen, setIsOpen, coords, containerRef, toggleOpen } = useDropdownPosition({
    portalId: 'type-selector-portal',
    menuHeight: 320,
    minWidth: 220
  })

  const groups = capabilities?.typeGroups || []
  const filteredGroups = groups.map(group => ({
    ...group,
    types: group.types.filter(t => t.toLowerCase().includes(search.toLowerCase()))
  })).filter(group => group.types.length > 0)

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={toggleOpen}
        className="w-full flex items-center justify-between gap-1 px-1 py-0.5 bg-transparent border-b border-transparent hover:border-gray-300 text-primary-600 font-mono text-sm transition-colors"
      >
        <span className="truncate">{value || 'Select Type'}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
          id="type-selector-portal"
          className="fixed z-[1000] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          style={{
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
            width: coords.width
          }}
        >
          <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
            <Search size={14} className="text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                  if (e.key === 'Escape') setIsOpen(false)
              }}
              placeholder="Search type..."
              className="w-full bg-transparent border-none outline-none text-xs"
            />
          </div>
          <div className="max-h-64 overflow-auto p-1">
            {filteredGroups.map(group => (
              <div key={group.label} className="mb-2">
                <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{group.label}</div>
                <div className="grid grid-cols-1">
                  {group.types.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        onChange(type)
                        setIsOpen(false)
                        setSearch('')
                      }}
                      className={`px-3 py-1.5 text-left text-xs hover:bg-primary-50 transition-colors rounded ${value === type ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <div className="p-4 text-center text-gray-400 text-xs italic">No types found</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const ColumnMultiSelect: React.FC<{
  allColumns: string[];
  selectedColumns: string[];
  onChange: (cols: string[]) => void
}> = ({ allColumns, selectedColumns, onChange }) => {
  const { isOpen, coords, containerRef, toggleOpen } = useDropdownPosition({
    portalId: 'multi-select-portal',
    menuHeight: 200
  })

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={toggleOpen}
        className="min-h-[28px] w-full px-2 py-1 bg-gray-100/50 border border-transparent rounded hover:bg-gray-100 cursor-pointer flex flex-wrap gap-1 items-center"
      >
        {selectedColumns.length > 0 ? selectedColumns.map(c => (
          <span key={c} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium flex items-center gap-1">
            {c}
            <X
              size={10}
              className="hover:text-purple-900"
              onClick={(e) => {
                e.stopPropagation()
                onChange(selectedColumns.filter(sc => sc !== c))
              }}
            />
          </span>
        )) : <span className="text-gray-400 text-xs">Select columns...</span>}
      </div>

      {isOpen && createPortal(
        <div
            id="multi-select-portal"
            className="fixed z-[1000] bg-white border border-gray-200 rounded-lg shadow-xl py-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
            style={{
                top: coords.top,
                bottom: coords.bottom,
                left: coords.left,
                width: coords.width,
                minWidth: '200px'
            }}
        >
          {allColumns.map(col => (
            <div
              key={col}
              onClick={() => {
                if (selectedColumns.includes(col)) {
                  onChange(selectedColumns.filter(c => c !== col))
                } else {
                  onChange([...selectedColumns, col])
                }
              }}
              className="px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedColumns.includes(col)}
                readOnly
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs text-gray-700">{col}</span>
            </div>
          ))}
          {allColumns.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400 italic text-center">No columns available</div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

export const StructureView: React.FC<StructureViewProps> = ({ connectionId, schema: initialSchema, tableName: initialTableName, mode = 'edit', onClose, onSaveSuccess }) => {
  const { config, capabilities, buildQuery } = useSession()

  const [columns, setColumns] = useState<ColumnDefinition[]>([])
  const [indexes, setIndexes] = useState<IndexDefinition[]>([])
  const [deletedColumns, setDeletedColumns] = useState<ColumnDefinition[]>([])
  const [deletedIndexes, setDeletedIndexes] = useState<IndexDefinition[]>([])

  const [newTableName, setNewTableName] = useState(initialTableName || '')
  const [newSchema, setNewSchema] = useState(initialSchema || (capabilities?.supportsSchemas ? 'public' : config.database))
  const [availableSchemas, setAvailableSchemas] = useState<string[]>([])

  const [loading, setLoading] = useState(mode === 'edit')
  const [error, setError] = useState<string | null>(null)
  const [sqlPreview, setSqlPreview] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState<string>('Preview SQL')
  const [showExecuteInPreview, setShowExecuteInPreview] = useState<boolean>(true)
  const [executing, setExecuting] = useState(false)

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, colId: string } | null>(null)
  const [enumEditingColId, setEnumEditingColId] = useState<string | null>(null)

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const fetchStructure = async () => {
    if (!capabilities) return

    if (mode === 'create') {
        try {
            const sql = buildQuery(capabilities.supportsSchemas ? 'listSchemas' : 'listDatabases', {})
            const res = await (window as any).api.query(connectionId, sql)
            if (res.success && res.rows) {
                setAvailableSchemas(res.rows.map((r: any) => Object.values(r)[0]))
            }
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
        setColumns([{
            id: crypto.randomUUID(),
            name: 'id',
            type: capabilities.dialect === 'mysql' ? 'int' : 'serial',
            nullable: false,
            defaultValue: null,
            isPrimaryKey: true,
            isAutoIncrement: true
        }])
        return
    }

    setLoading(true)
    setError(null)
    setDeletedColumns([])
    setDeletedIndexes([])
    try {
      const colSql = buildQuery('listColumns', { db: config.database, schema: initialSchema, table: initialTableName })
      const colRes = await (window as any).api.query(connectionId, colSql)

      if (!colRes.success) throw new Error(colRes.error)

      const cols = colRes.rows.map((row: any) => {
        let isAuto, isPk, isId, pkConstraintName, comment, length, precision, scale, type, name, nullable, defaultValue

        if (capabilities.dialect === 'mysql') {
          name = row.COLUMN_NAME || row.column_name
          type = row.DATA_TYPE || row.data_type
          nullable = (row.IS_NULLABLE || row.is_nullable) === 'YES'
          defaultValue = row.COLUMN_DEFAULT || row.column_default
          isAuto = (row.EXTRA || row.extra)?.includes('auto_increment')
          isPk = (row.COLUMN_KEY || row.column_key) === 'PRI'
          isId = false
          pkConstraintName = isPk ? 'PRIMARY' : undefined
          comment = row.comment || row.COLUMN_COMMENT || row.column_comment || ''
          length = row.CHARACTER_MAXIMUM_LENGTH || row.character_maximum_length
          precision = row.NUMERIC_PRECISION || row.numeric_precision
          scale = row.NUMERIC_SCALE || row.numeric_scale
        } else {
          name = row.column_name
          type = row.data_type
          nullable = row.is_nullable === 'YES'
          defaultValue = row.column_default
          isAuto = row.column_default?.includes('nextval')
          isPk = !!row.pk_constraint_name
          isId = row.is_identity === 'YES'
          pkConstraintName = row.pk_constraint_name
          comment = row.comment || row.column_comment || ''
          length = row.character_maximum_length
          precision = row.numeric_precision
          scale = row.numeric_scale
        }

        return {
          id: crypto.randomUUID(),
          name, type, length, precision, scale, nullable, defaultValue,
          isPrimaryKey: isPk,
          isAutoIncrement: isAuto,
          isIdentity: isId,
          comment,
          pkConstraintName,
          _original: {
            name, type, length, precision, scale, nullable, defaultValue,
            isPrimaryKey: isPk,
            isAutoIncrement: isAuto,
            isIdentity: isId,
            comment,
            pkConstraintName
          }
        } as ColumnDefinition
      })

      setColumns(cols)

      const idxSql = buildQuery('listIndexes', { db: config.database, schema: initialSchema, table: initialTableName })
      const idxRes = await (window as any).api.query(connectionId, idxSql)

      if (idxRes.success) {
        let idxs = []
        if (capabilities.dialect === 'mysql') {
          const groups: Record<string, any> = {}
          idxRes.rows.forEach((row: any) => {
            const name = row.Key_name || row.key_name
            if (!groups[name]) {
              groups[name] = {
                id: crypto.randomUUID(),
                name,
                columns: [],
                isUnique: (row.Non_unique || row.non_unique) === 0 || (row.Non_unique || row.non_unique) === '0',
                _original: {
                   name,
                   columns: [],
                   isUnique: (row.Non_unique || row.non_unique) === 0 || (row.Non_unique || row.non_unique) === '0'
                }
              }
            }
            const colName = row.Column_name || row.column_name
            groups[name].columns.push(colName)
            groups[name]._original.columns.push(colName)
          })
          idxs = Object.values(groups).filter(idx => idx.name !== 'PRIMARY')
        } else {
          idxs = idxRes.rows.map((row: any) => {
            let cols: string[] = []
            if (Array.isArray(row.column_names)) {
              cols = row.column_names
            } else if (typeof row.column_names === 'string') {
              cols = row.column_names.replace(/^\{|\}$/g, '').split(',').map((s: string) => s.trim().replace(/^"|"$/g, '')).filter(Boolean)
            }

            return {
              id: crypto.randomUUID(),
              name: row.index_name,
              columns: cols,
              isUnique: row.is_unique,
              _original: {
                name: row.index_name,
                columns: [...cols],
                isUnique: row.is_unique
              }
            }
          })
        }
        setIndexes(idxs as IndexDefinition[])
      } else {
        setIndexes([])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStructure()
  }, [connectionId, initialSchema, initialTableName, mode, capabilities])

  const handleAddColumn = () => {
    const newCol: ColumnDefinition = {
      id: crypto.randomUUID(),
      name: `new_column_${columns.length + 1}`,
      type: capabilities?.dialect === 'mysql' ? 'varchar' : 'varchar',
      nullable: true,
      defaultValue: null,
      isPrimaryKey: false
    }
    setColumns([...columns, newCol])
  }

  const handleDeleteColumnWithTracking = (id: string) => {
    const col = columns.find(c => c.id === id)
    if (!col) return
    if (col._original) {
      setDeletedColumns([...deletedColumns, col])
    }
    setColumns(columns.filter(c => c.id !== id))
  }

  const handleColumnChange = (id: string, field: keyof ColumnDefinition, value: any) => {
    const col = columns.find(c => c.id === id)
    if (field === 'name' && col) {
      const oldName = col.name
      const newName = value
      setIndexes(prev => prev.map(idx => ({
        ...idx,
        columns: idx.columns.map(c => c === oldName ? newName : c)
      })))
    }
    setColumns(columns.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const handleDuplicateColumn = (id: string) => {
    const col = columns.find(c => c.id === id)
    if (!col) return
    const { id: _, _original, ...rest } = col
    setColumns([...columns, {
      ...rest,
      id: crypto.randomUUID(),
      name: `${col.name}_copy`
    } as any])
  }

  const handleInsertColumn = (id: string, position: 'before' | 'after') => {
    const index = columns.findIndex(c => c.id === id)
    if (index === -1) return

    const newCol: ColumnDefinition = {
        id: crypto.randomUUID(),
        name: `new_column_${columns.length + 1}`,
        type: capabilities?.dialect === 'mysql' ? 'varchar' : 'varchar',
        nullable: true,
        defaultValue: null,
        isPrimaryKey: false
    }

    const newColumns = [...columns]
    newColumns.splice(position === 'before' ? index : index + 1, 0, newCol)
    setColumns(newColumns)
  }

  const handleResetColumn = (id: string) => {
    setColumns(columns.map(c => {
      if (c.id === id && c._original) {
        return { ...c, ...c._original }
      }
      return c
    }))
  }

  const handleCopyColumnSql = (id: string) => {
    const col = columns.find(c => c.id === id)
    if (!col || !capabilities) return
    const quote = capabilities.quoteChar
    const sql = `ALTER TABLE ${quote}${initialSchema}${quote}.${quote}${initialTableName}${quote} ADD COLUMN ${quote}${col.name}${quote} ${col.type};`
    navigator.clipboard.writeText(sql)
  }

  const getColumnError = (col: ColumnDefinition) => {
    if (!col.name.trim()) return 'Column name is required'
    if (columns.filter(c => c.name === col.name).length > 1) return 'Duplicate column name'
    if (/^[0-9]/.test(col.name)) return 'Column name cannot start with a number'
    if (/[^a-zA-Z0-9_]/.test(col.name)) return 'Column name contains illegal characters'

    const reserved = ['select', 'table', 'insert', 'update', 'delete', 'from', 'where', 'order', 'group', 'user']
    if (reserved.includes(col.name.toLowerCase())) return 'Reserved SQL keyword'

    return null
  }

  const handleAddIndex = () => {
    setIndexes([...indexes, {
      id: crypto.randomUUID(),
      name: `idx_${mode === 'create' ? newTableName : initialTableName}_${indexes.length + 1}`,
      columns: [],
      isUnique: false
    }])
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (mode !== 'create' && capabilities?.dialect !== 'mysql') return
    setDraggedIdx(index)
    e.dataTransfer.effectAllowed = 'move'
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '0.4'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIdx(null)
    setDragOverIdx(null)
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (mode !== 'create' && capabilities?.dialect !== 'mysql') return
    e.preventDefault()
    setDragOverIdx(index)
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    if ((mode !== 'create' && capabilities?.dialect !== 'mysql') || draggedIdx === null) return
    e.preventDefault()

    const newCols = [...columns]
    const [draggedItem] = newCols.splice(draggedIdx, 1)
    newCols.splice(index, 0, draggedItem)

    setColumns(newCols)
    setDraggedIdx(null)
    setDragOverIdx(null)
  }

  const handleDeleteIndexWithTracking = (id: string) => {
    const idx = indexes.find(i => i.id === id)
    if (!idx) return
    if (idx._original) {
      setDeletedIndexes([...deletedIndexes, idx])
    }
    setIndexes(indexes.filter(i => i.id !== id))
  }

  const handlePreviewSql = async (type: 'diff' | 'create' = 'diff') => {
      if (!capabilities) return

      try {
        let sqls: string[] = []
        if (type === 'create' || mode === 'create') {
            const tableName = mode === 'create' ? newTableName : initialTableName
            const schema = mode === 'create' ? newSchema : initialSchema
            if (!tableName.trim()) return
            setPreviewTitle(mode === 'create' ? 'Preview SQL' : 'Create Syntax')
            setShowExecuteInPreview(mode === 'create')
            sqls = await (window as any).api.generateCreateSql({
              dialect: capabilities.dialect,
              schema: schema,
              tableName: tableName,
              columns,
              indexes
            })
        } else {
            setPreviewTitle('Preview Changes')
            setShowExecuteInPreview(true)
            sqls = await (window as any).api.generateAlterSql({
              dialect: capabilities.dialect,
              schema: initialSchema,
              tableName: initialTableName,
              oldTableName: initialTableName,
              columns,
              indexes,
              deletedColumns,
              deletedIndexes
            })
        }

        if (sqls.length === 0) {
            setSqlPreview('-- No changes detected --')
        } else {
            setSqlPreview(sqls.join('\n'))
        }
      } catch (err: any) {
        setError('Failed to generate SQL: ' + err.message)
      }
  }

  const executeChanges = async () => {
      if (!capabilities) return
      setExecuting(true)

      try {
          let sqls: string[] = []
          if (mode === 'create') {
              if (!newTableName.trim()) {
                setExecuting(false)
                return
              }
              sqls = await (window as any).api.generateCreateSql({
                dialect: capabilities.dialect,
                schema: newSchema,
                tableName: newTableName,
                columns,
                indexes
              })
          } else {
              sqls = await (window as any).api.generateAlterSql({
                dialect: capabilities.dialect,
                schema: initialSchema,
                tableName: initialTableName,
                oldTableName: initialTableName,
                columns,
                indexes,
                deletedColumns,
                deletedIndexes
              })
          }

          if (sqls.length === 0) {
            setExecuting(false)
            return
          }

          for (const sql of sqls) {
              const res = await (window as any).api.query(connectionId, sql)
              if (!res.success) throw new Error(res.error)
          }
          setSqlPreview(null)
          if (mode === 'create') {
              if (onSaveSuccess) onSaveSuccess(newSchema, newTableName)
              onClose()
          } else {
             await fetchStructure()
          }
      } catch (e: any) {
          setError(e.message)
          setSqlPreview(null)
      } finally {
          setExecuting(false)
      }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white">
        <RefreshCw size={24} className="animate-spin mb-2" />
        <span className="text-xs">Loading structure...</span>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-white select-text">
      <div className="flex items-center justify-between px-6 h-[94px] bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            {mode === 'create' ? (
                <div className="flex items-center gap-2">
                    <select
                        value={newSchema}
                        onChange={e => setNewSchema(e.target.value)}
                        className="text-xs font-normal text-gray-500 bg-gray-100 border-none rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary-500"
                    >
                        {availableSchemas.length > 0 ? availableSchemas.map(s => (
                            <option key={s} value={s}>{s}</option>
                        )) : <option value={capabilities?.supportsSchemas ? 'public' : config.database}>{capabilities?.supportsSchemas ? 'public' : config.database}</option>}
                    </select>
                    <span className="text-gray-300">/</span>
                    <input
                        autoFocus
                        data-testid="input-table-name"
                        placeholder="New Table Name"
                        value={newTableName}
                        onChange={e => setNewTableName(e.target.value)}
                        className="text-lg font-bold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-primary-500 outline-none bg-transparent placeholder:text-gray-300 transition-all"
                    />
                </div>
            ) : (
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {initialTableName}
                <span className="text-xs font-normal text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">{initialSchema}</span>
                </h2>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {mode === 'edit' && (
             <button onClick={fetchStructure} className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Refresh">
               <RefreshCw size={18} />
             </button>
          )}
          {mode === 'edit' && (
            <button
              data-testid="btn-show-create-sql"
              onClick={() => handlePreviewSql('create')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              title="Show Full CREATE Statement"
            >
              <Database size={16} /> Create Syntax
            </button>
          )}
          <button data-testid="btn-save-structure" onClick={() => handlePreviewSql('diff')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 shadow-sm transition-all">
            <Save size={16} /> {mode === 'create' ? 'Create Table' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-8 elastic-scroll">
        {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div className="text-sm font-medium whitespace-pre-wrap">{error}</div>
                <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-700"><X size={14} /></button>
            </div>
        )}

        <div className="border-b border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#f8f9fa] select-text">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-4 bg-primary-500 rounded-full"></div>
                Columns
            </h3>
            <button data-testid="btn-add-column" onClick={handleAddColumn} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-600 rounded hover:bg-primary-100 font-medium transition-colors">
                <Plus size={14} /> Add Column
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-gray-500 font-medium border-b border-gray-100 select-text">
                <tr>
                  <th className="px-6 py-3 w-12 text-[11px] uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 min-w-[200px] text-[11px] uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-[11px] uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 w-32 text-[11px] uppercase tracking-wider">Params</th>
                  <th className="px-6 py-3 w-20 text-center text-[11px] uppercase tracking-wider">Auto</th>
                  <th className="px-6 py-3 w-20 text-center text-[11px] uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 w-24 text-center text-[11px] uppercase tracking-wider">Nullable</th>
                  <th className="px-6 py-3 w-24 text-center text-[11px] uppercase tracking-wider">Primary</th>
                  <th className="px-6 py-3 text-[11px] uppercase tracking-wider">Default</th>
                  <th className="px-6 py-3 text-[11px] uppercase tracking-wider">Comment</th>
                  <th className="px-6 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {columns.map((col, idx) => {
                  if (!col.type) return null
                  const typeLower = col.type.toLowerCase()
                  const hasLength = typeLower.includes('char') || typeLower.includes('varchar') || typeLower.includes('bit') || typeLower.includes('varbit')
                  const hasPrecision = typeLower.includes('numeric') || typeLower.includes('decimal') || typeLower.includes('timestamp') || typeLower.includes('time')
                  const canAutoInc = typeLower.includes('int') || typeLower.includes('serial')

                  const isDraggable = mode === 'create' || capabilities?.dialect === 'mysql'

                  return (
                    <tr
                      key={col.id}
                      draggable={isDraggable}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={`group hover:bg-primary-50/30 transition-all ${dragOverIdx === idx ? 'border-t-2 border-primary-500' : ''} ${draggedIdx === idx ? 'bg-gray-100' : ''}`}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setContextMenu({ x: e.clientX, y: e.clientY, colId: col.id })
                      }}
                    >
                      <td className="px-6 py-3">
                        <div className={`text-gray-400 text-sm font-mono flex items-center gap-2 ${isDraggable ? 'cursor-move' : ''}`}>
                          {isDraggable && <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><div className="w-3 h-0.5 bg-gray-300"></div><div className="w-3 h-0.5 bg-gray-300"></div><div className="w-3 h-0.5 bg-gray-300"></div></div>}
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                          <div className="relative flex items-center">
                            <input
                                value={col.name}
                                data-testid="input-column-name"
                                onChange={e => handleColumnChange(col.id, 'name', e.target.value)}
                                className={`w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none px-1 py-0.5 transition-colors font-medium ${getColumnError(col) ? 'text-red-600' : 'text-gray-700'}`}
                            />
                            {getColumnError(col) && (
                                <div className="absolute left-0 -bottom-4 text-[9px] text-red-500 whitespace-nowrap bg-white px-1 shadow-sm rounded border border-red-100 flex items-center gap-1 z-10 animate-in fade-in slide-in-from-top-1">
                                    <AlertCircle size={8} /> {getColumnError(col)}
                                </div>
                            )}
                          </div>
                      </td>
                      <td className="px-6 py-3">
                           <div className="flex items-center gap-1">
                                <TypeSelector
                                    value={col.type}
                                    capabilities={capabilities}
                                    onChange={val => {
                                        handleColumnChange(col.id, 'type', val)
                                        if (val === 'enum') setEnumEditingColId(col.id)
                                    }}
                                />
                                {col.type === 'enum' && (
                                    <button
                                        onClick={() => setEnumEditingColId(col.id)}
                                        className="p-1 text-gray-400 hover:text-primary-500 transition-colors"
                                        title="Manage Enum Values"
                                    >
                                        <Plus size={12} />
                                    </button>
                                )}
                           </div>
                      </td>
                      <td className="px-6 py-3">
                          <div className="flex items-center gap-1">
                              {hasLength && (
                                  <input
                                      type="text"
                                      placeholder="Len"
                                      value={col.length || ''}
                                      onChange={e => handleColumnChange(col.id, 'length', e.target.value)}
                                      className="w-12 bg-gray-100/50 border border-transparent rounded px-1 py-0.5 text-[10px] focus:bg-white focus:border-primary-300 outline-none"
                                      title="Length"
                                  />
                              )}
                              {hasPrecision && (
                                  <>
                                      <input
                                          type="text"
                                          placeholder="Prec"
                                          value={col.precision || ''}
                                          onChange={e => handleColumnChange(col.id, 'precision', e.target.value)}
                                          className="w-10 bg-gray-100/50 border border-transparent rounded px-1 py-0.5 text-[10px] focus:bg-white focus:border-primary-300 outline-none"
                                          title="Precision"
                                      />
                                      {(typeLower.includes('numeric') || typeLower.includes('decimal')) && (
                                          <input
                                              type="text"
                                              placeholder="Scale"
                                              value={col.scale || ''}
                                              onChange={e => handleColumnChange(col.id, 'scale', e.target.value)}
                                              className="w-10 bg-gray-100/50 border border-transparent rounded px-1 py-0.5 text-[10px] focus:bg-white focus:border-primary-300 outline-none"
                                              title="Scale"
                                          />
                                      )}
                                  </>
                              )}
                          </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                          {canAutoInc && (
                              <input
                                  type="checkbox"
                                  checked={col.isAutoIncrement}
                                  onChange={e => handleColumnChange(col.id, 'isAutoIncrement', e.target.checked)}
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                              />
                          )}
                      </td>
                      <td className="px-6 py-3 text-center">
                          {canAutoInc && (
                              <input
                                  type="checkbox"
                                  checked={col.isIdentity}
                                  onChange={e => handleColumnChange(col.id, 'isIdentity', e.target.checked)}
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                  title="GENERATED BY DEFAULT AS IDENTITY"
                              />
                          )}
                      </td>
                      <td className="px-6 py-3 text-center">
                          <input
                              type="checkbox"
                              checked={col.nullable}
                              onChange={e => handleColumnChange(col.id, 'nullable', e.target.checked)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                          />
                      </td>
                      <td className="px-6 py-3 text-center">
                          <div
                              onClick={() => handleColumnChange(col.id, 'isPrimaryKey', !col.isPrimaryKey)}
                              className={`flex justify-center cursor-pointer transition-colors ${col.isPrimaryKey ? 'text-amber-500' : 'text-gray-200 hover:text-gray-400'}`}
                          >
                              <Key size={14} fill={col.isPrimaryKey ? "currentColor" : "none"} />
                          </div>
                      </td>
                    <td className="px-6 py-3">
                        <div className="flex items-center gap-1 group/def">
                            {col.defaultValue !== null ? (
                                <div className="flex flex-1 items-center bg-gray-100/50 border border-gray-200 rounded px-1 transition-all focus-within:border-primary-300 focus-within:bg-white">
                                    <input
                                        value={col.defaultValue}
                                        onChange={e => handleColumnChange(col.id, 'defaultValue', e.target.value)}
                                        placeholder="Value..."
                                        className={`flex-1 bg-transparent border-none outline-none py-0.5 text-sm font-mono ${col.isDefaultExpression ? 'text-purple-600' : 'text-gray-700'}`}
                                        title={col.isDefaultExpression ? 'SQL Expression' : 'Literal Value'}
                                    />
                                    <button
                                        onClick={() => handleColumnChange(col.id, 'isDefaultExpression', !col.isDefaultExpression)}
                                        className={`px-1 text-[9px] font-bold rounded transition-colors ${col.isDefaultExpression ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                                        title="Toggle Expression/Literal"
                                    >
                                        {col.isDefaultExpression ? 'EXP' : 'TXT'}
                                    </button>
                                    <button
                                        onClick={() => handleColumnChange(col.id, 'defaultValue', null)}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Set to NULL"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleColumnChange(col.id, 'defaultValue', '')}
                                    className="text-[10px] text-gray-400 italic hover:text-primary-500 transition-colors px-2 py-1 border border-dashed border-gray-200 rounded w-full text-left"
                                >
                                    NULL (Click to set)
                                </button>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-3">
                        <div className="flex items-center">
                            <input
                                value={col.comment || ''}
                                onChange={e => handleColumnChange(col.id, 'comment', e.target.value)}
                                placeholder="Comment..."
                                className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none px-1 py-0.5 transition-colors text-sm text-gray-500"
                            />
                        </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                        <button
                            data-testid={`delete-column-${col.name}`}
                            onClick={() => handleDeleteColumnWithTracking(col.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    </td>
                  </tr>
                )
              })}
              </tbody>
            </table>
          </div>
          {columns.length === 0 && (
              <div className="p-8 text-center text-gray-400 italic text-sm bg-gray-50/50">
                  No columns defined. Click "Add Column" to start.
              </div>
          )}
        </div>

        <div className="bg-white border-b border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#f8f9fa] select-text">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                Indexes
            </h3>
            <button data-testid="btn-add-index" onClick={handleAddIndex} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 font-medium transition-colors">
                <Plus size={14} /> Add Index
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-gray-500 font-medium border-b border-gray-100 select-text">
                <tr>
                  <th className="px-6 py-3 w-12 text-[11px] uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-[11px] uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-[11px] uppercase tracking-wider">Columns</th>
                  <th className="px-6 py-3 w-24 text-center text-[11px] uppercase tracking-wider">Unique</th>
                  <th className="px-6 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {indexes.map((idx, i) => (
                  <tr key={idx.id} className="group hover:bg-purple-50/30 transition-colors">
                    <td className="px-6 py-3 text-gray-400 text-xs font-mono">{i + 1}</td>
                    <td className="px-6 py-3">
                        <input
                            data-testid={`index-name-${i}`}
                            value={idx.name}
                            onChange={e => {
                                const newIndexes = [...indexes]
                                newIndexes[i].name = e.target.value
                                setIndexes(newIndexes)
                            }}
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none px-1 py-0.5 transition-colors font-medium text-gray-700"
                        />
                    </td>
                    <td className="px-6 py-3">
                         <ColumnMultiSelect
                            allColumns={columns.map(c => c.name).filter(Boolean)}
                            selectedColumns={Array.isArray(idx.columns) ? idx.columns : []}
                            onChange={(cols) => {
                                const newIndexes = [...indexes]
                                newIndexes[i].columns = cols
                                setIndexes(newIndexes)
                            }}
                         />
                    </td>
                    <td className="px-6 py-3 text-center">
                        <input
                            data-testid={`index-unique-${i}`}
                            type="checkbox"
                            checked={idx.isUnique}
                            onChange={e => {
                                const newIndexes = [...indexes]
                                newIndexes[i].isUnique = e.target.checked
                                setIndexes(newIndexes)
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                    </td>
                    <td className="px-6 py-3 text-right">
                        <button
                            data-testid={`delete-index-${idx.name}`}
                            onClick={() => handleDeleteIndexWithTracking(idx.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {indexes.length === 0 && (
              <div className="p-8 text-center text-gray-400 italic text-sm bg-gray-50/50">
                  No indexes defined.
              </div>
          )}
        </div>
        <div className="h-20 shrink-0" />
      </div>

      {sqlPreview && createPortal(
          <div
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
            onClick={() => setSqlPreview(null)}
          >
              <div
                className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl border border-gray-200 flex flex-col m-4 animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                      <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Database size={16} className="text-primary-500" /> {previewTitle}</h3>
                      <button onClick={() => setSqlPreview(null)} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X size={18} className="text-gray-400" /></button>
                  </div>
                  <div className="p-0 flex-1 bg-gray-50 overflow-hidden">
                      <textarea
                        readOnly
                        className="w-full h-full p-6 font-mono text-xs text-gray-700 bg-transparent outline-none resize-none overflow-auto whitespace-pre select-text cursor-text leading-relaxed"
                        value={sqlPreview}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                                e.stopPropagation();
                                e.currentTarget.select();
                            }
                        }}
                      />
                  </div>
                  <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-xl">
                      <button onClick={() => setSqlPreview(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Close</button>
                      {showExecuteInPreview && sqlPreview !== '-- No changes detected --' && (
                        <button data-testid="btn-execute-sql" onClick={executeChanges} className="px-6 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm transition-colors flex items-center gap-2">
                            {executing ? 'Executing...' : 'Execute'}
                        </button>
                      )}
                  </div>
              </div>
          </div>,
          document.body
      )}

      {contextMenu && (
        <ColumnContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          column={columns.find(c => c.id === contextMenu.colId)!}
          onClose={() => setContextMenu(null)}
          onDuplicate={() => handleDuplicateColumn(contextMenu.colId)}
          onInsertBefore={() => handleInsertColumn(contextMenu.colId, 'before')}
          onInsertAfter={() => handleInsertColumn(contextMenu.colId, 'after')}
          onReset={() => handleResetColumn(contextMenu.colId)}
          onCopySql={() => handleCopyColumnSql(contextMenu.colId)}
          onDelete={() => handleDeleteColumnWithTracking(contextMenu.colId)}
        />
      )}

      {enumEditingColId && (
          <EnumManagerModal
            values={columns.find(c => c.id === enumEditingColId)?.enumValues || []}
            onClose={() => setEnumEditingColId(null)}
            onSave={(vals) => {
                handleColumnChange(enumEditingColId, 'enumValues', vals)
                setEnumEditingColId(null)
            }}
          />
      )}
    </div>
  )
}
