const fs = require('fs');
const path = require('path');

// Target file: mock_drive.raw (512 KB)
const targetPath = path.join(__dirname, '../mock_drive.raw');
const sectorSize = 512;
const totalSectors = 1024;
const buffer = Buffer.alloc(totalSectors * sectorSize);

// Write some background random noise / zeroes
for (let i = 0; i < buffer.length; i++) {
  buffer[i] = Math.floor(Math.random() * 256);
}

// Helper to embed a mock file at a specific sector
function embedFile(sectorStart, dataBytes, filename) {
  const byteOffset = sectorStart * sectorSize;
  dataBytes.copy(buffer, byteOffset);
  console.log(`Embedded mock file [${filename}] at sector ${sectorStart} (offset 0x${byteOffset.toString(16)})`);
}

// 1. Embed Real Tiny Valid JPEG at Sector 100
// Base64 of a tiny valid 1x1 pixel JPEG
const jpegB64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const jpegBytes = Buffer.from(jpegB64, 'base64');
embedFile(100, jpegBytes, "REAL_TINY.jpg");

// 2. Embed Real Tiny Valid PNG at Sector 400
// Base64 of a tiny valid 1x1 black pixel PNG
const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk4AIAAAoABagLkxYAAAAASUVORK5CYII=';
const pngBytes = Buffer.from(pngB64, 'base64');
embedFile(400, pngBytes, "REAL_TINY.png");

// 3. Embed Mock PDF at Sector 800
const pdfHeader = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
const pdfData = Buffer.alloc(1000, 0x77);
const pdfFooter = Buffer.from("\n%%EOF");
const pdfBytes = Buffer.concat([pdfHeader, pdfData, pdfFooter]);
embedFile(800, pdfBytes, "tax_report_2025.pdf");

// Save the mock_drive.raw file
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, buffer);
console.log(`Mock drive successfully created at: ${targetPath}`);
console.log(`Size: ${buffer.length} bytes (512 KB)`);
