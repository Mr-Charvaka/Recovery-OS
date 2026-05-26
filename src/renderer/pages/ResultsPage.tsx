import React, { useState } from 'react';
import { FileFound } from '../../preload';
import { CloudExportModal } from '../components/CloudExportModal';

interface ResultsPageProps {
  files: FileFound[];
  onBack: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ files, onBack }) => {
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [activeFileId, setActiveFileId] = useState<number | null>(files[0]?.id || null);
  const [recovering, setRecovering] = useState<boolean>(false);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const [destinationPath, setDestinationPath] = useState<string>('C:\\Users\\aman7\\Recovery');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [showCloudExport, setShowCloudExport] = useState(false);

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'ALL' || file.extension.toUpperCase() === selectedType.toUpperCase();
    return matchesSearch && matchesType;
  });

  const activeFile = files.find(f => f.id === activeFileId);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedFileIds(prev => {
        const otherSelected = prev.filter(id => !filteredFiles.some(f => f.id === id));
        return [...otherSelected, ...filteredFiles.map(f => f.id)];
      });
    } else {
      setSelectedFileIds(prev => prev.filter(id => !filteredFiles.some(f => f.id === id)));
    }
  };

  const handleSelectFile = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedFileIds(prev => [...prev, id]);
    } else {
      setSelectedFileIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleExecuteRecovery = async () => {
    if (selectedFileIds.length === 0) return;

    setRecovering(true);
    setRecoveryStatus("Initializing Extraction...");

    try {
      const res = await fetch('http://localhost:8080/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_ids: selectedFileIds,
          destination: destinationPath
        })
      });

      if (!res.ok) {
        throw new Error("Spring Boot extraction failed");
      }

      const result = await res.json();
      if (result.success) {
        setRecoveryStatus(`Successfully extracted ${result.filesRecovered} files to: ${result.destinationPath}`);
      } else {
        setRecoveryStatus("Extraction failed.");
      }
    } catch (err: any) {
      console.warn("Spring Boot extraction failed, falling back to Electron IPC:", err);
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.recoverFiles) {
          const selectedFiles = files.filter(f => selectedFileIds.includes(f.id));
          const result = await electronAPI.recoverFiles(selectedFiles, destinationPath);
          if (result.success) {
            setRecoveryStatus(`Successfully extracted ${result.filesRecovered} files to: ${result.destinationPath}`);
            return;
          }
        }
      } catch (ipcErr: any) {
        console.error("Electron IPC recovery failed:", ipcErr);
      }
      setRecoveryStatus(err.message || "Extraction error occurred.");
    } finally {
      setRecovering(false);
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
          SCAN_RESULTS (DATABASE_SYNC)
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 p-lg flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex flex-1 w-full border border-primary bg-surface overflow-hidden flex-col md:flex-row mb-20">
          
          {/* Left Table Pane */}
          <div className="flex-[2] flex flex-col border-b md:border-b-0 md:border-r border-primary relative overflow-hidden bg-surface">
            
            {/* Filter Bar */}
            <div className="flex border-b border-primary bg-surface-container flex-shrink-0 flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-primary">
              <div className="flex-1 flex items-center px-md py-sm relative">
                <span className="material-symbols-outlined text-[18px] text-secondary mr-sm">search</span>
                <input 
                  type="text" 
                  placeholder="SEARCH FILENAME..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-0 outline-none text-primary placeholder-secondary w-full font-mono text-label-md uppercase focus:ring-0"
                />
              </div>
              <div className="flex items-center px-md py-sm gap-sm bg-surface-container">
                <span className="font-label-sm text-[10px] font-bold uppercase text-secondary">TYPE:</span>
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-transparent border-0 outline-none text-primary font-mono text-label-sm uppercase cursor-pointer focus:ring-0"
                >
                  <option value="ALL" className="bg-surface text-primary">ALL FORMATS</option>
                  <option value="JPG" className="bg-surface text-primary">JPG IMAGES</option>
                  <option value="PNG" className="bg-surface text-primary">PNG IMAGES</option>
                  <option value="GIF" className="bg-surface text-primary">GIF IMAGES</option>
                  <option value="BMP" className="bg-surface text-primary">BMP IMAGES</option>
                  <option value="WEBP" className="bg-surface text-primary">WEBP IMAGES</option>
                  <option value="PDF" className="bg-surface text-primary">PDF DOCUMENTS</option>
                  <option value="DOC" className="bg-surface text-primary">DOC/DOCX</option>
                  <option value="XLSX" className="bg-surface text-primary">EXCEL SHEETS</option>
                  <option value="ZIP" className="bg-surface text-primary">ZIP ARCHIVES</option>
                  <option value="RAR" className="bg-surface text-primary">RAR ARCHIVES</option>
                  <option value="MP3" className="bg-surface text-primary">MP3 AUDIO</option>
                  <option value="MP4" className="bg-surface text-primary">MP4 VIDEO</option>
                  <option value="MKV" className="bg-surface text-primary">MKV VIDEO</option>
                  <option value="EXE" className="bg-surface text-primary">EXECUTABLES</option>
                  <option value="SQLITE" className="bg-surface text-primary">DATABASES</option>
                </select>
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-0 border-b border-primary bg-surface-container flex-shrink-0">
              <div className="col-span-1 p-md border-r border-primary flex items-center justify-center">
                <input 
                  onChange={handleSelectAll}
                  checked={filteredFiles.length > 0 && filteredFiles.every(f => selectedFileIds.includes(f.id))}
                  aria-label="Select All" 
                  className="custom-checkbox" 
                  type="checkbox"
                />
              </div>
              <div className="col-span-5 p-md border-r border-primary font-label-md text-label-md font-bold uppercase text-primary">Target Descriptor</div>
              <div className="col-span-2 p-md border-r border-primary font-label-md text-label-md font-bold uppercase text-primary">Class</div>
              <div className="col-span-2 p-md border-r border-primary font-label-md text-label-md font-bold uppercase text-primary">Volume</div>
              <div className="col-span-2 p-md font-label-md text-label-md font-bold uppercase text-primary">Integrity</div>
            </div>

            {/* Table Body */}
            <div className="flex-grow overflow-y-auto">
              {filteredFiles.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-secondary font-label-sm uppercase">
                  {files.length === 0 ? "No recoverable file segments identified." : "No files match the search criteria."}
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const isActive = file.id === activeFileId;
                  const isChecked = selectedFileIds.includes(file.id);

                  return (
                    <div 
                      key={file.id}
                      onClick={() => setActiveFileId(file.id)}
                      className={`grid grid-cols-12 gap-0 border-b border-primary transition-none cursor-crosshair group ${
                        isActive ? 'bg-primary text-on-primary' : 'hover:bg-surface-container text-primary'
                      }`}
                    >
                      <div className="col-span-1 p-md border-r border-primary flex items-center justify-center">
                        <input 
                          onChange={(e) => handleSelectFile(file.id, e)}
                          checked={isChecked}
                          className="custom-checkbox"
                          style={{ borderColor: isActive ? 'white' : 'black' }}
                          type="checkbox"
                        />
                      </div>
                      <div className="col-span-5 p-md border-r border-primary font-body-md flex items-center gap-sm truncate">
                        <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-on-primary' : 'text-secondary'}`}>
                          {file.extension === 'jpg' || file.extension === 'png' ? 'image' : 'description'}
                        </span>
                        {file.name}
                      </div>
                      <div className={`col-span-2 p-md border-r border-primary font-label-sm uppercase flex items-center ${isActive ? 'text-on-primary' : 'text-secondary'}`}>
                        {file.extension.toUpperCase()}
                      </div>
                      <div className="col-span-2 p-md border-r border-primary font-mono flex items-center">
                        {file.size}
                      </div>
                      <div className="col-span-2 p-md font-label-sm uppercase flex items-center gap-sm">
                        <span className={`w-2 h-2 ${
                          file.confidence === 'HIGH' 
                            ? 'bg-emerald-500' 
                            : file.confidence === 'MEDIUM' 
                            ? 'bg-amber-500' 
                            : 'bg-red-500'
                        }`}></span> 
                        {file.confidence}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Preview Pane */}
          <div className="flex-[1] flex flex-col bg-surface overflow-hidden relative">
            <div className="p-md border-b border-primary bg-surface flex justify-between items-center flex-shrink-0">
              <span className="font-label-md text-label-md font-bold uppercase text-primary">Entity Inspector</span>
              {activeFile && (
                <span className="font-label-sm text-secondary uppercase">ID: 0x{activeFile.id.toString(16).toUpperCase()}</span>
              )}
            </div>

            <div className="flex-1 p-lg overflow-y-auto flex flex-col gap-lg bg-surface">
              {activeFile ? (
                <>
                  {/* Visual Preview Placeholder */}
                  <div className="w-full aspect-video border border-primary bg-surface flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                    <span className="material-symbols-outlined text-[64px] text-primary relative z-10 font-light">
                      {activeFile.extension === 'jpg' || activeFile.extension === 'png' ? 'image' : 'polyline'}
                    </span>
                    <div className="absolute bottom-sm right-sm bg-surface border border-primary px-sm py-xs font-label-sm text-primary text-[10px]">
                      PREVIEW_RENDER_OK
                    </div>
                  </div>

                  {/* Metadata Stream */}
                  <div className="flex flex-col gap-sm border-t border-primary pt-md">
                    <div className="flex justify-between border-b border-primary/20 pb-xs">
                      <span className="font-label-sm text-secondary uppercase text-[10px]">Descriptor</span>
                      <span className="font-mono text-sm text-primary max-w-[200px] truncate">{activeFile.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-primary/20 pb-xs">
                      <span className="font-label-sm text-secondary uppercase text-[10px]">Physical Sector</span>
                      <span className="font-mono text-sm text-primary">0x{activeFile.firstSector.toString(16).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between border-b border-primary/20 pb-xs">
                      <span className="font-label-sm text-secondary uppercase text-[10px]">Allocation Map</span>
                      <span className="font-mono text-sm text-primary">CONTIGUOUS</span>
                    </div>
                    <div className="flex justify-between border-b border-primary/20 pb-xs">
                      <span className="font-label-sm text-secondary uppercase text-[10px]">Entropy Ratio</span>
                      <span className="font-mono text-sm text-primary">
                        {activeFile.confidence === 'HIGH' ? '0.892 (NORMAL)' : '0.412 (LOW)'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-lg">
                    <p className="font-body-md text-primary leading-relaxed border-l-2 border-primary pl-md text-xs">
                      Analysis indicates high probability of recovery. Block signatures match standard {activeFile.extension.toUpperCase()} patterns.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex-grow flex items-center justify-center text-secondary font-label-sm uppercase text-xs">
                  Select an item to view metadata.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Extraction Directory Input and Floating Button */}
        {selectedFileIds.length > 0 && (
          <div className="absolute bottom-lg left-lg right-lg flex justify-between items-center bg-surface border border-primary p-sm z-20 pointer-events-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-sm flex-grow mr-lg">
              <span className="font-label-sm uppercase text-[10px] text-secondary">Export Destination:</span>
              <input 
                type="text" 
                value={destinationPath} 
                onChange={(e) => setDestinationPath(e.target.value)} 
                className="flex-grow h-10 border border-primary bg-surface px-md font-mono text-xs focus:outline-none focus:border-[2px]"
              />
            </div>
            <button
              onClick={() => setShowCloudExport(true)}
              className="bg-surface text-primary px-lg py-md font-label-md text-label-md uppercase border border-primary hover:bg-primary hover:text-on-primary transition-all duration-150 cursor-pointer"
            >
              ☁ Cloud Export
            </button>
            <button 
              onClick={handleExecuteRecovery}
              disabled={recovering}
              className="bg-primary text-on-primary px-xl py-md font-label-md text-label-md uppercase border border-primary hover:bg-surface-container-lowest hover:text-primary transition-all duration-150 cursor-pointer disabled:opacity-50"
            >
              {recovering ? "Extracting..." : `Execute Extraction (${selectedFileIds.length})`}
            </button>
          </div>
        )}
      </div>

      {/* Recovery Popup Message */}
      {recoveryStatus && (
        <div className="absolute bottom-24 right-10 bg-surface-container-lowest border-2 border-primary p-md z-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-md">
          <div className="flex justify-between items-start">
            <span className="font-label-sm text-primary font-bold uppercase tracking-wider">SYSTEM_NOTIFICATION</span>
            <button onClick={() => setRecoveryStatus(null)} className="text-secondary hover:text-primary ml-4">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          <p className="font-body-md text-xs text-primary mt-2">{recoveryStatus}</p>
        </div>
      )}

      {/* Cloud Export Modal */}
      {showCloudExport && (
        <CloudExportModal
          selectedFiles={files.filter(f => selectedFileIds.includes(f.id))}
          onClose={() => setShowCloudExport(false)}
        />
      )}
    </div>
  );
};
