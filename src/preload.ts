import { contextBridge, ipcRenderer } from 'electron';

export interface DriveInfo {
  name: string;
  path: string;
  capacity: string;
  freeSpace: string;
  fileSystem: string;
  isPrimary: boolean;
  type: string; // "SSD", "USB", "SD", "NETWORK"
}

export interface FileFound {
  id: number;
  name: string;
  path: string;
  size: string;
  extension: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  firstSector: number;
  fileType?: string;    // Description from signature DB
  mimeType?: string;    // MIME type
  category?: string;    // image, document, archive, audio, video, etc.
}

export interface ScanProgress {
  percentage: number;
  speed: string; // e.g. "1.2 GB/s"
  sectorsScanned: number;
  filesFound: number;
  timeRemaining: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;
  message: string;
  data?: Record<string, any>;
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Drive operations
  listDrives: () => ipcRenderer.invoke('list-drives'),
  addNetworkDrive: (uncPath: string) => ipcRenderer.invoke('add-network-drive', uncPath),
  removeNetworkDrive: (uncPath: string) => ipcRenderer.invoke('remove-network-drive', uncPath),

  // Scan operations
  startScan: (drivePath: string, scanType: 'quick' | 'deep') => 
    ipcRenderer.invoke('start-scan', drivePath, scanType),
  cancelScan: () => ipcRenderer.invoke('cancel-scan'),

  // Recovery operations
  recoverFiles: (files: any[], destination: string) => 
    ipcRenderer.invoke('recover-files', files, destination),
  cloudExport: (files: any[], provider: 'gdrive' | 'onedrive', token: string) =>
    ipcRenderer.invoke('cloud-export', files, provider, token),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Logging
  getLogs: (maxEntries?: number) => ipcRenderer.invoke('get-logs', maxEntries),
  getLogFiles: () => ipcRenderer.invoke('get-log-files'),
  getLogDir: () => ipcRenderer.invoke('get-log-dir'),

  // Misc
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getSupportedTypes: () => ipcRenderer.invoke('get-supported-types'),

  // Event subscriptions
  onScanProgress: (callback: (progress: ScanProgress) => void) => {
    const subscription = (_event: any, data: ScanProgress) => callback(data);
    ipcRenderer.on('scan-progress', subscription);
    return () => ipcRenderer.removeListener('scan-progress', subscription);
  },
  onFileFound: (callback: (file: FileFound) => void) => {
    const subscription = (_event: any, data: FileFound) => callback(data);
    ipcRenderer.on('file-found', subscription);
    return () => ipcRenderer.removeListener('file-found', subscription);
  },
  onScanCompleted: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('scan-completed', subscription);
    return () => ipcRenderer.removeListener('scan-completed', subscription);
  },
  onCloudExportProgress: (callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('cloud-export-progress', subscription);
    return () => ipcRenderer.removeListener('cloud-export-progress', subscription);
  },
  onDeviceConnected: (callback: (drive: DriveInfo) => void) => {
    const subscription = (_event: any, data: DriveInfo) => callback(data);
    ipcRenderer.on('device-connected', subscription);
    return () => ipcRenderer.removeListener('device-connected', subscription);
  }
});
