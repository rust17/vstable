import { Database, Table as TableIcon } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useWorkspaceStore } from '../../../stores/useWorkspaceStore';
import { fuzzyMatch } from '../../../utils/fuzzyMatch';

interface TableSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: { table_name: string; table_schema: string }[];
  onSelect: (schema: string, name: string) => void;
}

const HighlightedText = ({
  text,
  matches,
  isSelected,
}: {
  text: string;
  matches: number[];
  isSelected: boolean;
}) => {
  if (!matches || matches.length === 0) return <span>{text}</span>;

  return (
    <span>
      {text.split('').map((char, i) => {
        const isMatch = matches.includes(i);
        return (
          <span
            key={i}
            className={
              isMatch ? (isSelected ? 'text-white font-bold' : 'text-primary-600 font-bold') : ''
            }
          >
            {char}
          </span>
        );
      })}
    </span>
  );
};

export const TableSearchModal: React.FC<TableSearchModalProps> = ({
  isOpen,
  onClose,
  tables,
  onSelect,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const mruTabIds = useWorkspaceStore((state) => state.mruTabIds);
  const tabs = useWorkspaceStore((state) => state.tabs);

  const mruTableIndex = useMemo(() => {
    const map = new Map<string, number>();
    mruTabIds.forEach((id, index) => {
      const tab = tabs.find((t) => t.id === id);
      if (tab && tab.type === 'table') {
        const key = `${tab.schema}.${tab.name}`;
        if (!map.has(key)) {
          map.set(key, index);
        }
      }
    });
    return map;
  }, [mruTabIds, tabs]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!query) {
      const mruTables = tables
        .filter((t) => mruTableIndex.has(`${t.table_schema}.${t.table_name}`))
        .map((t) => ({
          ...t,
          score: 0,
          mruIndex: mruTableIndex.get(`${t.table_schema}.${t.table_name}`)!,
          matches: [] as number[],
        }))
        .sort((a, b) => a.mruIndex - b.mruIndex);

      if (mruTables.length > 0) return mruTables;

      return tables.map((t) => ({
        ...t,
        score: 0,
        mruIndex: Infinity,
        matches: [] as number[],
      }));
    }

    const scored = tables
      .map((t) => {
        const match = fuzzyMatch(query, t.table_name);

        // Optionally fallback to schema matching if table_name doesn't match
        if (!match) {
          const schemaMatch = fuzzyMatch(query, t.table_schema);
          if (schemaMatch) {
            return {
              ...t,
              score: schemaMatch.score - 50, // penalty for matching schema instead of table
              mruIndex: mruTableIndex.has(`${t.table_schema}.${t.table_name}`)
                ? mruTableIndex.get(`${t.table_schema}.${t.table_name}`)!
                : Infinity,
              matches: [] as number[], // don't highlight table name if matched schema
            };
          }
          return null;
        }

        return {
          ...t,
          score: match.score,
          mruIndex: mruTableIndex.has(`${t.table_schema}.${t.table_name}`)
            ? mruTableIndex.get(`${t.table_schema}.${t.table_name}`)!
            : Infinity,
          matches: match.matches,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    return scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.mruIndex - b.mruIndex;
    });
  }, [query, tables, mruTableIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/20 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all">
            <Database size={18} className="text-gray-400" />
            <input
              autoFocus
              placeholder="Search tables..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedIndex(
                    (prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length)
                  );
                } else if (e.key === 'Enter' && filtered[selectedIndex]) {
                  onSelect(
                    filtered[selectedIndex].table_schema,
                    filtered[selectedIndex].table_name
                  );
                } else if (e.key === 'Escape') {
                  onClose();
                }
              }}
            />
          </div>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-2 elastic-scroll">
          {filtered.length > 0 ? (
            filtered.map((t, i) => (
              <div
                key={`${t.table_schema}.${t.table_name}`}
                className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${i === selectedIndex ? 'bg-primary-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                onClick={() => onSelect(t.table_schema, t.table_name)}
              >
                <TableIcon
                  size={16}
                  className={i === selectedIndex ? 'text-primary-200' : 'text-gray-400'}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    <HighlightedText
                      text={t.table_name}
                      matches={t.matches}
                      isSelected={i === selectedIndex}
                    />
                  </span>
                  <span
                    className={`text-[10px] ${i === selectedIndex ? 'text-primary-100' : 'text-gray-400'}`}
                  >
                    {t.table_schema}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-gray-400 text-sm italic">
              No tables found
            </div>
          )}
        </div>
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
          <span>↑↓ to navigate, Enter to open</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
