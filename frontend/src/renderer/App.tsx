import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { SessionView } from './features/workspace/SessionView'

interface Session {
  id: string
  title: string
}

function App() {
  const [sessions, setSessions] = useState<Session[]>([{ id: crypto.randomUUID(), title: 'New Connection' }])
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0].id)

  const handleAddSession = () => {
    const newSession = { id: crypto.randomUUID(), title: 'New Connection' }
    setSessions([...sessions, newSession])
    setActiveSessionId(newSession.id)
  }

  const handleCloseSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    // 关闭连接
    await window.api.disconnect(id)

    const newSessions = sessions.filter(s => s.id !== id)
    if (newSessions.length === 0) {
       // 如果关掉最后一个，创建一个新的
       const newSession = { id: crypto.randomUUID(), title: 'New Connection' }
       setSessions([newSession])
       setActiveSessionId(newSession.id)
    } else {
      setSessions(newSessions)
      if (activeSessionId === id) {
        // 如果关闭的是当前激活的，切换到最后一个
        setActiveSessionId(newSessions[newSessions.length - 1].id)
      }
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Titlebar / Tab Bar */}
      <div
        className="titlebar h-11 flex items-end bg-[#f3f3f3] border-b border-gray-200 pl-20 pr-4 select-none draggable-region"
      >
         {/* Traffic lights area is padded by pl-20 via CSS or Tailwind if configured, keeping it here for safety */}
         <div className="flex items-end gap-1 overflow-x-auto scrollbar-hide h-full">
            {sessions.map(session => (
              <div
                key={session.id}
                data-testid="session-tab"
                onClick={() => setActiveSessionId(session.id)}
                className={`group flex items-center gap-2 px-4 h-9 text-[11px] font-medium rounded-t-lg cursor-pointer transition-all border-t border-x no-drag ${activeSessionId === session.id ? 'bg-white text-gray-800 border-gray-200 -mb-[1px] z-10 shadow-[0_-1px_3px_rgba(0,0,0,0.02)]' : 'bg-transparent text-gray-500 hover:bg-gray-200/50 border-transparent'}`}
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
           onDoubleClick={() => window.api.toggleMaximize()}
         />

         <div className="h-full flex items-center">
           <button data-testid="add-session-btn" onClick={handleAddSession} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 transition-colors ml-2 no-drag flex-shrink-0">
              <Plus size={14} />
           </button>
         </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-white">
        {sessions.map(session => (
          <SessionView
            key={session.id}
            id={session.id}
            isActive={activeSessionId === session.id}
            onUpdateTitle={(title) => {
              setSessions(prev => prev.map(s => s.id === session.id ? { ...s, title } : s))
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default App