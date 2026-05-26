import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DrivesPage } from './pages/DrivesPage';
import { ScanPage } from './pages/ScanPage';
import { ResultsPage } from './pages/ResultsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LogsPage } from './pages/LogsPage';
import type { DriveInfo, FileFound } from '../preload';

export const App: React.FC = () => {
  const [page, setPage] = useState<string>('drives');
  const [selectedDrive, setSelectedDrive] = useState<DriveInfo | null>(null);
  const [scanType, setScanType] = useState<'quick' | 'deep'>('quick');
  const [files, setFiles] = useState<FileFound[]>([]);

  const [settings, setSettings] = useState({
    mockMode: true,
    enableML: false,
    verifyIntegrity: true,
    recoveryDir: 'C:\\Users\\aman7\\Recovery'
  });

  const handleStartScan = (drive: DriveInfo, type: 'quick' | 'deep') => {
    setSelectedDrive(drive);
    setScanType(type);
    setFiles([]); // clear previous files
    setPage('scan');
  };

  const handleCancelScan = () => {
    setPage('drives');
  };

  const handleScanComplete = async (jobId: number, ipcFiles?: FileFound[]) => {
    if (jobId === -1 && ipcFiles) {
      setFiles(ipcFiles);
      setPage('results');
      return;
    }

    try {
      const res = await fetch(`http://localhost:8080/api/jobs/${jobId}/files`);
      if (res.ok) {
        const fileList = await res.json();
        // Map Spring Boot snake_case / camelCase objects to frontend FileFound layout
        const mappedList: FileFound[] = fileList.map((f: any) => ({
          id: f.id,
          name: f.name,
          path: f.path,
          size: f.size,
          extension: f.extension,
          confidence: f.confidence,
          firstSector: f.firstSector
        }));
        setFiles(mappedList);
      }
    } catch (e) {
      console.error("Failed to fetch files from Spring Boot database", e);
    }
    setPage('results');
  };

  const handleSaveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
  };

  const handleNavigate = (targetPage: string) => {
    if (targetPage === 'drives') {
      setPage('drives');
    } else if (targetPage === 'settings') {
      setPage('settings');
    } else if (targetPage === 'logs') {
      setPage('logs');
    }
  };

  return (
    <div className="font-body-md text-primary flex h-screen overflow-hidden antialiased bg-surface-container-lowest select-none">
      {/* Sidebar Nav */}
      <Sidebar currentPage={page} onNavigate={handleNavigate} />

      {/* Main Workspace Wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-grow overflow-hidden flex flex-col">
          {page === 'drives' && (
            <DrivesPage onStartScan={handleStartScan} />
          )}

          {page === 'scan' && selectedDrive && (
            <ScanPage
              selectedDrive={selectedDrive}
              scanType={scanType}
              onCancel={handleCancelScan}
              onScanComplete={handleScanComplete}
            />
          )}

          {page === 'results' && (
            <ResultsPage 
              files={files} 
              onBack={() => setPage('drives')} 
            />
          )}

          {page === 'settings' && (
            <SettingsPage
              settings={settings}
              onSave={handleSaveSettings}
              onBack={() => setPage('drives')}
            />
          )}

          {page === 'logs' && (
            <LogsPage onBack={() => setPage('drives')} />
          )}
        </div>

        {/* Global Footer */}
        <footer className="flex justify-between items-center px-lg py-md w-full border-t border-primary bg-surface-container-lowest mt-auto flex-shrink-0">
          <span className="font-label-sm text-[10px] uppercase text-primary">
            © 2026 NULL_LOGIC RECOVERY SYSTEMS. ALL RIGHTS RESERVED.
          </span>
          <div className="hidden md:flex gap-md">
            <span className="font-label-sm text-[10px] uppercase text-secondary">PRIVACY_POLICY</span>
            <span className="font-label-sm text-[10px] uppercase text-secondary">LEGAL_NOTICE</span>
            <span className="font-label-sm text-[10px] uppercase text-secondary">SYSTEM_LOGS</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
