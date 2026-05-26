import React, { useEffect, useState, useRef } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;
  message: string;
  data?: Record<string, any>;
}

interface LogsPageProps {
  onBack: () => void;
}

export const LogsPage: React.FC<LogsPageProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [logDir, setLogDir] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.getLogs) {
        const entries = await electronAPI.getLogs(1000);
        setLogs(entries);
      }
      if (electronAPI?.getLogDir) {
        const dir = await electronAPI.getLogDir();
        setLogDir(dir);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Poll for new logs every 3 seconds
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(entry => {
    const matchesLevel = filterLevel === 'ALL' || entry.level === filterLevel;
    const matchesSearch = searchQuery === '' || 
      entry.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.component.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600';
      case 'WARN': return 'text-amber-600';
      case 'INFO': return 'text-primary';
      case 'DEBUG': return 'text-secondary';
      default: return 'text-primary';
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'ERROR': return 'bg-red-50 border-l-2 border-l-red-500';
      case 'WARN': return 'bg-amber-50 border-l-2 border-l-amber-500';
      default: return '';
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
    } catch {
      return ts;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-surface-container-lowest">
      {/* Header */}
      <header className="flex justify-between items-center px-lg h-16 w-full border-b border-primary bg-surface flex-shrink-0 z-10">
        <div className="font-headline-md text-headline-md font-bold text-primary uppercase tracking-tight flex items-center gap-sm">
          <button 
            onClick={onBack}
            className="p-xs hover:bg-primary hover:text-on-primary border border-transparent hover:border-primary transition-colors cursor-pointer mr-sm flex items-center"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          SYSTEM_LOGS (REAL-TIME)
        </div>
        <div className="flex items-center gap-sm">
          <button
            onClick={fetchLogs}
            className="p-xs px-md text-secondary hover:bg-primary hover:text-on-primary border border-primary transition-all cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span className="font-label-sm text-[10px] uppercase">REFRESH</span>
          </button>
          <label className="flex items-center gap-1 cursor-pointer">
            <input 
              type="checkbox" 
              checked={autoScroll} 
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="custom-checkbox"
            />
            <span className="font-label-sm text-[10px] uppercase text-secondary">AUTO-SCROLL</span>
          </label>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="flex border-b border-primary bg-surface-container flex-shrink-0 flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-primary">
        <div className="flex-1 flex items-center px-md py-sm relative">
          <span className="material-symbols-outlined text-[18px] text-secondary mr-sm">search</span>
          <input 
            type="text" 
            placeholder="SEARCH LOGS..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-0 outline-none text-primary placeholder-secondary w-full font-mono text-label-md uppercase focus:ring-0"
          />
        </div>
        <div className="flex items-center px-md py-sm gap-sm bg-surface-container">
          <span className="font-label-sm text-[10px] font-bold uppercase text-secondary">LEVEL:</span>
          <select 
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-transparent border-0 outline-none text-primary font-mono text-label-sm uppercase cursor-pointer focus:ring-0"
          >
            <option value="ALL" className="bg-surface text-primary">ALL LEVELS</option>
            <option value="ERROR" className="bg-surface text-primary">ERROR</option>
            <option value="WARN" className="bg-surface text-primary">WARN</option>
            <option value="INFO" className="bg-surface text-primary">INFO</option>
            <option value="DEBUG" className="bg-surface text-primary">DEBUG</option>
          </select>
        </div>
        <div className="flex items-center px-md py-sm gap-sm bg-surface-container">
          <span className="font-label-sm text-[10px] text-secondary uppercase">
            {filteredLogs.length} / {logs.length} ENTRIES
          </span>
        </div>
      </div>

      {/* Log Table */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-xs">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-secondary font-label-sm uppercase">
            LOADING SYSTEM LOGS...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-secondary font-label-sm uppercase">
            {logs.length === 0 ? 'NO LOG ENTRIES FOUND.' : 'NO ENTRIES MATCH FILTER.'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-surface-container z-10">
              <tr className="border-b border-primary">
                <th className="text-left p-sm px-md font-label-sm text-[10px] uppercase text-secondary w-28">TIME</th>
                <th className="text-left p-sm px-md font-label-sm text-[10px] uppercase text-secondary w-16">LEVEL</th>
                <th className="text-left p-sm px-md font-label-sm text-[10px] uppercase text-secondary w-28">COMPONENT</th>
                <th className="text-left p-sm px-md font-label-sm text-[10px] uppercase text-secondary">MESSAGE</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((entry, idx) => (
                <tr 
                  key={idx} 
                  className={`border-b border-primary/10 hover:bg-surface-container transition-none ${getLevelBg(entry.level)}`}
                >
                  <td className="p-sm px-md text-secondary whitespace-nowrap">{formatTimestamp(entry.timestamp)}</td>
                  <td className={`p-sm px-md font-bold ${getLevelColor(entry.level)}`}>{entry.level}</td>
                  <td className="p-sm px-md text-secondary">{entry.component}</td>
                  <td className="p-sm px-md text-primary">
                    {entry.message}
                    {entry.data && (
                      <span className="text-secondary ml-2">
                        {JSON.stringify(entry.data).substring(0, 120)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer with log dir path */}
      {logDir && (
        <div className="border-t border-primary px-md py-sm bg-surface-container flex-shrink-0">
          <span className="font-label-sm text-[10px] text-secondary uppercase">
            LOG_DIR: {logDir}
          </span>
        </div>
      )}
    </div>
  );
};
