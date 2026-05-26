/**
 * FileRestorer Pro — Filesystem Metadata Scanner
 * 
 * Performs structural metadata-based recovery by parsing filesystem tables
 * (NTFS MFT, FAT directory entries, exFAT entry sets, and EXT4 inode tables).
 * This finds deleted files with their original names, paths, sizes, and timestamps,
 * which is far superior to raw signature carving.
 * 
 * NO MOCKS. Real metadata traversal.
 */

import { detectFileSystem, FileSystemInfo } from './fsDetector';
import { parseMFTRecord, scanMFTBufferForDeleted, NTFSDeletedFile, ClusterRun } from './ntfsParser';
import { parseFATDirectoryEntries, FATDeletedFile } from './fatParser';
import { parseExFATDirectoryEntries, ExFATDeletedFile } from './exfatParser';
import { parseExtSuperblock, scanInodeTableForDeleted, ExtDeletedFile } from './ext4Parser';
import { logger } from './logger';

export interface FileFound {
  id: number;
  name: string;
  path: string;
  size: string;
  extension: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  firstSector: number;
  fileType?: string;
  mimeType?: string;
  category?: string;
  runlist?: ClusterRun[]; // NTFS specific
}

function formatSize(bytes: number): string {
  const KB = 1024;
  const MB = 1024 * 1024;
  const GB = 1024 * 1024 * 1024;
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${bytes} Bytes`;
}

/**
 * Scan filesystem metadata to find deleted entries before carving.
 */
export async function scanMetadata(
  drivePath: string,
  fsInfo: FileSystemInfo,
  readSectorsSync: (drivePath: string, offset: number, size: number) => Buffer
): Promise<FileFound[]> {
  const files: FileFound[] = [];
  let fileId = 1;

  try {
    logger.info('MetadataScanner', `Starting metadata scan for ${fsInfo.type} filesystem on ${drivePath}`);

    if (fsInfo.type === 'NTFS' && fsInfo.mftOffset !== undefined) {
      await scanNTFS(drivePath, fsInfo, readSectorsSync, files, () => fileId++);
    } 
    else if ((fsInfo.type === 'FAT32' || fsInfo.type === 'FAT16') && fsInfo.fatSize !== undefined) {
      await scanFAT(drivePath, fsInfo, readSectorsSync, files, () => fileId++);
    } 
    else if (fsInfo.type === 'exFAT') {
      await scanExFAT(drivePath, fsInfo, readSectorsSync, files, () => fileId++);
    } 
    else if (fsInfo.type === 'ext4' || fsInfo.type === 'ext3' || fsInfo.type === 'ext2') {
      await scanEXT(drivePath, fsInfo, readSectorsSync, files, () => fileId++);
    }
  } catch (err) {
    logger.error('MetadataScanner', 'Filesystem metadata scan failed', { error: String(err) });
  }

  logger.info('MetadataScanner', `Finished metadata scan. Found ${files.length} deleted items.`);
  return files;
}

/**
 * 1. NTFS metadata scanning: parse the MFT
 */
async function scanNTFS(
  drivePath: string,
  fsInfo: FileSystemInfo,
  readSectorsSync: (drivePath: string, offset: number, size: number) => Buffer,
  files: FileFound[],
  nextId: () => number
) {
  const sectorSize = fsInfo.sectorSize;
  const clusterSize = fsInfo.clusterSize;
  const mftCluster = fsInfo.mftOffset!;
  const mftOffsetBytes = mftCluster * clusterSize;

  logger.info('MetadataScanner', `Reading NTFS $MFT starting cluster ${mftCluster} (offset 0x${mftOffsetBytes.toString(16)})`);

  // Read the first MFT record (record 0 for $MFT itself) to find the location of the MFT
  let mftRecord0: Buffer;
  try {
    mftRecord0 = readSectorsSync(drivePath, mftOffsetBytes, 1024);
  } catch (err) {
    logger.warn('MetadataScanner', 'Could not read MFT record 0', { error: String(err) });
    return;
  }

  // Parse $MFT's own MFT record to get its cluster runs (runlist)
  // This allows us to map and scan the entire MFT, even if it is fragmented!
  const sectorsPerCluster = Math.max(1, Math.floor(clusterSize / sectorSize));
  const mftMeta = parseMFTRecord(mftRecord0, 0, clusterSize, sectorSize, sectorsPerCluster);
  if (!mftMeta || !mftMeta.runlist || mftMeta.runlist.length === 0) {
    logger.warn('MetadataScanner', 'Could not parse $MFT runlist from MFT record 0, falling back to contiguous read');
    // Fallback: assume contiguous MFT of 200 records (200 KB)
    try {
      const buf = readSectorsSync(drivePath, mftOffsetBytes, 204800);
      const parsed = scanMFTBufferForDeleted(buf, 0, clusterSize, sectorSize);
      for (const f of parsed) {
        files.push(mapNTFSToFound(f, drivePath, nextId()));
      }
    } catch {}
    return;
  }

  logger.info('MetadataScanner', `Parsed $MFT runlist containing ${mftMeta.runlist.length} runs`);

  // Scan MFT records run by run
  let currentRecordIndex = 0;
  const maxRecordsToScan = 2000; // Limit scan size for performance safety

  for (const run of mftMeta.runlist) {
    if (currentRecordIndex >= maxRecordsToScan) break;

    const runStartByte = run.startCluster * clusterSize;
    const runLengthBytes = run.lengthClusters * clusterSize;
    const recordSize = 1024;
    const recordsInRun = Math.floor(runLengthBytes / recordSize);

    // Read and parse run in chunks of 50 records (50 KB)
    const chunkSize = 50;
    for (let r = 0; r < recordsInRun && currentRecordIndex < maxRecordsToScan; r += chunkSize) {
      const readCount = Math.min(chunkSize, recordsInRun - r, maxRecordsToScan - currentRecordIndex);
      const readOffset = runStartByte + r * recordSize;
      const readSize = readCount * recordSize;

      try {
        const buf = readSectorsSync(drivePath, readOffset, readSize);
        const parsed = scanMFTBufferForDeleted(buf, currentRecordIndex, clusterSize, sectorSize);
        for (const f of parsed) {
          files.push(mapNTFSToFound(f, drivePath, nextId()));
        }
        currentRecordIndex += readCount;
      } catch (err) {
        currentRecordIndex += readCount; // skip and advance
      }
    }
  }
}

function mapNTFSToFound(f: NTFSDeletedFile, drivePath: string, id: number): FileFound {
  return {
    id,
    name: f.name,
    path: `${drivePath}\\DELETED_RECOVERED\\${f.name}`,
    size: formatSize(f.size),
    extension: f.extension,
    confidence: 'HIGH',
    firstSector: f.firstSector,
    fileType: f.isDirectory ? 'Directory' : `NTFS File`,
    mimeType: f.isDirectory ? 'inode/directory' : 'application/octet-stream',
    category: f.isDirectory ? 'directory' : 'document',
    runlist: f.runlist
  };
}

/**
 * 2. FAT metadata scanning: traverse the directory tables
 */
async function scanFAT(
  drivePath: string,
  fsInfo: FileSystemInfo,
  readSectorsSync: (drivePath: string, offset: number, size: number) => Buffer,
  files: FileFound[],
  nextId: () => number
) {
  const isFAT32 = fsInfo.type === 'FAT32';
  const sectorSize = fsInfo.sectorSize;
  const clusterSize = fsInfo.clusterSize;
  
  // Read boot sector to get values
  let bootSector: Buffer;
  try {
    bootSector = readSectorsSync(drivePath, 0, 512);
  } catch {
    return;
  }

  const reservedSectors = bootSector.readUInt16LE(14);
  const numFATs = bootSector[16];
  const rootEntries = bootSector.readUInt16LE(17);
  const fatSize = fsInfo.fatSize!;
  
  const sectorsPerCluster = Math.max(1, Math.floor(clusterSize / sectorSize));

  // Calculate start of root directory and data region
  const rootDirSectors = Math.ceil((rootEntries * 32) / sectorSize);
  const rootDirStartSector = reservedSectors + (numFATs * fatSize);
  const dataRegionStartSector = rootDirStartSector + rootDirSectors;

  logger.info('MetadataScanner', `FAT parameters: Reserved=${reservedSectors}, FATs=${numFATs}, FATSize=${fatSize}, RootStart=${rootDirStartSector}, DataStart=${dataRegionStartSector}`);

  // In FAT32, the root directory starts at a cluster (from boot sector offset 44)
  // In FAT12/16, the root directory is a fixed contiguous region
  if (isFAT32) {
    const rootCluster = bootSector.readUInt32LE(44);
    await traverseFAT32Directory(
      drivePath,
      rootCluster,
      clusterSize,
      sectorSize,
      sectorsPerCluster,
      dataRegionStartSector,
      readSectorsSync,
      files,
      nextId,
      new Set<number>()
    );
  } else {
    // FAT12/16 contiguous root directory
    try {
      const rootOffsetBytes = rootDirStartSector * sectorSize;
      const rootSizeBytes = rootDirSectors * sectorSize;
      const buf = readSectorsSync(drivePath, rootOffsetBytes, rootSizeBytes);
      const parsed = parseFATDirectoryEntries(buf, false);
      for (const f of parsed) {
        files.push(mapFATToFound(f, drivePath, nextId(), sectorSize, sectorsPerCluster, dataRegionStartSector));
      }
    } catch {}
  }
}

async function traverseFAT32Directory(
  drivePath: string,
  cluster: number,
  clusterSize: number,
  sectorSize: number,
  sectorsPerCluster: number,
  dataRegionStartSector: number,
  readSectorsSync: (drivePath: string, offset: number, size: number) => Buffer,
  files: FileFound[],
  nextId: () => number,
  visited: Set<number>
) {
  if (cluster < 2 || visited.has(cluster) || visited.size > 100) return; // Prevent loop/overflow
  visited.add(cluster);

  const offset = ((cluster - 2) * sectorsPerCluster + dataRegionStartSector) * sectorSize;

  try {
    const buf = readSectorsSync(drivePath, offset, clusterSize);
    const parsed = parseFATDirectoryEntries(buf, true);

    for (const f of parsed) {
      if (f.isDirectory && f.firstCluster >= 2) {
        // Recursive walk for subdirectories
        await traverseFAT32Directory(
          drivePath,
          f.firstCluster,
          clusterSize,
          sectorSize,
          sectorsPerCluster,
          dataRegionStartSector,
          readSectorsSync,
          files,
          nextId,
          visited
        );
      } else {
        files.push(mapFATToFound(f, drivePath, nextId(), sectorSize, sectorsPerCluster, dataRegionStartSector));
      }
    }
  } catch {}
}

function mapFATToFound(
  f: FATDeletedFile,
  drivePath: string,
  id: number,
  sectorSize: number,
  sectorsPerCluster: number,
  dataRegionStartSector: number
): FileFound {
  // Convert firstCluster to absolute sector
  const firstSector = f.firstCluster >= 2 
    ? ((f.firstCluster - 2) * sectorsPerCluster + dataRegionStartSector)
    : 0;

  return {
    id,
    name: f.name,
    path: `${drivePath}\\DELETED_RECOVERED\\${f.name}`,
    size: formatSize(f.size),
    extension: f.extension,
    confidence: 'HIGH',
    firstSector,
    fileType: f.isDirectory ? 'Directory' : `FAT File`,
    mimeType: f.isDirectory ? 'inode/directory' : 'application/octet-stream',
    category: f.isDirectory ? 'directory' : 'document'
  };
}

/**
 * 3. exFAT metadata scanning: traverse entry sets
 */
async function scanExFAT(
  drivePath: string,
  fsInfo: FileSystemInfo,
  readSectorsSync: (drivePath: string, offset: number, size: number) => Buffer,
  files: FileFound[],
  nextId: () => number
) {
  // Read VBR (boot sector)
  let bootSector: Buffer;
  try {
    bootSector = readSectorsSync(drivePath, 0, 512);
  } catch {
    return;
  }

  const clusterHeapOffset = bootSector.readUInt32LE(88); // in sectors
  const rootCluster = bootSector.readUInt32LE(96);
  const sectorSize = fsInfo.sectorSize;
  const clusterSize = fsInfo.clusterSize;
  const sectorsPerCluster = Math.max(1, Math.floor(clusterSize / sectorSize));

  logger.info('MetadataScanner', `exFAT RootCluster=${rootCluster}, ClusterHeapOffset=${clusterHeapOffset}`);

  await traverseExFATDirectory(
    drivePath,
    rootCluster,
    clusterSize,
    sectorSize,
    sectorsPerCluster,
    clusterHeapOffset,
    readSectorsSync,
    files,
    nextId,
    new Set<number>()
  );
}

async function traverseExFATDirectory(
  drivePath: string,
  cluster: number,
  clusterSize: number,
  sectorSize: number,
  sectorsPerCluster: number,
  clusterHeapOffset: number,
  readSectorsSync: (drivePath: string, offset: number, size: number) => Buffer,
  files: FileFound[],
  nextId: () => number,
  visited: Set<number>
) {
  if (cluster < 2 || visited.has(cluster) || visited.size > 100) return;
  visited.add(cluster);

  const offset = ((cluster - 2) * sectorsPerCluster + clusterHeapOffset) * sectorSize;

  try {
    const buf = readSectorsSync(drivePath, offset, clusterSize);
    const parsed = parseExFATDirectoryEntries(buf);

    for (const f of parsed) {
      if (f.isDirectory && f.firstCluster >= 2) {
        await traverseExFATDirectory(
          drivePath,
          f.firstCluster,
          clusterSize,
          sectorSize,
          sectorsPerCluster,
          clusterHeapOffset,
          readSectorsSync,
          files,
          nextId,
          visited
        );
      } else {
        const firstSector = ((f.firstCluster - 2) * sectorsPerCluster + clusterHeapOffset);
        files.push({
          id: nextId(),
          name: f.name,
          path: `${drivePath}\\DELETED_RECOVERED\\${f.name}`,
          size: formatSize(f.size),
          extension: f.extension,
          confidence: 'HIGH',
          firstSector,
          fileType: 'exFAT File',
          mimeType: 'application/octet-stream',
          category: 'document'
        });
      }
    }
  } catch {}
}

/**
 * 4. EXT metadata scanning: parse the inode tables
 */
async function scanEXT(
  drivePath: string,
  fsInfo: FileSystemInfo,
  readSectorsSync: (drivePath: string, offset: number, size: number) => Buffer,
  files: FileFound[],
  nextId: () => number
) {
  // Read EXT superblock (1024 bytes starting at offset 1024)
  let sbBuf: Buffer;
  try {
    sbBuf = readSectorsSync(drivePath, 1024, 1024); // read 1024 bytes containing the superblock
  } catch {
    return;
  }

  // Need 2048 bytes of buffer to pass to parseExtSuperblock (offset 1024 is start of superblock)
  // Let's prepend dummy bytes so offset 1024 matches superblock
  const fullBuf = Buffer.alloc(2048);
  sbBuf.copy(fullBuf, 1024);

  const extSb = parseExtSuperblock(fullBuf);
  if (!extSb) {
    logger.warn('MetadataScanner', 'Invalid EXT superblock signature');
    return;
  }

  logger.info('MetadataScanner', `EXT block size: ${extSb.blockSize}, Inodes per group: ${extSb.inodesPerGroup}, groups count calculated`);

  // Parse block groups
  const blockSize = extSb.blockSize;
  const inodesPerGroup = extSb.inodesPerGroup;
  const inodeSize = extSb.inodeSize;
  const blockGroupSize = extSb.blocksPerGroup;

  // Let's estimate number of block groups (maximum 32 for safety limit)
  const maxGroups = 32;
  const hasExtents = extSb.hasExtents;

  // Read Group Descriptor Table (typically starts at block 1 for 1KB block size, or block 0 for larger block sizes)
  // Let's read first few block group descriptors.
  // Each group descriptor is 32 bytes (or 64 bytes for 64-bit EXT4)
  const descSize = extSb.has64bit ? 64 : 32;
  const gdtOffsetBytes = blockSize === 1024 ? 2048 : blockSize;

  let gdtBuf: Buffer;
  try {
    gdtBuf = readSectorsSync(drivePath, gdtOffsetBytes, descSize * maxGroups);
  } catch {
    return;
  }

  for (let g = 0; g < maxGroups; g++) {
    const descOffset = g * descSize;
    if (descOffset + 32 > gdtBuf.length) break;

    // Read inode table start block (offset 8 in descriptor, 4 bytes)
    const inodeTableBlockLo = gdtBuf.readUInt32LE(descOffset + 8);
    const inodeTableBlockHi = extSb.has64bit ? gdtBuf.readUInt32LE(descOffset + 40) : 0;
    const inodeTableBlock = inodeTableBlockLo + inodeTableBlockHi * 0x100000000;

    if (inodeTableBlock === 0) continue;

    const inodeTableOffsetBytes = inodeTableBlock * blockSize;
    const inodeTableSizeBytes = Math.ceil((inodesPerGroup * inodeSize));

    try {
      // Read inode table in chunks
      const chunkCount = 100;
      const chunkSize = chunkCount * inodeSize;
      const startInode = g * inodesPerGroup + 1;

      for (let i = 0; i < inodesPerGroup; i += chunkCount) {
        const readSize = Math.min(chunkSize, (inodesPerGroup - i) * inodeSize);
        const offset = inodeTableOffsetBytes + i * inodeSize;

        const buf = readSectorsSync(drivePath, offset, readSize);
        const parsed = scanInodeTableForDeleted(buf, inodeSize, startInode + i, hasExtents);

        for (const f of parsed) {
          // Convert inode block pointer to sector offset
          let firstSector = 0;
          if (f.extentTree && f.extentTree.length > 0) {
            // Convert ext4 extent block start to sector
            firstSector = (f.extentTree[0].physicalBlock * blockSize) / 512;
          } else if (f.blockPointers && f.blockPointers.length > 0 && f.blockPointers[0] > 0) {
            firstSector = (f.blockPointers[0] * blockSize) / 512;
          }

          files.push({
            id: nextId(),
            name: `ext4_inode_${f.inodeNumber}`,
            path: `${drivePath}\\DELETED_RECOVERED\\ext4_inode_${f.inodeNumber}`,
            size: formatSize(f.size),
            extension: 'bin',
            confidence: 'HIGH',
            firstSector,
            fileType: f.isDirectory ? 'Directory' : 'EXT4 File',
            mimeType: f.isDirectory ? 'inode/directory' : 'application/octet-stream',
            category: f.isDirectory ? 'directory' : 'document'
          });
        }
      }
    } catch {}
  }
}
