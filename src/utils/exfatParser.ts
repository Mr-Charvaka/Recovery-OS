/**
 * FileRestorer Pro — Real exFAT Parser
 * 
 * Parses actual exFAT file system structures from raw disk sectors.
 * exFAT directory entries use an "entry set" model with entry types:
 *   0x85 = File Directory Entry
 *   0xC0 = Stream Extension Entry
 *   0xC1 = File Name Entry
 *   0x05 = Deleted file entry (0x85 with InUse bit cleared)
 *   0x40 = Deleted stream extension (0xC0 with InUse bit cleared)
 *   0x41 = Deleted file name (0xC1 with InUse bit cleared)
 * 
 * NO MOCKS. Real exFAT specification implementation.
 */

export interface ExFATDeletedFile {
  name: string;
  extension: string;
  size: number;
  firstCluster: number;
  isDirectory: boolean;
  creationDate: Date | null;
  modificationDate: Date | null;
  isContiguous: boolean;   // If true, file is not fragmented
}

export interface ExFATParseResult {
  deletedFiles: ExFATDeletedFile[];
  totalEntriesScanned: number;
}

/**
 * Parse exFAT directory entries from a raw buffer.
 * 
 * exFAT uses a different directory entry format than FAT32:
 * - Each entry is 32 bytes
 * - A "file entry set" consists of:
 *   1. File Directory Entry (type 0x85 active, 0x05 deleted)
 *   2. Stream Extension Entry (type 0xC0 active, 0x40 deleted)  
 *   3. One or more File Name Entries (type 0xC1 active, 0x41 deleted)
 * 
 * The InUse flag is bit 7 of the entry type byte:
 *   Active: 0x85 (1000 0101)  →  Deleted: 0x05 (0000 0101)
 */
export function parseExFATDirectoryEntries(buffer: Buffer): ExFATDeletedFile[] {
  const deletedFiles: ExFATDeletedFile[] = [];
  const entrySize = 32;
  let i = 0;

  while (i + entrySize <= buffer.length) {
    const entryType = buffer[i];

    // 0x00 = end of directory
    if (entryType === 0x00) break;

    // Look for deleted file directory entries (type 0x05)
    // Active file entries are 0x85; InUse bit (bit 7) cleared = 0x05
    if (entryType === 0x05) {
      const secondaryCount = buffer[i + 1]; // How many secondary entries follow
      const attributes = buffer.readUInt16LE(i + 4);
      const isDirectory = (attributes & 0x10) !== 0;

      // Parse creation timestamp (offset 8, 4 bytes — exFAT timestamp format)
      const createTimestamp = buffer.readUInt32LE(i + 8);
      const creationDate = exfatTimestampToDate(createTimestamp);

      // Parse modification timestamp (offset 12, 4 bytes)
      const modTimestamp = buffer.readUInt32LE(i + 12);
      const modificationDate = exfatTimestampToDate(modTimestamp);

      // Now read the Stream Extension entry (should be next, type 0x40 for deleted)
      let size = 0;
      let firstCluster = 0;
      let isContiguous = false;
      let nameChars: number[] = [];

      for (let s = 1; s <= secondaryCount && (i + s * entrySize + entrySize) <= buffer.length; s++) {
        const secOffset = i + s * entrySize;
        const secType = buffer[secOffset];

        // Deleted Stream Extension (0x40)
        if (secType === 0x40) {
          const generalFlags = buffer[secOffset + 1];
          isContiguous = (generalFlags & 0x02) !== 0; // NoFatChain flag
          // Name length at offset 3 (1 byte, character count)
          // First cluster at offset 20 (4 bytes)
          firstCluster = buffer.readUInt32LE(secOffset + 20);
          // Valid data length at offset 24 (8 bytes)
          size = Number(buffer.readBigUInt64LE(secOffset + 24));
        }

        // Deleted File Name entry (0x41)
        if (secType === 0x41) {
          // Flags at offset 1 (1 byte)
          // File name characters at offset 2 (30 bytes, 15 UTF-16LE chars)
          for (let c = 0; c < 15; c++) {
            const charCode = buffer.readUInt16LE(secOffset + 2 + c * 2);
            if (charCode === 0x0000) break;
            nameChars.push(charCode);
          }
        }
      }

      // Reconstruct filename
      const name = String.fromCharCode(...nameChars) || '?DELETED';
      const dotIdx = name.lastIndexOf('.');
      const extension = dotIdx > 0 ? name.substring(dotIdx + 1).toLowerCase() : '';

      if (size > 0 || isDirectory) {
        deletedFiles.push({
          name,
          extension,
          size,
          firstCluster,
          isDirectory,
          creationDate,
          modificationDate,
          isContiguous,
        });
      }

      // Skip past all secondary entries
      i += (1 + secondaryCount) * entrySize;
      continue;
    }

    i += entrySize;
  }

  return deletedFiles;
}


/**
 * Convert exFAT timestamp (4 bytes) to JavaScript Date.
 * 
 * exFAT timestamp format (32 bits):
 *   Bits 31-25: Year (0 = 1980, max 127 = 2107)
 *   Bits 24-21: Month (1-12)
 *   Bits 20-16: Day (1-31)
 *   Bits 15-11: Hour (0-23)
 *   Bits 10-5:  Minute (0-59)
 *   Bits 4-0:   DoubleSeconds (0-29, multiply by 2 for actual seconds)
 */
function exfatTimestampToDate(ts: number): Date | null {
  if (ts === 0) return null;

  const doubleSeconds = ts & 0x1F;
  const minute = (ts >> 5) & 0x3F;
  const hour = (ts >> 11) & 0x1F;
  const day = (ts >> 16) & 0x1F;
  const month = (ts >> 21) & 0x0F;
  const year = ((ts >> 25) & 0x7F) + 1980;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return new Date(year, month - 1, day, hour, minute, doubleSeconds * 2);
}


/**
 * Parse exFAT Allocation Bitmap to find free/allocated cluster ranges.
 * The bitmap is a simple bit array where:
 *   bit = 1: cluster is allocated
 *   bit = 0: cluster is free (potentially recoverable data)
 * 
 * @param bitmapBuffer - Raw bitmap data
 * @param startCluster - First cluster number (usually 2)
 * @returns Array of [startCluster, endCluster] ranges that are FREE
 */
export function parseFreeClusterRanges(
  bitmapBuffer: Buffer,
  startCluster: number = 2
): [number, number][] {
  const freeRanges: [number, number][] = [];
  let rangeStart = -1;

  for (let byteIdx = 0; byteIdx < bitmapBuffer.length; byteIdx++) {
    const byte = bitmapBuffer[byteIdx];
    for (let bit = 0; bit < 8; bit++) {
      const cluster = startCluster + byteIdx * 8 + bit;
      const isAllocated = (byte >> bit) & 1;

      if (!isAllocated) {
        if (rangeStart === -1) rangeStart = cluster;
      } else {
        if (rangeStart !== -1) {
          freeRanges.push([rangeStart, cluster - 1]);
          rangeStart = -1;
        }
      }
    }
  }

  if (rangeStart !== -1) {
    freeRanges.push([rangeStart, startCluster + bitmapBuffer.length * 8 - 1]);
  }

  return freeRanges;
}
