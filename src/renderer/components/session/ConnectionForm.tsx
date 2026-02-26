import React, { useState, useEffect } from 'react'
import { Database, History, Trash2 } from 'lucide-react'
import { useSession } from './SessionContext'

export const ConnectionForm: React.FC = () => {
  const { config, connect, loading, error, setConfig } = useSession()
  const [savedConnections, setSavedConnections] = useState<any[]>([])

  useEffect(() => {
    loadSaved()
  }, [])

  const loadSaved = async () => {
    const res = await (window as any).api.getSavedConnections()
    setSavedConnections(res)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('Delete this connection?')) {
      await (window as any).api.deleteConnection(id)
      loadSaved()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await connect(config)
  }

  return (
    <div className="flex-1 flex bg-gray-50/50 p-6 overflow-hidden gap-6">
      {/* Sidebar - Saved Connections */}
      <div className="w-64 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex items-center gap-2 text-gray-700 font-semibold">
          <History size={16} />
          <span className="text-sm">Saved Connections</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {savedConnections.map(c => (
            <div 
              key={c.id} 
              onClick={() => setConfig({ ...c, id: c.id })}
              className={`group p-3 rounded-lg cursor-pointer transition-all border ${config.id === c.id ? 'bg-blue-50 border-blue-100' : 'hover:bg-gray-50 border-transparent'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium truncate ${config.id === c.id ? 'text-blue-700' : 'text-gray-700'}`}>{c.name || c.host}</span>
                <button 
                  onClick={(e) => handleDelete(e, c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="text-[10px] text-gray-400 truncate mt-0.5">{c.user}@{c.host}:{c.port}</div>
            </div>
          ))}
          {savedConnections.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400 italic">No saved connections</div>
          )}
        </div>
      </div>

      {/* Main Form */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <form data-testid="connection-form" onSubmit={handleSubmit} className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <h3 className="text-xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
              <Database className="text-blue-600" /> Connection Settings
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 items-center">
                <label className="text-sm font-medium text-gray-600 col-span-1">Name</label>
                <input className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                  placeholder="e.g. Local Postgres"
                  value={config.name || ''} onChange={e => setConfig({...config, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
                <label className="text-sm font-medium text-gray-600 col-span-1">Host</label>
                <input data-testid="input-host" className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                  value={config.host} onChange={e => setConfig({...config, host: e.target.value})} required />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
                <label className="text-sm font-medium text-gray-600 col-span-1">Port</label>
                <input data-testid="input-port" type="number" className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                  value={config.port} onChange={e => setConfig({...config, port: parseInt(e.target.value)})} required />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
                <label className="text-sm font-medium text-gray-600 col-span-1">User</label>
                <input data-testid="input-user" className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                  value={config.user} onChange={e => setConfig({...config, user: e.target.value})} required />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
                <label className="text-sm font-medium text-gray-600 col-span-1">Password</label>
                <input data-testid="input-password" type="password" className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                  value={config.password || ''} onChange={e => setConfig({...config, password: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 gap-4 items-center">
                <label className="text-sm font-medium text-gray-600 col-span-1">Database</label>
                <input data-testid="input-database" className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                  value={config.database} onChange={e => setConfig({...config, database: e.target.value})} required />
            </div>
          </div>
          {error && <div className="mt-6 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>}
          <button data-testid="btn-connect" type="submit" disabled={loading} className="mt-8 w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
              {loading ? 'Connecting...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  )
}
