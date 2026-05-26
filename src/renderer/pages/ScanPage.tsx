import React, { useEffect, useState } from 'react';
import { DriveInfo, ScanProgress } from '../../preload';

interface ScanPageProps {
  selectedDrive: DriveInfo;
  scanType: 'quick' | 'deep';
  onCancel: () => void;
  onScanComplete: (jobId: number, ipcFiles?: any[]) => void;
}

export const ScanPage: React.FC<ScanPageProps> = ({
  selectedDrive,
  scanType,
  onCancel,
  onScanComplete
}) => {
  const [progress, setProgress] = useState<ScanProgress>({
    percentage: 0,
    speed: "0 B/s",
    sectorsScanned: 0,
    filesFound: 0,
    timeRemaining: "Estimating..."
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let ipcUnsubscribeProgress: (() => void) | null = null;
    let ipcUnsubscribeFound: (() => void) | null = null;
    let ipcUnsubscribeComplete: (() => void) | null = null;

    const startScanJob = async () => {
      try {
        // 1. Try Spring Boot REST API first
        const response = await fetch('http://localhost:8080/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            drive_name: selectedDrive.name,
            drive_path: selectedDrive.path,
            scan_type: scanType
          })
        });

        if (!response.ok) throw new Error("Spring Boot scan init failed");

        const job = await response.json();
        const jobId = job.id;

        // 2. Open WebSocket for real-time progress updates
        ws = new WebSocket('ws://localhost:8080/ws/scan-progress');

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.completed) {
            ws?.close();
            onScanComplete(jobId);
          } else {
            setProgress({
              percentage: data.percentage ?? 0,
              speed: data.speed ?? '0 B/s',
              sectorsScanned: data.sectorsScanned ?? 0,
              filesFound: data.filesFound ?? 0,
              timeRemaining: data.timeRemaining ?? '...'
            });
          }
        };

        ws.onerror = () => {
          console.warn("WS error — progress via REST polling");
        };

      } catch {
        // --- Fallback: use Electron IPC directly ---
        console.warn("Spring Boot unavailable — using native Electron IPC scan");
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI) {
          setError("No scan backend available");
          return;
        }

        const foundFilesAccumulator: any[] = [];

        ipcUnsubscribeProgress = electronAPI.onScanProgress((prog: any) => {
          setProgress({
            percentage: prog.percentage ?? 0,
            speed: prog.speed ?? '0 B/s',
            sectorsScanned: prog.sectorsScanned ?? 0,
            filesFound: prog.filesFound ?? 0,
            timeRemaining: prog.timeRemaining ?? '...'
          });
        });

        ipcUnsubscribeFound = electronAPI.onFileFound((file: any) => {
          foundFilesAccumulator.push(file);
          setProgress(prev => ({
            ...prev,
            filesFound: foundFilesAccumulator.length
          }));
        });

        ipcUnsubscribeComplete = electronAPI.onScanCompleted(() => {
          onScanComplete(-1, foundFilesAccumulator);
        });

        await electronAPI.startScan(selectedDrive.path, scanType);
      }
    };

    startScanJob();

    return () => {
      ws?.close();
      ipcUnsubscribeProgress?.();
      ipcUnsubscribeFound?.();
      ipcUnsubscribeComplete?.();
    };
  }, [selectedDrive, scanType, onScanComplete]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-surface-container-lowest">
      {/* Header */}
      <header className="flex items-center px-margin-mobile md:px-margin-desktop py-md border-b border-primary bg-surface-container-lowest sticky top-0 z-10">
        <button 
          onClick={onCancel}
          aria-label="Go back" 
          className="flex items-center justify-center p-xs mr-md hover:bg-primary hover:text-surface-container-lowest transition-colors border border-transparent hover:border-primary cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline-md tracking-tight uppercase font-bold">Active Scan</h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow overflow-y-auto py-xl px-margin-mobile md:px-margin-desktop">
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-xl">
          {/* Primary Progress Block */}
          <section className="flex flex-col gap-md">
            <div className="flex justify-between items-end border-b border-primary pb-xs">
              <h2 className="font-headline-lg-mobile md:font-headline-lg tracking-tight uppercase font-bold">
                SCANNING DRIVE: {selectedDrive.name} ({scanType.toUpperCase()})
              </h2>
              <span className="font-display text-4xl font-bold">{progress.percentage}%</span>
            </div>
            
            {/* Thick progress bar */}
            <div className="h-16 w-full border border-primary bg-surface-container-lowest p-[2px]">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-in-out relative flex items-center justify-end"
                style={{ width: `${progress.percentage}%` }}
              >
                {progress.percentage > 15 && (
                  <span className="text-surface-container-lowest font-label-sm uppercase tracking-widest mr-4 text-xs select-none">
                    Running
                  </span>
                )}
              </div>
            </div>
          </section>

          {error && (
            <div className="border border-red-500 p-md text-red-500 font-label-sm uppercase text-center bg-red-50">
              {error}
            </div>
          )}

          {/* Metrics Grid */}
          <section className="border-t border-l border-primary grid grid-cols-1 md:grid-cols-3 bg-surface-container-lowest">
            <div className="p-lg border-r border-b border-primary flex flex-col items-center justify-center text-center gap-xs">
              <span className="font-headline-lg tracking-tighter text-2xl font-bold">{progress.speed}</span>
              <span className="font-label-sm uppercase text-secondary tracking-widest text-[10px]">Transfer Speed</span>
            </div>
            <div className="p-lg border-r border-b border-primary flex flex-col items-center justify-center text-center gap-xs">
              <span className="font-headline-lg tracking-tighter text-2xl font-bold">
                {progress.sectorsScanned.toLocaleString()}
              </span>
              <span className="font-label-sm uppercase text-secondary tracking-widest text-[10px]">Sectors Analyzed</span>
            </div>
            <div className="p-lg border-r border-b border-primary flex flex-col items-center justify-center text-center gap-xs">
              <span className="font-headline-lg tracking-tighter text-2xl font-bold">{progress.filesFound}</span>
              <span className="font-label-sm uppercase text-secondary tracking-widest text-[10px]">Objects Found</span>
            </div>
          </section>

          {/* Actions */}
          <section className="flex flex-col sm:flex-row gap-md justify-end mt-lg">
            <button 
              onClick={onCancel}
              className="px-xl py-sm bg-surface-container-lowest text-primary border border-primary font-label-sm uppercase tracking-widest hover:bg-primary hover:text-surface-container-lowest transition-colors min-w-[160px] cursor-pointer"
            >
              Cancel
            </button>
          </section>
        </div>
      </main>
    </div>
  );
};
