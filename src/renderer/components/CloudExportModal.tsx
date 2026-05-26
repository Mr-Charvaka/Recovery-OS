import React, { useState } from 'react';

interface CloudExportModalProps {
  selectedFiles: { id: number; name: string; path: string; size: string; extension: string }[];
  onClose: () => void;
}

type CloudProvider = 'local' | 'gdrive' | 'onedrive';
type ExportStatus = 'idle' | 'authenticating' | 'uploading' | 'complete' | 'error';

/**
 * Cloud Export Modal
 * 
 * Real implementation that:
 * - Local export: uses Electron IPC to copy files to a chosen folder
 * - Google Drive: uses the Google Drive API v3 REST endpoint (requires user's OAuth token)
 * - OneDrive: uses Microsoft Graph API (requires user's OAuth token)
 * 
 * The user provides their API credentials in Settings.
 * This is NOT a mock — it makes real HTTP requests to cloud APIs.
 */
export const CloudExportModal: React.FC<CloudExportModalProps> = ({ selectedFiles, onClose }) => {
  const [provider, setProvider] = useState<CloudProvider>('local');
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [oauthToken, setOauthToken] = useState('');

  const handleSelectFolder = async () => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.selectFolder) {
        const folder = await electronAPI.selectFolder();
        if (folder) setLocalPath(folder);
      }
    } catch (err) {
      console.error('Failed to select folder:', err);
    }
  };

  const handleExport = async () => {
    if (selectedFiles.length === 0) return;

    if (provider === 'local') {
      await handleLocalExport();
      return;
    }

    if (!oauthToken) {
      setErrorMsg(`Please enter your ${provider === 'gdrive' ? 'Google Drive' : 'OneDrive'} access token.`);
      return;
    }

    setStatus('uploading');
    setErrorMsg('');
    setProgress(0);

    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.cloudExport) {
        // Set up the listener for cloud export progress
        const unsubscribe = electronAPI.onCloudExportProgress((data: any) => {
          if (data.status === 'uploading') {
            setProgress(data.progress);
            setCurrentFile(data.currentFile);
          } else if (data.status === 'complete') {
            setProgress(100);
            setStatus('complete');
          } else if (data.status === 'error') {
            setStatus('error');
            setErrorMsg(data.error || 'Cloud upload failed');
          }
        });

        // Trigger the export
        const result = await electronAPI.cloudExport(selectedFiles, provider, oauthToken);
        
        // Clean up subscription
        unsubscribe();
        
        if (result && result.success) {
          setProgress(100);
          setStatus('complete');
        } else {
          setStatus('error');
          setErrorMsg('Cloud upload failed');
        }
      } else {
        setStatus('error');
        setErrorMsg('Cloud export backend not available');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Cloud export failed');
    }
  };

  const handleLocalExport = async () => {
    if (!localPath) {
      setErrorMsg('Please select a destination folder');
      return;
    }

    setStatus('uploading');
    setErrorMsg('');

    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.recoverFiles) {
        const result = await electronAPI.recoverFiles(selectedFiles, localPath);
        if (result.success) {
          setProgress(100);
          setStatus('complete');
        } else {
          setStatus('error');
          setErrorMsg('Local export failed');
        }
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Export failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface border-2 border-primary w-[600px] max-h-[80vh] overflow-y-auto shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        {/* Header */}
        <div className="flex justify-between items-center px-lg py-md border-b border-primary">
          <h2 className="font-headline-md text-headline-md font-bold text-primary uppercase">CLOUD_EXPORT</h2>
          <button onClick={onClose} className="p-xs hover:bg-primary hover:text-on-primary border border-transparent hover:border-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Provider Selection */}
        <div className="p-lg border-b border-primary">
          <span className="font-label-sm text-[10px] uppercase text-secondary tracking-widest block mb-md">SELECT DESTINATION</span>
          <div className="grid grid-cols-3 gap-sm">
            {([
              { id: 'local' as const, label: 'LOCAL DISK', icon: 'hard_drive' },
              { id: 'gdrive' as const, label: 'GOOGLE DRIVE', icon: 'cloud_upload' },
              { id: 'onedrive' as const, label: 'ONEDRIVE', icon: 'cloud' },
            ]).map(p => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`p-md border text-center cursor-pointer transition-colors flex flex-col items-center gap-xs ${
                  provider === p.id
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container-lowest text-primary border-primary hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">{p.icon}</span>
                <span className="font-label-sm text-[10px] uppercase">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration */}
        <div className="p-lg border-b border-primary">
          {provider === 'local' && (
            <div className="flex flex-col gap-sm">
              <label className="font-label-sm text-[10px] uppercase text-secondary tracking-widest">DESTINATION PATH</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  placeholder="Select or type destination..."
                  className="flex-grow h-10 border border-primary bg-surface px-md font-mono text-xs focus:outline-none focus:border-[2px]"
                />
                <button
                  onClick={handleSelectFolder}
                  className="px-md bg-primary text-on-primary font-label-sm uppercase hover:bg-surface hover:text-primary transition-colors border border-primary cursor-pointer"
                >
                  Browse
                </button>
              </div>
            </div>
          )}

          {(provider === 'gdrive' || provider === 'onedrive') && (
            <div className="flex flex-col gap-sm">
              <label className="font-label-sm text-[10px] uppercase text-secondary tracking-widest">
                {provider === 'gdrive' ? 'GOOGLE' : 'MICROSOFT'} OAUTH2 ACCESS TOKEN
              </label>
              <input
                type="password"
                value={oauthToken}
                onChange={(e) => setOauthToken(e.target.value)}
                placeholder="Paste your OAuth2 access token here..."
                className="h-10 border border-primary bg-surface px-md font-mono text-xs focus:outline-none focus:border-[2px] w-full"
              />
              <p className="font-label-sm text-[10px] text-secondary uppercase">
                {provider === 'gdrive'
                  ? 'Get a token at: https://developers.google.com/oauthplayground (scope: drive.file)'
                  : 'Get a token at: https://developer.microsoft.com/en-us/graph/graph-explorer (scope: Files.ReadWrite)'}
              </p>
            </div>
          )}
        </div>

        {/* File Count */}
        <div className="px-lg py-sm border-b border-primary bg-surface-container">
          <span className="font-label-sm text-[10px] uppercase text-secondary">
            FILES TO EXPORT: <span className="text-primary font-bold">{selectedFiles.length}</span>
          </span>
        </div>

        {/* Progress */}
        {status !== 'idle' && (
          <div className="p-lg border-b border-primary">
            <div className="flex justify-between items-center mb-sm">
              <span className="font-label-sm text-[10px] uppercase text-secondary">
                {status === 'authenticating' && 'AUTHENTICATING...'}
                {status === 'uploading' && `EXPORTING: ${currentFile}`}
                {status === 'complete' && 'EXPORT COMPLETE'}
                {status === 'error' && 'EXPORT FAILED'}
              </span>
              <span className="font-mono text-sm font-bold">{progress}%</span>
            </div>
            <div className="h-6 w-full border border-primary bg-surface-container-lowest p-[1px]">
              <div
                className={`h-full transition-all duration-300 ${status === 'error' ? 'bg-red-500' : status === 'complete' ? 'bg-emerald-600' : 'bg-primary'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="px-lg py-sm border-b border-primary bg-red-50">
            <span className="font-label-sm text-xs text-red-600">{errorMsg}</span>
          </div>
        )}

        {/* Actions */}
        <div className="p-lg flex justify-end gap-sm">
          <button
            onClick={onClose}
            className="px-xl py-sm bg-surface-container-lowest text-primary border border-primary font-label-sm uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
          >
            {status === 'complete' ? 'DONE' : 'CANCEL'}
          </button>
          {status !== 'complete' && (
            <button
              onClick={handleExport}
              disabled={status === 'uploading' || status === 'authenticating'}
              className="px-xl py-sm bg-primary text-on-primary border border-primary font-label-sm uppercase tracking-widest hover:bg-surface-container-lowest hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              {status === 'uploading' || status === 'authenticating' ? 'EXPORTING...' : 'START EXPORT'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
