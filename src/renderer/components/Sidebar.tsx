import React from 'react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  return (
    <nav className="hidden md:flex flex-col h-screen w-64 border-r border-primary bg-surface-container-lowest select-none">
      <div className="px-md py-lg border-b border-primary">
        <h1 className="font-headline-md text-headline-md text-primary uppercase tracking-tight font-bold">RECOVERY_CONSOLE</h1>
        <p className="font-label-sm text-label-sm text-secondary uppercase mt-sm">v4.0.2_STABLE</p>
      </div>
      <div className="flex-grow flex flex-col pt-md">
        {/* DASHBOARD */}
        <button
          onClick={() => onNavigate('drives')}
          className={`flex items-center gap-md text-primary px-md py-sm border-b border-primary/10 transition-none w-full text-left cursor-pointer hover:bg-secondary-container ${
            currentPage === 'drives' ? 'bg-secondary-container font-semibold' : ''
          }`}
        >
          <span className="material-symbols-outlined">grid_view</span>
          <span className="font-label-md text-label-md uppercase">DASHBOARD</span>
        </button>

        {/* SCAN_DRIVE */}
        <button
          onClick={() => onNavigate('scan')}
          disabled={currentPage === 'drives'}
          className={`flex items-center gap-md px-md py-sm border-b border-primary/10 transition-none w-full text-left cursor-pointer hover:bg-secondary-container ${
            currentPage === 'scan' ? 'bg-primary text-on-primary' : 'text-primary'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="material-symbols-outlined">search</span>
          <span className="font-label-md text-label-md uppercase">SCAN_DRIVE</span>
        </button>

        {/* FILE_VAULT */}
        <button
          onClick={() => onNavigate('results')}
          disabled={currentPage === 'drives' || currentPage === 'scan'}
          className={`flex items-center gap-md px-md py-sm border-b border-primary/10 transition-none w-full text-left cursor-pointer hover:bg-secondary-container ${
            currentPage === 'results' ? 'bg-secondary-container font-semibold' : ''
          } text-primary disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="material-symbols-outlined">inventory_2</span>
          <span className="font-label-md text-label-md uppercase">FILE_VAULT</span>
        </button>

        {/* SETTINGS */}
        <button
          onClick={() => onNavigate('settings')}
          className={`flex items-center gap-md px-md py-sm border-b border-primary/10 transition-none w-full text-left cursor-pointer hover:bg-secondary-container ${
            currentPage === 'settings' ? 'bg-secondary-container font-semibold' : ''
          } text-primary`}
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="font-label-md text-label-md uppercase">SETTINGS</span>
        </button>

        {/* SYSTEM_LOGS */}
        <button
          onClick={() => onNavigate('logs')}
          className={`flex items-center gap-md px-md py-sm border-b border-primary/10 transition-none w-full text-left cursor-pointer hover:bg-secondary-container ${
            currentPage === 'logs' ? 'bg-secondary-container font-semibold' : ''
          } text-primary`}
        >
          <span className="material-symbols-outlined">terminal</span>
          <span className="font-label-md text-label-md uppercase">SYSTEM_LOGS</span>
        </button>
      </div>
      
      <div className="p-md border-t border-primary mt-auto bg-surface-container-low text-center">
        <span className="font-label-sm text-[10px] text-secondary uppercase tracking-wider block">SYSTEM_STATUS</span>
        <span className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block mt-1">ONLINE / SECURE</span>
      </div>
    </nav>
  );
};
