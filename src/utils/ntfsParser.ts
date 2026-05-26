/**
 * FileRestorer Pro — Real NTFS Parser
 * 
 * Parses actual NTFS Master File Table (MFT) records from raw sectors.
 * NTFS MFT records are typically 1024 bytes and start with "FILE".
 * Directory entries and file information are stored as attributes within the MFT record:
 *   0x10 = $STANDARD_INFORMATION (timestamps: creation, modification, access)
 *   0x30 = $FILE_NAME (file name in UTF-16, file sizes, parent directory)
 *   0x80 = $DATA (actual file contents / sector runlist mappings)
 * 
 * A deleted file has the "in-use" bit (bit 0) cleared in the MFT record flags (offset 22).
 * 
 * NO MOCKS. Real NTFS structure implementation.
 */

export interface ClusterRun {
  startCluster: number;
  lengthClusters: number;
}

export interface NTFSDeletedFile {
  name: string;
  extension: string;
  size: number;
  firstSector: number;
  isDirectory: boolean;
  creationDate: Date | null;
  modificationDate: Date | null;
  mftRecordNumber: number;
  runlist: ClusterRun[];
}

/**
 * Converts a 64-bit Windows FILETIME (100-nanosecond intervals since Jan 1, 1601)
 * to a JavaScript Date object.
 */
function fileTimeToDate(fileTimeBigInt: bigint): Date | null {
  if (fileTimeBigInt === 0n) return null;
  // Convert 100-nanosecond intervals to milliseconds, and subtract Epoch difference (11,644,473,600 seconds)
  const epochDiffMs = 11644473600000n;
  const ms = (fileTimeBigInt / 10000n) - epochDiffMs;
  return new Date(Number(ms));
}

/**
 * Parse an NTFS non-resident attribute runlist to find cluster offsets.
 * 
 * Runlist format:
 * Each run starts with a header byte:
 *   - Low 4 bits: Number of bytes in the run length field
 *   - High 4 bits: Number of bytes in the starting cluster offset field (signed)
 * Followed by the run length, then the starting cluster offset (relative to the previous run offset).
 * A header byte of 0x00 terminates the runlist.
 */
export function parseRunlist(buffer: Buffer, offset: number): ClusterRun[] {
  const runs: ClusterRun[] = [];
  let i = offset;
  let prevCluster = 0;

  while (i < buffer.length) {
    const headerByte = buffer[i];
    if (headerByte === 0x00) break;

    const lenBytes = headerByte & 0x0F;
    const offsetBytes = (headerByte >> 4) & 0x0F;

    i += 1;

    if (i + lenBytes + offsetBytes > buffer.length) break;

    // Read run length (unsigned)
    let runLength = 0;
    for (let b = 0; b < lenBytes; b++) {
      runLength += buffer[i + b] << (b * 8);
    }
    i += lenBytes;

    // Read starting cluster offset (signed integer)
    let runOffset = 0;
    for (let b = 0; b < offsetBytes; b++) {
      // Build byte value
      const byteValue = buffer[i + b];
      runOffset += byteValue << (b * 8);
    }
    // Handle sign extension if the offset is negative
    if (offsetBytes > 0 && (buffer[i + offsetBytes - 1] & 0x80) !== 0) {
      const mask = (1 << (offsetBytes * 8)) - 1;
      runOffset = -((~runOffset & mask) + 1);
    }
    i += offsetBytes;

    const absoluteCluster = prevCluster + runOffset;
    runs.push({
      startCluster: absoluteCluster,
      lengthClusters: runLength
    });

    prevCluster = absoluteCluster;
  }

  return runs;
}

/**
 * Parse a single MFT record buffer (typically 1024 bytes).
 */
export function parseMFTRecord(
  recordBuffer: Buffer,
  recordNumber: number,
  clusterSize: number,
  sectorSize: number,
  sectorsPerCluster: number
): NTFSDeletedFile | null {
  if (recordBuffer.length < 48) return null;

  // 1. Verify "FILE" signature
  const signature = recordBuffer.subarray(0, 4).toString('ascii');
  if (signature !== 'FILE') return null;

  // 2. Read record flags at offset 22
  const flags = recordBuffer.readUInt16LE(22);
  const isInUse = (flags & 0x01) !== 0;
  const isDirectory = (flags & 0x02) !== 0;

  // We are looking for deleted files/directories
  if (isInUse) return null;

  // 3. Find attributes starting offset (offset 20)
  let attrOffset = recordBuffer.readUInt16LE(20);

  let fileName = '';
  let creationDate: Date | null = null;
  let modificationDate: Date | null = null;
  let size = 0;
  let runlist: ClusterRun[] = [];

  // 4. Traverse attributes
  // MFT attributes list terminates with type 0xFFFFFFFF
  while (attrOffset + 8 <= recordBuffer.length) {
    const attrType = recordBuffer.readUInt32LE(attrOffset);
    if (attrType === 0xFFFFFFFF) break;

    const attrLength = recordBuffer.readUInt32LE(attrOffset + 4);
    if (attrLength === 0 || attrOffset + attrLength > recordBuffer.length) break;

    const nonResident = recordBuffer[attrOffset + 8] === 1;
    const nameLength = recordBuffer[attrOffset + 9];
    const nameOffset = recordBuffer.readUInt16LE(attrOffset + 10);
    const contentOffset = recordBuffer.readUInt16LE(attrOffset + 20);

    // ─── Parse $STANDARD_INFORMATION (0x10) ───────────────────
    if (attrType === 0x10 && !nonResident) {
      const dataOffset = attrOffset + contentOffset;
      if (dataOffset + 32 <= recordBuffer.length) {
        const fileCreationTime = recordBuffer.readBigUInt64LE(dataOffset);
        const fileModificationTime = recordBuffer.readBigUInt64LE(dataOffset + 8);
        creationDate = fileTimeToDate(fileCreationTime);
        modificationDate = fileTimeToDate(fileModificationTime);
      }
    }

    // ─── Parse $FILE_NAME (0x30) ──────────────────────────────
    if (attrType === 0x30 && !nonResident) {
      const dataOffset = attrOffset + contentOffset;
      if (dataOffset + 66 <= recordBuffer.length) {
        const nameLenChars = recordBuffer[dataOffset + 64];
        const nameType = recordBuffer[dataOffset + 65];

        // Skip DOS-only short names if a Win32/LFN name is available (nameType != 2 is preferred)
        // Namespace 2 = DOS namespace, 1 = Win32 (LFN), 3 = Win32 & DOS
        if (nameLenChars > 0 && dataOffset + 66 + nameLenChars * 2 <= recordBuffer.length) {
          const nameBuffer = recordBuffer.subarray(dataOffset + 66, dataOffset + 66 + nameLenChars * 2);
          const decodedName = nameBuffer.toString('utf16le');
          
          // Keep Win32 names if we already parsed one, ignore DOS secondary names
          if (!fileName || nameType !== 2) {
            fileName = decodedName;
          }
        }
      }
    }

    // ─── Parse $DATA (0x80) ───────────────────────────────────
    if (attrType === 0x80) {
      if (nonResident) {
        // Non-resident attribute content information
        // Offset 16: Starting VCN (Virtual Cluster Number)
        // Offset 24: Last VCN
        // Offset 32: Runlist offset
        // Offset 48: Allocated size of file content (8 bytes)
        // Offset 56: Real size of file content (8 bytes)
        const runlistOffset = recordBuffer.readUInt16LE(attrOffset + 32);
        if (attrOffset + 64 <= recordBuffer.length) {
          size = Number(recordBuffer.readBigUInt64LE(attrOffset + 48));
          runlist = parseRunlist(recordBuffer.subarray(attrOffset, attrOffset + attrLength), runlistOffset);
        }
      } else {
        // Resident attribute content (file data is stored directly in MFT)
        const attrContentLength = recordBuffer.readUInt32LE(attrOffset + 16);
        size = attrContentLength;
      }
    }

    attrOffset += attrLength;
  }

  // File name is required
  if (!fileName) {
    fileName = `NTFS_DELETED_${recordNumber}`;
  }

  const dotIdx = fileName.lastIndexOf('.');
  const extension = dotIdx > 0 ? fileName.substring(dotIdx + 1).toLowerCase() : '';

  // Determine first sector from the runlist
  let firstSector = 0;
  if (runlist.length > 0) {
    // startCluster * sectorsPerCluster
    firstSector = runlist[0].startCluster * sectorsPerCluster;
  }

  return {
    name: fileName,
    extension,
    size,
    firstSector,
    isDirectory,
    creationDate,
    modificationDate,
    mftRecordNumber: recordNumber,
    runlist
  };
}

/**
 * Scan a buffer containing consecutive MFT records (typically 1024 bytes each).
 */
export function scanMFTBufferForDeleted(
  buffer: Buffer,
  startRecordNumber: number,
  clusterSize: number,
  sectorSize: number
): NTFSDeletedFile[] {
  const deletedFiles: NTFSDeletedFile[] = [];
  const recordSize = 1024;
  const sectorsPerCluster = Math.max(1, Math.floor(clusterSize / sectorSize));
  const recordCount = Math.floor(buffer.length / recordSize);

  for (let i = 0; i < recordCount; i++) {
    const offset = i * recordSize;
    const recordBuf = buffer.subarray(offset, offset + recordSize);
    
    try {
      const file = parseMFTRecord(
        recordBuf,
        startRecordNumber + i,
        clusterSize,
        sectorSize,
        sectorsPerCluster
      );
      if (file) {
        deletedFiles.push(file);
      }
    } catch (e) {
      // Fail-safe per MFT record
      console.error(`Error parsing MFT record ${startRecordNumber + i}:`, e);
    }
  }

  return deletedFiles;
}
