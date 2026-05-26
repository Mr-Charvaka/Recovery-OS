import React, { useEffect, useState } from 'react';
import { DriveInfo } from '../../preload';

interface DrivesPageProps {
  onStartScan: (drive: DriveInfo, scanType: 'quick' | 'deep') => void;
}

export const DrivesPage: React.FC<DrivesPageProps> = ({ onStartScan }) => {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkPath, setNetworkPath] = useState('');
  const [networkError, setNetworkError] = useState('');
  const [addingNetwork, setAddingNetwork] = useState(false);

  const fetchDrives = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/drives');
      if (res.ok) {
        const driveList = await res.json();
        setDrives(driveList);
        setLoading(false);
        return;
      }
    } catch {
      // Spring Boot not available — fall through to IPC
    }
    // Fallback: ask the Electron main process via IPC
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.listDrives) {
        const driveList = await electronAPI.listDrives();
        setDrives(driveList ?? []);
      }
    } catch (e) {
      console.error("Failed to load drives via IPC:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const getDriveIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'USB': return 'usb';
      case 'SD': return 'sd_storage';
      case 'NETWORK': return 'lan';
      default: return 'hard_drive';
    }
  };

  const handleAddNetworkDrive = async () => {
    if (!networkPath.trim()) {
      setNetworkError('Please enter a valid network path');
      return;
    }

    setAddingNetwork(true);
    setNetworkError('');

    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.addNetworkDrive) {
        const result = await electronAPI.addNetworkDrive(networkPath.trim());
        if (result.success) {
          setShowNetworkModal(false);
          setNetworkPath('');
          fetchDrives(); // Refresh drive list
        } else {
          setNetworkError(result.error || 'Failed to add network drive');
        }
      }
    } catch (err: any) {
      setNetworkError(err.message || 'Failed to add network drive');
    } finally {
      setAddingNetwork(false);
    }
  };

  const handleRemoveNetworkDrive = async (drivePath: string) => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.removeNetworkDrive) {
        await electronAPI.removeNetworkDrive(drivePath);
        fetchDrives();
      }
    } catch (err) {
      console.error('Failed to remove network drive:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-surface-container-lowest">
      {/* Top Header */}
      <header className="flex justify-between items-center px-lg h-16 w-full border-b border-primary bg-surface-container-lowest">
        <div className="flex items-center gap-md">
          <span className="font-headline-md text-headline-md font-bold text-primary uppercase tracking-tight">RECOVERY_OS (SPRING_CORE)</span>
        </div>
        <div className="flex items-center gap-md">
          <button 
            onClick={fetchDrives}
            className="p-xs text-secondary hover:bg-primary hover:text-on-primary border border-transparent hover:border-primary transition-all cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span className="font-label-sm text-[10px] uppercase">REFRESH</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop">
        <div className="max-w-container-max mx-auto w-full">
          {/* Page Header */}
          <div className="mb-xl border-b border-primary pb-md flex justify-between items-end">
            <div>
              <h2 className="font-display text-headline-lg-mobile md:text-headline-lg uppercase text-primary tracking-tight font-bold">SELECT TARGET DRIVE</h2>
              <p className="font-body-md text-body-md text-secondary mt-sm max-w-2xl">
                Identify the volume for analysis. Ensure target media is mounted before initializing scan protocol.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-sm">
              <span className="font-label-sm text-label-sm uppercase border border-primary px-sm py-xs">SPRING_PORT_8080_ONLINE</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="font-label-md uppercase animate-pulse">QUERYING SYSTEM DISK STORAGE FROM DISTRIBUTED WORKER...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg mb-xl">
              {drives.map((drive, idx) => {
                let pct = 80;
                const freeSpace = drive.freeSpace ?? '';
                const capacity = drive.capacity ?? '';
                if (freeSpace.includes("GB") && capacity.includes("TB")) {
                  pct = 80;
                } else if (freeSpace.includes("TB") && capacity.includes("TB")) {
                  pct = 15;
                } else if (freeSpace.includes("GB") && capacity.includes("GB")) {
                  const free = parseFloat(freeSpace);
                  const cap = parseFloat(capacity);
                  pct = cap > 0 ? Math.round(((cap - free) / cap) * 100) : 80;
                }

                return (
                  <div 
                    key={idx}
                    className="border border-primary bg-surface-container-lowest p-lg hover:border-[2px] transition-all duration-75 cursor-crosshair flex flex-col h-full group relative"
                  >
                    {drive.isPrimary && (
                      <div className="absolute top-sm right-sm">
                        <span className="font-label-sm text-label-sm bg-primary text-on-primary px-sm py-xs uppercase font-bold">PRIMARY</span>
                      </div>
                    )}
                    {drive.type === 'NETWORK' && (
                      <div className="absolute top-sm right-sm flex gap-1">
                        <span className="font-label-sm text-label-sm bg-surface-container text-primary px-sm py-xs uppercase font-bold border border-primary">NETWORK</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveNetworkDrive(drive.path); }}
                          className="p-xs text-secondary hover:text-red-600 cursor-pointer"
                          title="Remove network drive"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-md mb-lg">
                      <span className="material-symbols-outlined text-[32px]">{getDriveIcon(drive.type)}</span>
                      <div>
                        <h3 className="font-headline-md text-headline-md uppercase font-bold">{drive.name}</h3>
                        <p className="font-label-sm text-label-sm text-secondary uppercase mt-xs">{drive.path}</p>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex justify-between font-label-sm text-label-sm uppercase mb-xs">
                        <span>CAPACITY</span>
                        <span>{drive.capacity}</span>
                      </div>
                      <div className="w-full h-md border border-primary bg-surface-container-lowest overflow-hidden p-[1px]">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="flex justify-between font-label-sm text-label-sm uppercase mt-xs text-secondary">
                        <span>{drive.freeSpace} FREE</span>
                        <span>{drive.fileSystem}</span>
                      </div>
                    </div>

                    <div className="mt-lg pt-md border-t border-primary/20 flex gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onStartScan(drive, 'quick')}
                        className="flex-1 border border-primary bg-surface-container-lowest text-primary hover:bg-primary hover:text-on-primary py-sm font-label-sm text-label-sm uppercase text-center transition-colors cursor-pointer"
                      >
                        QUICK_SCAN
                      </button>
                      <button 
                        onClick={() => onStartScan(drive, 'deep')}
                        className="flex-1 bg-primary text-on-primary border border-primary hover:bg-surface-container-lowest hover:text-primary py-sm font-label-sm text-label-sm uppercase text-center transition-colors cursor-pointer"
                      >
                        DEEP_SCAN
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add Network Drive Card */}
              <button
                onClick={() => setShowNetworkModal(true)}
                className="border border-dashed border-primary/50 bg-surface-container-lowest p-lg hover:border-primary hover:border-solid transition-all duration-75 cursor-pointer flex flex-col items-center justify-center gap-md h-full min-h-[200px] group"
              >
                <span className="material-symbols-outlined text-[48px] text-secondary group-hover:text-primary transition-colors">add_circle</span>
                <span className="font-label-md text-label-md uppercase text-secondary group-hover:text-primary transition-colors">ADD NETWORK DRIVE</span>
                <span className="font-label-sm text-[10px] text-secondary uppercase">SMB / UNC PATH</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Network Drive Modal */}
      {showNetworkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border-2 border-primary w-[480px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center px-lg py-md border-b border-primary">
              <h2 className="font-headline-md text-headline-md font-bold text-primary uppercase">ADD NETWORK DRIVE</h2>
              <button onClick={() => { setShowNetworkModal(false); setNetworkError(''); }} className="p-xs hover:bg-primary hover:text-on-primary border border-transparent hover:border-primary transition-colors cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-lg flex flex-col gap-md">
              <div className="flex flex-col gap-xs">
                <label className="font-label-sm text-[10px] uppercase text-secondary tracking-widest">UNC PATH</label>
                <input
                  type="text"
                  value={networkPath}
                  onChange={(e) => setNetworkPath(e.target.value)}
                  placeholder="\\\\server\\share or Z:\\"
                  className="h-12 px-md border border-primary bg-surface font-mono text-sm text-primary focus:outline-none focus:border-[2px]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNetworkDrive()}
                />
              </div>
              {networkError && (
                <div className="border border-red-500 p-sm bg-red-50">
                  <span className="font-label-sm text-xs text-red-600">{networkError}</span>
                </div>
              )}
              <div className="flex justify-end gap-sm mt-md">
                <button
                  onClick={() => { setShowNetworkModal(false); setNetworkError(''); }}
                  className="px-lg py-sm border border-primary bg-surface text-primary font-label-sm uppercase hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleAddNetworkDrive}
                  disabled={addingNetwork}
                  className="px-lg py-sm border border-primary bg-primary text-on-primary font-label-sm uppercase hover:bg-surface hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                >
                  {addingNetwork ? 'CONNECTING...' : 'ADD DRIVE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

