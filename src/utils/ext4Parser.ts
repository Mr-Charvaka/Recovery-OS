/**
 * FileRestorer Pro — Real ext4/ext3/ext2 Parser
 * 
 * Parses actual ext filesystem structures to recover deleted files.
 * ext4 marks deleted inodes by setting dtime (deletion time) to non-zero
 * and clearing the inode from the directory entry.
 * 
 * Superblock: offset 1024, magic 0xEF53
 * Group Descriptors: follow superblock
 * Inode Table: per block group
 * 
 * NO MOCKS. Real Linux ext4 specification implementation.
 */

export interface ExtDeletedFile {
  inodeNumber: number;
  size: number;
  blockPointers: number[];    // Direct block pointers (first 12)
  indirectBlock: number;      // Single indirect block pointer
  doubleIndirectBlock: number;
  tripleIndirectBlock: number;
  deletionTime: Date;
  creationTime: Date | null;
  modificationTime: Date | null;
  mode: number;               // File permissions + type
  isDirectory: boolean;
  isRegularFile: boolean;
  linkCount: number;
  uid: number;
  gid: number;
  extentTree?: ExtentNode[];  // ext4 extent-based allocation
}

export interface ExtentNode {
  logicalBlock: number;
  physicalBlock: number;
  length: number;
}

export interface ExtSuperblockInfo {
  inodesCount: number;
  blocksCount: number;
  blockSize: number;
  blocksPerGroup: number;
  inodesPerGroup: number;
  inodeSize: number;
  volumeName: string;
  lastMountPath: string;
  featureIncompat: number;
  hasExtents: boolean;
  hasJournal: boolean;
  has64bit: boolean;
}

/**
 * Parse ext superblock from raw bytes.
 * Superblock starts at absolute offset 1024 from partition start.
 */
export function parseExtSuperblock(buffer: Buffer): ExtSuperblockInfo | null {
  // Buffer must contain at least the superblock (1024 bytes at offset 1024)
  if (buffer.length < 2048) return null;

  const sb = 1024; // Superblock offset

  // Verify magic number at offset 0x38 (56 decimal) within superblock
  const magic = buffer.readUInt16LE(sb + 56);
  if (magic !== 0xEF53) return null;

  const inodesCount = buffer.readUInt32LE(sb + 0);
  const blocksCountLo = buffer.readUInt32LE(sb + 4);
  const logBlockSize = buffer.readUInt32LE(sb + 24);
  const blockSize = 1024 << logBlockSize;
  const blocksPerGroup = buffer.readUInt32LE(sb + 32);
  const inodesPerGroup = buffer.readUInt32LE(sb + 40);

  // Inode size at offset 88 (default 128 for ext2, 256 for ext4)
  const inodeSize = buffer.readUInt16LE(sb + 88) || 128;

  // Volume name at offset 120 (16 bytes, null-terminated)
  const volumeName = buffer.subarray(sb + 120, sb + 136).toString('ascii').replace(/\0/g, '').trim();

  // Last mount path at offset 136 (64 bytes)
  const lastMountPath = buffer.subarray(sb + 136, sb + 200).toString('ascii').replace(/\0/g, '').trim();

  // Feature flags
  const featureCompat = buffer.readUInt32LE(sb + 96);
  const featureIncompat = buffer.readUInt32LE(sb + 100);
  const featureROCompat = buffer.readUInt32LE(sb + 104);

  const hasExtents = (featureIncompat & 0x0040) !== 0;
  const hasJournal = (featureIncompat & 0x0004) !== 0;
  const has64bit = (featureIncompat & 0x0002) !== 0;

  // 64-bit block count
  let blocksCount = blocksCountLo;
  if (has64bit && buffer.length >= sb + 340 + 4) {
    const blocksCountHi = buffer.readUInt32LE(sb + 336);
    blocksCount = blocksCountLo + blocksCountHi * 0x100000000;
  }

  return {
    inodesCount,
    blocksCount,
    blockSize,
    blocksPerGroup,
    inodesPerGroup,
    inodeSize,
    volumeName,
    lastMountPath,
    featureIncompat,
    hasExtents,
    hasJournal,
    has64bit,
  };
}


/**
 * Parse a single ext inode from raw bytes.
 * 
 * Standard inode structure (128 bytes minimum, 256 for ext4):
 *   Offset 0:   i_mode (2 bytes) — file type + permissions
 *   Offset 2:   i_uid (2 bytes) — owner UID low
 *   Offset 4:   i_size_lo (4 bytes) — file size low 32 bits
 *   Offset 8:   i_atime (4 bytes) — last access time (Unix timestamp)
 *   Offset 12:  i_ctime (4 bytes) — inode change time
 *   Offset 16:  i_mtime (4 bytes) — modification time
 *   Offset 20:  i_dtime (4 bytes) — deletion time (non-zero = DELETED)
 *   Offset 24:  i_gid (2 bytes) — group ID low
 *   Offset 26:  i_links_count (2 bytes)
 *   Offset 28:  i_blocks_lo (4 bytes) — blocks allocated (in 512-byte units)
 *   Offset 32:  i_flags (4 bytes)
 *   Offset 40-99: i_block[15] — block pointers (60 bytes)
 *     [0-11]:  Direct blocks (12 × 4 bytes)
 *     [12]:    Single indirect block
 *     [13]:    Double indirect block
 *     [14]:    Triple indirect block
 *   Offset 108: i_size_high (4 bytes, ext4 for large files)
 */
export function parseInode(inodeBuffer: Buffer, hasExtents: boolean): ExtDeletedFile | null {
  if (inodeBuffer.length < 128) return null;

  const mode = inodeBuffer.readUInt16LE(0);
  const uid = inodeBuffer.readUInt16LE(2);
  const sizeLo = inodeBuffer.readUInt32LE(4);
  const atime = inodeBuffer.readUInt32LE(8);
  const ctime = inodeBuffer.readUInt32LE(12);
  const mtime = inodeBuffer.readUInt32LE(16);
  const dtime = inodeBuffer.readUInt32LE(20);
  const gid = inodeBuffer.readUInt16LE(24);
  const linkCount = inodeBuffer.readUInt16LE(26);
  const flags = inodeBuffer.readUInt32LE(32);

  // File type from mode (top 4 bits of i_mode)
  const fileType = (mode >> 12) & 0xF;
  const isRegularFile = fileType === 8;  // S_IFREG
  const isDirectory = fileType === 4;    // S_IFDIR

  // A deleted inode has dtime != 0
  if (dtime === 0) return null;

  // Read block pointers
  const blockPointers: number[] = [];
  for (let i = 0; i < 12; i++) {
    blockPointers.push(inodeBuffer.readUInt32LE(40 + i * 4));
  }
  const indirectBlock = inodeBuffer.readUInt32LE(40 + 12 * 4);
  const doubleIndirectBlock = inodeBuffer.readUInt32LE(40 + 13 * 4);
  const tripleIndirectBlock = inodeBuffer.readUInt32LE(40 + 14 * 4);

  // Size (combine low and high for ext4)
  let size = sizeLo;
  if (inodeBuffer.length >= 112) {
    const sizeHi = inodeBuffer.readUInt32LE(108);
    size = sizeLo + sizeHi * 0x100000000;
  }

  // Parse extent tree if ext4 extents are used
  let extentTree: ExtentNode[] | undefined;
  if (hasExtents && (flags & 0x80000)) {  // EXT4_EXTENTS_FL
    extentTree = parseExtentHeader(inodeBuffer, 40);
  }

  return {
    inodeNumber: 0, // Caller sets this
    size,
    blockPointers,
    indirectBlock,
    doubleIndirectBlock,
    tripleIndirectBlock,
    deletionTime: new Date(dtime * 1000),
    creationTime: ctime ? new Date(ctime * 1000) : null,
    modificationTime: mtime ? new Date(mtime * 1000) : null,
    mode,
    isDirectory,
    isRegularFile,
    linkCount,
    uid,
    gid,
    extentTree,
  };
}


/**
 * Parse ext4 extent header and leaf/index nodes.
 * 
 * Extent header (12 bytes):
 *   Offset 0: eh_magic (0xF30A)
 *   Offset 2: eh_entries (number of valid entries)
 *   Offset 4: eh_max (max entries possible)
 *   Offset 6: eh_depth (0 = leaf nodes, >0 = index nodes)
 * 
 * Extent leaf (12 bytes each):
 *   Offset 0: ee_block (4 bytes) — logical block number
 *   Offset 4: ee_len (2 bytes) — number of blocks
 *   Offset 6: ee_start_hi (2 bytes) — physical block high
 *   Offset 8: ee_start_lo (4 bytes) — physical block low
 */
function parseExtentHeader(buffer: Buffer, offset: number): ExtentNode[] {
  if (buffer.length < offset + 12) return [];

  const magic = buffer.readUInt16LE(offset);
  if (magic !== 0xF30A) return [];

  const entries = buffer.readUInt16LE(offset + 2);
  const depth = buffer.readUInt16LE(offset + 6);
  const extents: ExtentNode[] = [];

  if (depth === 0) {
    // Leaf nodes — actual extent mappings
    for (let i = 0; i < entries; i++) {
      const entryOffset = offset + 12 + i * 12;
      if (entryOffset + 12 > buffer.length) break;

      const logicalBlock = buffer.readUInt32LE(entryOffset);
      const length = buffer.readUInt16LE(entryOffset + 4);
      const physicalHi = buffer.readUInt16LE(entryOffset + 6);
      const physicalLo = buffer.readUInt32LE(entryOffset + 8);
      const physicalBlock = physicalLo + physicalHi * 0x100000000;

      extents.push({
        logicalBlock,
        physicalBlock,
        length: length > 32768 ? length - 32768 : length, // Uninitialized extents have bit 15 set
      });
    }
  }
  // For depth > 0, we'd need to read index nodes and follow them to leaf blocks.
  // This requires additional disk reads, which the caller handles.

  return extents;
}


/**
 * Scan an inode table buffer for deleted inodes.
 * 
 * @param inodeTableBuffer - Raw inode table bytes
 * @param inodeSize - Size of each inode (128 or 256)
 * @param startInodeNumber - First inode number in this block group
 * @param hasExtents - Whether ext4 extents are used
 * @returns Array of deleted file inodes
 */
export function scanInodeTableForDeleted(
  inodeTableBuffer: Buffer,
  inodeSize: number,
  startInodeNumber: number,
  hasExtents: boolean
): ExtDeletedFile[] {
  const deleted: ExtDeletedFile[] = [];

  const inodeCount = Math.floor(inodeTableBuffer.length / inodeSize);

  for (let i = 0; i < inodeCount; i++) {
    const offset = i * inodeSize;
    const inodeBuf = inodeTableBuffer.subarray(offset, offset + Math.min(inodeSize, 256));

    const file = parseInode(inodeBuf, hasExtents);
    if (file) {
      file.inodeNumber = startInodeNumber + i;
      
      // Only include files with actual data
      if (file.isRegularFile && file.size > 0) {
        deleted.push(file);
      }
    }
  }

  return deleted;
}
