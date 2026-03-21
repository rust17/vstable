import { Plus, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from './api/client';
import { useDraggableSort } from './hooks/useDraggableSort';
import { SessionView } from './layouts/MainLayout';
import type { PersistedSession, PersistedWorkspace } from './types/session';

interface Session {
  id: string;
  title: string;
  initialConfig?: any;
  initialWorkspace?: any;
}

interface SessionsContentProps {
  sessions: Session[];
  activeSessionId: string | null;
  onStateChange: (id: string, state: any) => void;
  onUpdateTitle: (id: string, title: string) => void;
}

const SessionsContent: React.FC<SessionsContentProps> = React.memo(
  ({ sessions, activeSessionId, onStateChange, onUpdateTitle }) => {
    // Sort by ID to maintain stable DOM position regardless of tab order
    const stableSessions = [...sessions].sort((a, b) => a.id.localeCompare(b.id));

    return (
      <div className="flex-1 overflow-hidden relative bg-white">
        {stableSessions.map((session) => (
          <SessionView
            key={session.id}
            id={session.id}
            isActive={activeSessionId === session.id}
            initialConfig={session.initialConfig}
            initialWorkspace={session.initialWorkspace}
            onStateChange={onStateChange}
            onUpdateTitle={onUpdateTitle}
          />
        ))}
      </div>
    );
  }
);

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const { getDragHandlers, getIndicatorClass } = useDraggableSort((dragIdx, dropIdx) => {
    setSessions((prev) => {
      const newSessions = [...prev];
      const [draggedItem] = newSessions.splice(dragIdx, 1);
      newSessions.splice(dropIdx, 0, draggedItem);
      return newSessions;
    });
  });

  // Store the latest state of each session reported by SessionView
  const sessionStatesRef = useRef<Record<string, any>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load workspace on mount
  useEffect(() => {
    const init = async () => {
      try {
        const workspace = await apiClient.getWorkspace();
        const savedConnections = await apiClient.getSavedConnections();

        if (workspace?.sessions && workspace.sessions.length > 0) {
          const loadedSessions: Session[] = workspace.sessions.map((s: PersistedSession) => {
            // Restore password from saved connections if missing
            if (s.config && !s.config.password && !s.config.encryptedPassword) {
              const match = savedConnections.find((c: any) => c.id === s.config!.id);
              if (match?.password) {
                s.config.password = match.password;
              }
            }

            // Restore session state
            sessionStatesRef.current[s.id] = {
              config: s.config,
              tabs: s.tabs,
              activeTabId: s.activeTabId,
              mruTabIds: s.mruTabIds,
            };

            return {
              id: s.id,
              title: s.title,
              initialConfig: s.config,
              initialWorkspace: {
                tabs: s.tabs,
                activeTabId: s.activeTabId,
                mruTabIds: s.mruTabIds,
              },
            };
          });
          setSessions(loadedSessions);
          setActiveSessionId(workspace.activeSessionId || loadedSessions[0].id);
        } else {
          // Default empty state
          const newSessionId = crypto.randomUUID();
          setSessions([{ id: newSessionId, title: 'New Connection' }]);
          setActiveSessionId(newSessionId);
        }
      } catch (err) {
        console.error('Failed to load workspace:', err);
        const newSessionId = crypto.randomUUID();
        setSessions([{ id: newSessionId, title: 'New Connection' }]);
        setActiveSessionId(newSessionId);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const saveWorkspace = useCallback(() => {
    if (isInitializing || !activeSessionId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // Build workspace payload
      const payload: PersistedWorkspace = {
        activeSessionId,
        sessions: sessions.map((s) => {
          const state = sessionStatesRef.current[s.id] || {};
          return {
            id: s.id,
            title: s.title,
            config: state.config,
            tabs: state.tabs || [],
            activeTabId: state.activeTabId || null,
            mruTabIds: state.mruTabIds || [],
          };
        }),
      };

      apiClient.saveWorkspace(payload).catch((err) => {
        console.error('Failed to save workspace:', err);
      });
    }, 1000); // 1s debounce
  }, [sessions, activeSessionId, isInitializing]);

  // Save workspace when active session changes
  useEffect(() => {
    saveWorkspace();
  }, [activeSessionId, saveWorkspace]);

  const handleStateChange = useCallback(
    (id: string, state: any) => {
      sessionStatesRef.current[id] = state;
      saveWorkspace();
    },
    [saveWorkspace]
  );

  const handleUpdateTitle = useCallback(
    (id: string, title: string) => {
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
      saveWorkspace();
    },
    [saveWorkspace]
  );

  const handleAddSession = () => {
    const newSession = { id: crypto.randomUUID(), title: 'New Connection' };
    setSessions([...sessions, newSession]);
    setActiveSessionId(newSession.id);
  };

  const handleCloseSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await apiClient.disconnect(id);

    // Remove from tracked state
    delete sessionStatesRef.current[id];

    const newSessions = sessions.filter((s) => s.id !== id);
    if (newSessions.length === 0) {
      const newSession = { id: crypto.randomUUID(), title: 'New Connection' };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
    } else {
      setSessions(newSessions);
      if (activeSessionId === id) {
        setActiveSessionId(newSessions[newSessions.length - 1].id);
      }
    }
    saveWorkspace();
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-white text-gray-500">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Titlebar / Tab Bar */}
      <div className="titlebar h-11 flex items-end bg-[#f3f3f3] border-b border-gray-200 pl-20 pr-4 select-none draggable-region">
        <div className="flex items-end gap-1 overflow-x-auto scrollbar-hide h-full no-drag">
          {sessions.map((session, index) => (
            <div
              key={session.id}
              {...getDragHandlers(index)}
              data-testid="session-tab"
              onClick={() => setActiveSessionId(session.id)}
              className={`group flex items-center gap-2 px-4 h-9 text-[11px] font-medium rounded-t-lg cursor-pointer transition-all border-t border-x ${activeSessionId === session.id ? 'bg-white text-gray-800 border-gray-200 -mb-[1px] z-10 shadow-[0_-1px_3px_rgba(0,0,0,0.02)]' : 'bg-transparent text-gray-500 hover:bg-gray-200/50 border-transparent'} ${getIndicatorClass(index)}`}
            >
              <span className="max-w-[120px] truncate flex-1">{session.title}</span>
              <button
                data-testid={`close-session-${session.id}`}
                onClick={(e) => handleCloseSession(e, session.id)}
                className={`p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-opacity ${activeSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>

        {/* Empty area for double-click to maximize */}
        <div
          className="flex-1 h-full min-w-[20px]"
          onDoubleClick={() => apiClient.toggleMaximize()}
        />

        <div className="h-full flex items-center">
          <button
            data-testid="add-session-btn"
            onClick={handleAddSession}
            className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 transition-colors ml-2 no-drag flex-shrink-0"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <SessionsContent
        sessions={sessions}
        activeSessionId={activeSessionId}
        onStateChange={handleStateChange}
        onUpdateTitle={handleUpdateTitle}
      />
    </div>
  );
}

export default App;
