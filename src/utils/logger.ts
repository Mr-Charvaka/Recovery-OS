/**
 * FileRestorer Pro — Real Structured Logger
 * 
 * Production-grade JSON logger with:
 * - File rotation (max 10MB per file, keep last 5)
 * - Log levels: DEBUG, INFO, WARN, ERROR
 * - Structured JSON output
 * - Path sanitization (redacts sensitive info)
 * - Auto-creates log directory
 * 
 * NO MOCKS. Real file I/O. Real log rotation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: Record<string, any>;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_LOG_FILES = 5;

class Logger {
  private logDir: string;
  private currentLogPath: string;
  private currentFileSize: number = 0;
  private minLevel: LogLevel = 'DEBUG';
  private writeStream: fs.WriteStream | null = null;
  private initialized: boolean = false;
  private pendingEntries: LogEntry[] = [];

  constructor() {
    // Use app.getPath('userData') when available, fallback for early startup
    try {
      this.logDir = path.join(app.getPath('userData'), 'logs');
    } catch {
      this.logDir = path.join(
        process.env.APPDATA || process.env.HOME || '.',
        'FileRestorerPro',
        'logs'
      );
    }
    this.currentLogPath = this.getLogFileName();
  }

  /**
   * Initialize the logger — creates log directory and opens write stream.
   * Called lazily on first log write.
   */
  private init(): void {
    if (this.initialized) return;

    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      this.currentLogPath = this.getLogFileName();

      // Check existing file size
      if (fs.existsSync(this.currentLogPath)) {
        const stats = fs.statSync(this.currentLogPath);
        this.currentFileSize = stats.size;
      }

      this.openStream();
      this.initialized = true;

      // Flush pending entries
      for (const entry of this.pendingEntries) {
        this.writeEntry(entry);
      }
      this.pendingEntries = [];
    } catch (err) {
      console.error('[Logger] Failed to initialize:', err);
    }
  }

  private openStream(): void {
    if (this.writeStream) {
      this.writeStream.end();
    }
    this.writeStream = fs.createWriteStream(this.currentLogPath, {
      flags: 'a',
      encoding: 'utf-8',
    });
    this.writeStream.on('error', (err) => {
      console.error('[Logger] Write stream error:', err);
    });
  }

  private getLogFileName(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `recovery-${dateStr}.log`);
  }

  /**
   * Rotate log files when current file exceeds MAX_FILE_SIZE.
   * Renames current file with a sequence number and opens a new one.
   */
  private rotate(): void {
    try {
      if (this.writeStream) {
        this.writeStream.end();
        this.writeStream = null;
      }

      // Rename current file with timestamp
      const timestamp = Date.now();
      const rotatedPath = this.currentLogPath.replace('.log', `-${timestamp}.log`);
      if (fs.existsSync(this.currentLogPath)) {
        fs.renameSync(this.currentLogPath, rotatedPath);
      }

      // Clean up old log files (keep only MAX_LOG_FILES)
      this.cleanOldLogs();

      // Reset
      this.currentFileSize = 0;
      this.currentLogPath = this.getLogFileName();
      this.openStream();
    } catch (err) {
      console.error('[Logger] Rotation failed:', err);
    }
  }

  private cleanOldLogs(): void {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('recovery-') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.logDir, f),
          mtime: fs.statSync(path.join(this.logDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);

      // Delete files beyond the limit
      for (let i = MAX_LOG_FILES; i < files.length; i++) {
        fs.unlinkSync(files[i].path);
      }
    } catch (err) {
      // Non-critical
    }
  }

  /**
   * Sanitize sensitive data from log entries.
   * Redacts full user paths, leaving only the relevant part.
   */
  private sanitize(message: string): string {
    // Redact full Windows user paths
    return message.replace(
      /[A-Z]:\\Users\\[^\\]+/gi,
      '<USER_DIR>'
    );
  }

  private writeEntry(entry: LogEntry): void {
    if (!this.writeStream) return;

    const line = JSON.stringify(entry) + '\n';
    const lineBytes = Buffer.byteLength(line, 'utf-8');

    // Check if rotation is needed
    if (this.currentFileSize + lineBytes > MAX_FILE_SIZE) {
      this.rotate();
    }

    this.writeStream.write(line);
    this.currentFileSize += lineBytes;
  }

  /**
   * Write a log entry.
   */
  private log(level: LogLevel, component: string, message: string, data?: Record<string, any>): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message: this.sanitize(message),
      data: data ? JSON.parse(JSON.stringify(data, (key, value) => {
        if (typeof value === 'string') return this.sanitize(value);
        return value;
      })) : undefined,
    };

    // Also output to console
    const consoleMethod = level === 'ERROR' ? console.error
      : level === 'WARN' ? console.warn
      : console.log;
    consoleMethod(`[${entry.level}] [${entry.component}] ${entry.message}`, data || '');

    if (!this.initialized) {
      this.pendingEntries.push(entry);
      this.init();
      return;
    }

    this.writeEntry(entry);
  }

  // ─── Public API ───────────────────────────────────────────

  debug(component: string, message: string, data?: Record<string, any>): void {
    this.log('DEBUG', component, message, data);
  }

  info(component: string, message: string, data?: Record<string, any>): void {
    this.log('INFO', component, message, data);
  }

  warn(component: string, message: string, data?: Record<string, any>): void {
    this.log('WARN', component, message, data);
  }

  error(component: string, message: string, data?: Record<string, any>): void {
    this.log('ERROR', component, message, data);
  }

  /**
   * Set minimum log level.
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Get the log directory path.
   */
  getLogDir(): string {
    return this.logDir;
  }

  /**
   * Read recent log entries from current log file.
   * Returns parsed LogEntry objects.
   */
  readRecentLogs(maxEntries: number = 500): LogEntry[] {
    if (!this.initialized) this.init();

    try {
      const logPath = this.currentLogPath;
      if (!fs.existsSync(logPath)) return [];

      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      // Take last maxEntries lines
      const recentLines = lines.slice(-maxEntries);

      return recentLines.map(line => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return {
            timestamp: new Date().toISOString(),
            level: 'ERROR' as LogLevel,
            component: 'Logger',
            message: `Malformed log entry: ${line.substring(0, 100)}`,
          };
        }
      });
    } catch (err) {
      return [];
    }
  }

  /**
   * Get all available log file paths, sorted newest first.
   */
  getLogFiles(): { name: string; path: string; size: number; modified: Date }[] {
    try {
      if (!fs.existsSync(this.logDir)) return [];
      return fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('recovery-') && f.endsWith('.log'))
        .map(f => {
          const fullPath = path.join(this.logDir, f);
          const stats = fs.statSync(fullPath);
          return {
            name: f,
            path: fullPath,
            size: stats.size,
            modified: stats.mtime,
          };
        })
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch {
      return [];
    }
  }

  /**
   * Flush and close the write stream.
   */
  close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}

// Singleton instance
export const logger = new Logger();
