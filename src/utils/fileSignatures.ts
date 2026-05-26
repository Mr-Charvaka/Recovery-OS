import * as fs from 'fs';
import * as path from 'path';

/**
 * FileRestorer Pro — Real File Signature Detection Engine
 * 
 * Contains actual magic-byte signatures for 50+ file types.
 * Every signature is the real, production header used by forensic tools.
 * NO mocks, NO fakes — these are the exact bytes found in real files.
 */


export interface FileSignature {
  extension: string;
  mime: string;
  description: string;
  magic: number[];       // Header magic bytes
  offset: number;        // Offset from start of sector where magic appears
  headerSize: number;    // Minimum header size to confirm
  footer?: number[];     // Optional EOF marker bytes
  category: 'image' | 'document' | 'archive' | 'audio' | 'video' | 'executable' | 'database' | 'font' | 'other';
}

export interface FileTypeResult {
  extension: string;
  mime: string;
  description: string;
  category: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ============================================================
// REAL FILE SIGNATURES — Forensic-grade magic byte database
// ============================================================
export const FILE_SIGNATURES: FileSignature[] = [
  // ─── IMAGES ───────────────────────────────────────────────
  {
    extension: 'jpg',
    mime: 'image/jpeg',
    description: 'JPEG Image',
    magic: [0xFF, 0xD8, 0xFF],
    offset: 0,
    headerSize: 3,
    footer: [0xFF, 0xD9],
    category: 'image',
  },
  {
    extension: 'png',
    mime: 'image/png',
    description: 'PNG Image',
    magic: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    offset: 0,
    headerSize: 8,
    footer: [0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82],
    category: 'image',
  },
  {
    extension: 'gif',
    mime: 'image/gif',
    description: 'GIF Image',
    magic: [0x47, 0x49, 0x46, 0x38],  // GIF8 (covers GIF87a and GIF89a)
    offset: 0,
    headerSize: 4,
    footer: [0x00, 0x3B],
    category: 'image',
  },
  {
    extension: 'bmp',
    mime: 'image/bmp',
    description: 'BMP Bitmap Image',
    magic: [0x42, 0x4D],  // BM
    offset: 0,
    headerSize: 2,
    category: 'image',
  },
  {
    extension: 'tiff',
    mime: 'image/tiff',
    description: 'TIFF Image (Little-Endian)',
    magic: [0x49, 0x49, 0x2A, 0x00],  // II*.
    offset: 0,
    headerSize: 4,
    category: 'image',
  },
  {
    extension: 'tiff',
    mime: 'image/tiff',
    description: 'TIFF Image (Big-Endian)',
    magic: [0x4D, 0x4D, 0x00, 0x2A],  // MM.*
    offset: 0,
    headerSize: 4,
    category: 'image',
  },
  {
    extension: 'webp',
    mime: 'image/webp',
    description: 'WebP Image',
    magic: [0x52, 0x49, 0x46, 0x46],  // RIFF (+ WEBP at offset 8)
    offset: 0,
    headerSize: 4,
    category: 'image',
  },
  {
    extension: 'ico',
    mime: 'image/x-icon',
    description: 'ICO Icon',
    magic: [0x00, 0x00, 0x01, 0x00],
    offset: 0,
    headerSize: 4,
    category: 'image',
  },
  {
    extension: 'psd',
    mime: 'image/vnd.adobe.photoshop',
    description: 'Adobe Photoshop Document',
    magic: [0x38, 0x42, 0x50, 0x53],  // 8BPS
    offset: 0,
    headerSize: 4,
    category: 'image',
  },
  {
    extension: 'svg',
    mime: 'image/svg+xml',
    description: 'SVG Vector Image',
    magic: [0x3C, 0x73, 0x76, 0x67],  // <svg
    offset: 0,
    headerSize: 4,
    category: 'image',
  },
  {
    extension: 'heic',
    mime: 'image/heic',
    description: 'HEIC/HEIF Image',
    magic: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],  // ftyp at offset 4
    offset: 0,
    headerSize: 8,
    category: 'image',
  },
  {
    extension: 'raw',
    mime: 'image/x-raw',
    description: 'Canon CR2 RAW Image',
    magic: [0x49, 0x49, 0x2A, 0x00, 0x10, 0x00, 0x00, 0x00, 0x43, 0x52],
    offset: 0,
    headerSize: 10,
    category: 'image',
  },

  // ─── DOCUMENTS ────────────────────────────────────────────
  {
    extension: 'pdf',
    mime: 'application/pdf',
    description: 'PDF Document',
    magic: [0x25, 0x50, 0x44, 0x46, 0x2D],  // %PDF-
    offset: 0,
    headerSize: 5,
    footer: [0x25, 0x25, 0x45, 0x4F, 0x46],  // %%EOF
    category: 'document',
  },
  {
    extension: 'doc',
    mime: 'application/msword',
    description: 'Microsoft Word (Legacy)',
    magic: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1],  // OLE2 Compound
    offset: 0,
    headerSize: 8,
    category: 'document',
  },
  {
    extension: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    description: 'Microsoft Word (OOXML)',
    magic: [0x50, 0x4B, 0x03, 0x04],  // PK (ZIP-based)
    offset: 0,
    headerSize: 4,
    category: 'document',
  },
  {
    extension: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    description: 'Microsoft Excel (OOXML)',
    magic: [0x50, 0x4B, 0x03, 0x04],  // PK (ZIP-based, same as docx)
    offset: 0,
    headerSize: 4,
    category: 'document',
  },
  {
    extension: 'pptx',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    description: 'Microsoft PowerPoint (OOXML)',
    magic: [0x50, 0x4B, 0x03, 0x04],  // PK (ZIP-based)
    offset: 0,
    headerSize: 4,
    category: 'document',
  },
  {
    extension: 'rtf',
    mime: 'application/rtf',
    description: 'Rich Text Format',
    magic: [0x7B, 0x5C, 0x72, 0x74, 0x66],  // {\rtf
    offset: 0,
    headerSize: 5,
    category: 'document',
  },
  {
    extension: 'odt',
    mime: 'application/vnd.oasis.opendocument.text',
    description: 'OpenDocument Text',
    magic: [0x50, 0x4B, 0x03, 0x04],
    offset: 0,
    headerSize: 4,
    category: 'document',
  },

  // ─── ARCHIVES ─────────────────────────────────────────────
  {
    extension: 'zip',
    mime: 'application/zip',
    description: 'ZIP Archive',
    magic: [0x50, 0x4B, 0x03, 0x04],
    offset: 0,
    headerSize: 4,
    footer: [0x50, 0x4B, 0x05, 0x06],  // End of central directory
    category: 'archive',
  },
  {
    extension: 'rar',
    mime: 'application/x-rar-compressed',
    description: 'RAR Archive',
    magic: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07],  // Rar!..
    offset: 0,
    headerSize: 6,
    category: 'archive',
  },
  {
    extension: '7z',
    mime: 'application/x-7z-compressed',
    description: '7-Zip Archive',
    magic: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C],  // 7z¼¯'.
    offset: 0,
    headerSize: 6,
    category: 'archive',
  },
  {
    extension: 'gz',
    mime: 'application/gzip',
    description: 'GZIP Archive',
    magic: [0x1F, 0x8B, 0x08],
    offset: 0,
    headerSize: 3,
    category: 'archive',
  },
  {
    extension: 'tar',
    mime: 'application/x-tar',
    description: 'TAR Archive',
    magic: [0x75, 0x73, 0x74, 0x61, 0x72],  // ustar (at offset 257)
    offset: 257,
    headerSize: 5,
    category: 'archive',
  },
  {
    extension: 'xz',
    mime: 'application/x-xz',
    description: 'XZ Archive',
    magic: [0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00],
    offset: 0,
    headerSize: 6,
    category: 'archive',
  },
  {
    extension: 'bz2',
    mime: 'application/x-bzip2',
    description: 'BZIP2 Archive',
    magic: [0x42, 0x5A, 0x68],  // BZh
    offset: 0,
    headerSize: 3,
    category: 'archive',
  },

  // ─── AUDIO ────────────────────────────────────────────────
  {
    extension: 'mp3',
    mime: 'audio/mpeg',
    description: 'MP3 Audio',
    magic: [0x49, 0x44, 0x33],  // ID3 tag header
    offset: 0,
    headerSize: 3,
    category: 'audio',
  },
  {
    extension: 'mp3',
    mime: 'audio/mpeg',
    description: 'MP3 Audio (no ID3)',
    magic: [0xFF, 0xFB],  // MPEG sync word
    offset: 0,
    headerSize: 2,
    category: 'audio',
  },
  {
    extension: 'wav',
    mime: 'audio/wav',
    description: 'WAV Audio',
    magic: [0x52, 0x49, 0x46, 0x46],  // RIFF (+ WAVE at offset 8)
    offset: 0,
    headerSize: 4,
    category: 'audio',
  },
  {
    extension: 'flac',
    mime: 'audio/flac',
    description: 'FLAC Audio',
    magic: [0x66, 0x4C, 0x61, 0x43],  // fLaC
    offset: 0,
    headerSize: 4,
    category: 'audio',
  },
  {
    extension: 'ogg',
    mime: 'audio/ogg',
    description: 'OGG Vorbis Audio',
    magic: [0x4F, 0x67, 0x67, 0x53],  // OggS
    offset: 0,
    headerSize: 4,
    category: 'audio',
  },
  {
    extension: 'aac',
    mime: 'audio/aac',
    description: 'AAC Audio',
    magic: [0xFF, 0xF1],  // ADTS sync word
    offset: 0,
    headerSize: 2,
    category: 'audio',
  },
  {
    extension: 'wma',
    mime: 'audio/x-ms-wma',
    description: 'Windows Media Audio',
    magic: [0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11],  // ASF header GUID
    offset: 0,
    headerSize: 8,
    category: 'audio',
  },
  {
    extension: 'midi',
    mime: 'audio/midi',
    description: 'MIDI Audio',
    magic: [0x4D, 0x54, 0x68, 0x64],  // MThd
    offset: 0,
    headerSize: 4,
    category: 'audio',
  },

  // ─── VIDEO ────────────────────────────────────────────────
  {
    extension: 'mp4',
    mime: 'video/mp4',
    description: 'MP4 Video',
    magic: [0x66, 0x74, 0x79, 0x70],  // ftyp (at offset 4)
    offset: 4,
    headerSize: 4,
    category: 'video',
  },
  {
    extension: 'avi',
    mime: 'video/x-msvideo',
    description: 'AVI Video',
    magic: [0x52, 0x49, 0x46, 0x46],  // RIFF (+ AVI at offset 8)
    offset: 0,
    headerSize: 4,
    category: 'video',
  },
  {
    extension: 'mkv',
    mime: 'video/x-matroska',
    description: 'Matroska Video',
    magic: [0x1A, 0x45, 0xDF, 0xA3],  // EBML header
    offset: 0,
    headerSize: 4,
    category: 'video',
  },
  {
    extension: 'mov',
    mime: 'video/quicktime',
    description: 'QuickTime Video',
    magic: [0x66, 0x74, 0x79, 0x70, 0x71, 0x74],  // ftypqt
    offset: 4,
    headerSize: 6,
    category: 'video',
  },
  {
    extension: 'flv',
    mime: 'video/x-flv',
    description: 'Flash Video',
    magic: [0x46, 0x4C, 0x56, 0x01],  // FLV.
    offset: 0,
    headerSize: 4,
    category: 'video',
  },
  {
    extension: 'wmv',
    mime: 'video/x-ms-wmv',
    description: 'Windows Media Video',
    magic: [0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11],  // ASF header (same as WMA)
    offset: 0,
    headerSize: 8,
    category: 'video',
  },
  {
    extension: 'webm',
    mime: 'video/webm',
    description: 'WebM Video',
    magic: [0x1A, 0x45, 0xDF, 0xA3],  // EBML header (same as MKV)
    offset: 0,
    headerSize: 4,
    category: 'video',
  },

  // ─── EXECUTABLES ──────────────────────────────────────────
  {
    extension: 'exe',
    mime: 'application/x-msdownload',
    description: 'Windows PE Executable',
    magic: [0x4D, 0x5A],  // MZ
    offset: 0,
    headerSize: 2,
    category: 'executable',
  },
  {
    extension: 'elf',
    mime: 'application/x-elf',
    description: 'Linux ELF Executable',
    magic: [0x7F, 0x45, 0x4C, 0x46],  // .ELF
    offset: 0,
    headerSize: 4,
    category: 'executable',
  },
  {
    extension: 'class',
    mime: 'application/java-vm',
    description: 'Java Class File',
    magic: [0xCA, 0xFE, 0xBA, 0xBE],
    offset: 0,
    headerSize: 4,
    category: 'executable',
  },
  {
    extension: 'dex',
    mime: 'application/vnd.android.dex',
    description: 'Android DEX Bytecode',
    magic: [0x64, 0x65, 0x78, 0x0A],  // dex\n
    offset: 0,
    headerSize: 4,
    category: 'executable',
  },

  // ─── DATABASES ────────────────────────────────────────────
  {
    extension: 'sqlite',
    mime: 'application/x-sqlite3',
    description: 'SQLite Database',
    magic: [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6F, 0x72, 0x6D, 0x61, 0x74, 0x20, 0x33, 0x00],
    // "SQLite format 3\0"
    offset: 0,
    headerSize: 16,
    category: 'database',
  },

  // ─── FONTS ────────────────────────────────────────────────
  {
    extension: 'ttf',
    mime: 'font/ttf',
    description: 'TrueType Font',
    magic: [0x00, 0x01, 0x00, 0x00, 0x00],
    offset: 0,
    headerSize: 5,
    category: 'font',
  },
  {
    extension: 'otf',
    mime: 'font/otf',
    description: 'OpenType Font',
    magic: [0x4F, 0x54, 0x54, 0x4F],  // OTTO
    offset: 0,
    headerSize: 4,
    category: 'font',
  },
  {
    extension: 'woff',
    mime: 'font/woff',
    description: 'Web Open Font Format',
    magic: [0x77, 0x4F, 0x46, 0x46],  // wOFF
    offset: 0,
    headerSize: 4,
    category: 'font',
  },
  {
    extension: 'woff2',
    mime: 'font/woff2',
    description: 'Web Open Font Format 2',
    magic: [0x77, 0x4F, 0x46, 0x32],  // wOF2
    offset: 0,
    headerSize: 4,
    category: 'font',
  },

  // ─── OTHER ────────────────────────────────────────────────
  {
    extension: 'xml',
    mime: 'application/xml',
    description: 'XML Document',
    magic: [0x3C, 0x3F, 0x78, 0x6D, 0x6C],  // <?xml
    offset: 0,
    headerSize: 5,
    category: 'other',
  },
  {
    extension: 'wasm',
    mime: 'application/wasm',
    description: 'WebAssembly Binary',
    magic: [0x00, 0x61, 0x73, 0x6D],  // \0asm
    offset: 0,
    headerSize: 4,
    category: 'other',
  },
  {
    extension: 'iso',
    mime: 'application/x-iso9660-image',
    description: 'ISO 9660 Disk Image',
    magic: [0x43, 0x44, 0x30, 0x30, 0x31],  // CD001
    offset: 0x8001,  // Primary Volume Descriptor at sector 16
    headerSize: 5,
    category: 'other',
  },
];


/**
 * Detect file type from raw sector data using real magic-byte matching.
 * This is the same technique used by forensic tools like Scalpel, PhotoRec, and Foremost.
 * 
 * @param buffer - Raw bytes from disk (minimum 16 bytes recommended)
 * @param fullSectorBuffer - Optional full 512-byte sector for offset-based signatures
 * @returns FileTypeResult or null if no match
 */
export function detectFileType(buffer: Buffer, fullSectorBuffer?: Buffer): FileTypeResult | null {
  const searchBuffer = fullSectorBuffer || buffer;

  for (const sig of FILE_SIGNATURES) {
    // Skip if buffer is too small for this signature
    if (searchBuffer.length < sig.offset + sig.magic.length) continue;

    let match = true;
    for (let i = 0; i < sig.magic.length; i++) {
      if (searchBuffer[sig.offset + i] !== sig.magic[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      // Additional validation for ambiguous signatures
      // RIFF container: check sub-type at offset 8
      if (sig.magic[0] === 0x52 && sig.magic[1] === 0x49 && sig.magic[2] === 0x46 && sig.magic[3] === 0x46) {
        if (searchBuffer.length >= 12) {
          const subType = String.fromCharCode(searchBuffer[8], searchBuffer[9], searchBuffer[10], searchBuffer[11]);
          if (subType === 'WEBP') {
            return { extension: 'webp', mime: 'image/webp', description: 'WebP Image', category: 'image', confidence: 'HIGH' };
          }
          if (subType === 'WAVE') {
            return { extension: 'wav', mime: 'audio/wav', description: 'WAV Audio', category: 'audio', confidence: 'HIGH' };
          }
          if (subType === 'AVI ') {
            return { extension: 'avi', mime: 'video/x-msvideo', description: 'AVI Video', category: 'video', confidence: 'HIGH' };
          }
        }
      }

      // PK (ZIP) container: try to determine if it's docx, xlsx, pptx, odt, or plain zip
      if (sig.magic[0] === 0x50 && sig.magic[1] === 0x4B && sig.magic[2] === 0x03 && sig.magic[3] === 0x04) {
        // Look for content type markers in the first 512 bytes
        const headerStr = searchBuffer.subarray(0, Math.min(512, searchBuffer.length)).toString('ascii');
        if (headerStr.includes('word/')) {
          return { extension: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', description: 'Microsoft Word (OOXML)', category: 'document', confidence: 'HIGH' };
        }
        if (headerStr.includes('xl/')) {
          return { extension: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', description: 'Microsoft Excel (OOXML)', category: 'document', confidence: 'HIGH' };
        }
        if (headerStr.includes('ppt/')) {
          return { extension: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', description: 'Microsoft PowerPoint (OOXML)', category: 'document', confidence: 'HIGH' };
        }
        if (headerStr.includes('mimetype') && headerStr.includes('opendocument')) {
          return { extension: 'odt', mime: 'application/vnd.oasis.opendocument.text', description: 'OpenDocument Text', category: 'document', confidence: 'HIGH' };
        }
        // Fall through to generic ZIP
        return { extension: 'zip', mime: 'application/zip', description: 'ZIP Archive', category: 'archive', confidence: 'HIGH' };
      }

      // MP4/MOV: validate ftyp box more carefully
      if (sig.offset === 4 && sig.magic[0] === 0x66 && sig.magic[1] === 0x74 && sig.magic[2] === 0x79 && sig.magic[3] === 0x70) {
        if (searchBuffer.length >= 12) {
          const brand = String.fromCharCode(searchBuffer[8], searchBuffer[9], searchBuffer[10], searchBuffer[11]);
          if (brand === 'qt  ' || brand.startsWith('qt')) {
            return { extension: 'mov', mime: 'video/quicktime', description: 'QuickTime Video', category: 'video', confidence: 'HIGH' };
          }
          if (brand === 'isom' || brand === 'mp41' || brand === 'mp42' || brand === 'M4V ' || brand === 'avc1') {
            return { extension: 'mp4', mime: 'video/mp4', description: 'MP4 Video', category: 'video', confidence: 'HIGH' };
          }
          if (brand === 'M4A ' || brand === 'M4B ') {
            return { extension: 'm4a', mime: 'audio/mp4', description: 'M4A Audio', category: 'audio', confidence: 'HIGH' };
          }
          if (brand === 'heic' || brand === 'mif1') {
            return { extension: 'heic', mime: 'image/heic', description: 'HEIC Image', category: 'image', confidence: 'HIGH' };
          }
          // Generic MP4
          return { extension: 'mp4', mime: 'video/mp4', description: 'MP4 Video', category: 'video', confidence: 'MEDIUM' };
        }
      }

      // EBML: distinguish MKV from WebM
      if (sig.magic[0] === 0x1A && sig.magic[1] === 0x45 && sig.magic[2] === 0xDF && sig.magic[3] === 0xA3) {
        const headerStr = searchBuffer.subarray(0, Math.min(64, searchBuffer.length)).toString('ascii');
        if (headerStr.includes('webm')) {
          return { extension: 'webm', mime: 'video/webm', description: 'WebM Video', category: 'video', confidence: 'HIGH' };
        }
        return { extension: 'mkv', mime: 'video/x-matroska', description: 'Matroska Video', category: 'video', confidence: 'MEDIUM' };
      }

      // ASF: distinguish WMA from WMV (would need deeper parsing, default to video)
      if (sig.magic[0] === 0x30 && sig.magic[1] === 0x26 && sig.category === 'audio') {
        // Return the first match (WMA) — WMV has same header
        return {
          extension: sig.extension,
          mime: sig.mime,
          description: sig.description,
          category: sig.category,
          confidence: 'MEDIUM',
        };
      }

      return {
        extension: sig.extension,
        mime: sig.mime,
        description: sig.description,
        category: sig.category,
        confidence: 'HIGH',
      };
    }
  }

  return null;
}


/**
 * Find the end-of-file marker in a buffer for accurate file carving.
 * Returns the byte offset AFTER the footer (i.e., the file length),
 * or -1 if no footer is found (use maxRead as fallback).
 * 
 * This is real forensic carving logic — same approach as Scalpel/Foremost.
 */
export function detectFileEnd(buffer: Buffer, extension: string): number {
  const sig = FILE_SIGNATURES.find(s => s.extension === extension && s.footer);
  if (!sig || !sig.footer) return -1;

  const footer = Buffer.from(sig.footer);

  // Search backwards from end for efficiency on large buffers
  // But for correctness, search forwards to find first occurrence
  const idx = buffer.indexOf(footer);
  if (idx !== -1) {
    return idx + footer.length;
  }

  return -1;
}


/**
 * Get all unique file categories from the signature database.
 */
export function getCategories(): string[] {
  const categories = new Set(FILE_SIGNATURES.map(s => s.category));
  return Array.from(categories);
}

/**
 * Get all supported extensions.
 */
export function getSupportedExtensions(): string[] {
  const exts = new Set(FILE_SIGNATURES.map(s => s.extension));
  return Array.from(exts);
}

/**
 * Estimate file size from header bytes (for formats that encode size in header).
 * Returns estimated size in bytes, or 0 if not determinable from header alone.
 */
export function estimateFileSize(buffer: Buffer, extension: string): number {
  if (buffer.length < 16) return 0;

  switch (extension) {
    case 'bmp': {
      // BMP file size is stored at offset 2 as a 32-bit little-endian integer
      if (buffer.length >= 6) {
        return buffer.readUInt32LE(2);
      }
      return 0;
    }
    case 'png': {
      // PNG doesn't have total size in header, but IHDR chunk gives image dimensions
      // We can estimate: width * height * (bit_depth/8) * channels + overhead
      if (buffer.length >= 24) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        // Rough estimate (compressed PNG is typically 30-70% of raw)
        return Math.ceil(width * height * 4 * 0.5);
      }
      return 0;
    }
    case 'gif': {
      // GIF dimensions at offset 6 (LE 16-bit width, height)
      if (buffer.length >= 10) {
        const width = buffer.readUInt16LE(6);
        const height = buffer.readUInt16LE(8);
        return width * height; // Very rough estimate
      }
      return 0;
    }
    default:
      return 0;
  }
}

/**
 * Dynamically loads and parses custom signature definitions from the plugins directory.
 */
export function loadExternalPlugins(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      return;
    }

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(dirPath, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const plugins = JSON.parse(content);
          const pluginArray = Array.isArray(plugins) ? plugins : [plugins];
          
          for (const p of pluginArray) {
            if (!p.extension || !p.magic) continue;
            
            // Convert hex string to byte array
            const magicBytes: number[] = [];
            const hex = p.magic.replace(/\s+/g, '');
            for (let i = 0; i < hex.length; i += 2) {
              magicBytes.push(parseInt(hex.substr(i, 2), 16));
            }
            
            let footerBytes: number[] | undefined;
            if (p.footer) {
              footerBytes = [];
              const fHex = p.footer.replace(/\s+/g, '');
              for (let i = 0; i < fHex.length; i += 2) {
                footerBytes.push(parseInt(fHex.substr(i, 2), 16));
              }
            }

            const signature: FileSignature = {
              extension: p.extension,
              mime: p.mime || 'application/octet-stream',
              description: p.description || `${p.extension.toUpperCase()} File`,
              magic: magicBytes,
              offset: p.offset !== undefined ? p.offset : 0,
              headerSize: p.headerSize !== undefined ? p.headerSize : magicBytes.length,
              footer: footerBytes,
              category: p.category || 'other'
            };

            // Avoid adding duplicates
            const exists = FILE_SIGNATURES.some(
              s => s.extension === signature.extension && 
              s.magic.length === signature.magic.length && 
              s.magic.every((v, idx) => v === signature.magic[idx])
            );

            if (!exists) {
              FILE_SIGNATURES.push(signature);
            }
          }
        } catch (err) {
          console.error(`Failed to parse plugin file ${file}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load external plugins:', err);
  }
}

