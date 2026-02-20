import React, { useState } from 'react'
import { Database } from 'lucide-react'
import { useSession } from './SessionContext'

export const ConnectionForm: React.FC = () => {
  const { config, connect, loading, error, setConfig } = useSession()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await connect(config)
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50/50 p-6 overflow-y-auto">
      <form data-testid="connection-form" onSubmit={handleSubmit} className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <h3 className="text-xl font-semibold mb-6 text-gray-800 flex items-center gap-2">
            <Database className="text-blue-600" /> Connection Settings
        </h3>
        <div className="space-y-4">
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
  )
}
