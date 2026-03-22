import { Database, History, Trash2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { useSession } from '../../stores/useSessionStore';

export const ConnectionForm: React.FC = () => {
  const { config, connect, loading, error, setConfig } = useSession();
  const [savedConnections, setSavedConnections] = useState<any[]>([]);

  useEffect(() => {
    loadSaved();
  }, []);

  const loadSaved = async () => {
    const res = await apiClient.getSavedConnections();
    setSavedConnections(res);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this connection?')) {
      await apiClient.deleteConnection(id);
      loadSaved();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await connect(config);
  };

  return (
    <div className="flex-1 flex bg-white overflow-hidden h-full">
      {/* Sidebar - Saved Connections */}
      <div className="w-64 flex flex-col bg-gray-50 border-r border-gray-200">
        <div className="h-10 px-4 flex items-center gap-2 text-gray-500 font-semibold border-b border-gray-200">
          <History size={14} />
          <span className="text-[11px] uppercase tracking-wider">Saved Connections</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {savedConnections.map((c) => (
            <div
              key={c.id}
              onClick={() => setConfig({ ...c, id: c.id })}
              onDoubleClick={() => connect({ ...c, id: c.id })}
              className={`group px-3 py-2 rounded-md cursor-pointer transition-all border ${config.id === c.id ? 'bg-white border-gray-200 shadow-sm' : 'hover:bg-gray-200/50 border-transparent'}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium truncate ${config.id === c.id ? 'text-primary-600' : 'text-gray-700'}`}
                >
                  {c.name || c.host}
                </span>
                <button
                  onClick={(e) => handleDelete(e, c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="text-[10px] text-gray-400 truncate mt-0.5">
                {c.user}@{c.host}
              </div>
            </div>
          ))}
          {savedConnections.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400 italic">
              No saved connections
            </div>
          )}
        </div>
      </div>

      {/* Main Form Area */}
      <div className="flex-1 flex items-center justify-center bg-white p-12 overflow-y-auto">
        <div className="w-full max-w-sm mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary-50 rounded-xl">
              <Database className="text-primary-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                Connect to {config.dialect === 'mysql' ? 'MySQL' : 'PostgreSQL'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Enter your database server credentials</p>
            </div>
          </div>

          <form data-testid="connection-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 items-baseline">
                <label className="text-[11px] font-semibold text-gray-400 uppercase text-right">
                  Type
                </label>
                <div className="col-span-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, dialect: 'postgres', port: 5432 })}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-all ${config.dialect !== 'mysql' ? 'bg-primary-50 border-primary-200 text-primary-600' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    PostgreSQL
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, dialect: 'mysql', port: 3306 })}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-all ${config.dialect === 'mysql' ? 'bg-primary-50 border-primary-200 text-primary-600' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    MySQL
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 items-baseline">
                <label className="text-[11px] font-semibold text-gray-400 uppercase text-right">
                  Name
                </label>
                <input
                  className="col-span-3 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all placeholder:text-gray-300"
                  placeholder="Local DB"
                  value={config.name || ''}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-4 gap-4 items-baseline">
                <label className="text-[11px] font-semibold text-gray-400 uppercase text-right">
                  Host
                </label>
                <input
                  data-testid="input-host"
                  className="col-span-3 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-4 gap-4 items-baseline">
                <label className="text-[11px] font-semibold text-gray-400 uppercase text-right">
                  Port
                </label>
                <input
                  data-testid="input-port"
                  type="number"
                  className="col-span-3 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) })}
                  required
                />
              </div>
              <div className="grid grid-cols-4 gap-4 items-baseline">
                <label className="text-[11px] font-semibold text-gray-400 uppercase text-right">
                  User
                </label>
                <input
                  data-testid="input-user"
                  className="col-span-3 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                  value={config.user}
                  onChange={(e) => setConfig({ ...config, user: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-4 gap-4 items-baseline">
                <label className="text-[11px] font-semibold text-gray-400 uppercase text-right">
                  Password
                </label>
                <input
                  data-testid="input-password"
                  type="password"
                  className="col-span-3 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                  value={config.password || ''}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 gap-4 items-baseline">
                <label className="text-[11px] font-semibold text-gray-400 uppercase text-right">
                  Database
                </label>
                <input
                  data-testid="input-database"
                  className="col-span-3 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                  value={config.database}
                  onChange={(e) => setConfig({ ...config, database: e.target.value })}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-[11px] rounded border border-red-100">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                data-testid="btn-connect"
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-all shadow-sm active:scale-[0.98]"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
