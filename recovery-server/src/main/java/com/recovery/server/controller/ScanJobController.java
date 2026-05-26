package com.recovery.server.controller;

import com.recovery.server.entity.RecoveredFile;
import com.recovery.server.entity.ScanJob;
import com.recovery.server.repository.RecoveredFileRepository;
import com.recovery.server.service.RecoveryQueueService;
import com.recovery.server.service.ScanMetricsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ScanJobController {
    private final RecoveryQueueService queueService;
    private final RecoveredFileRepository fileRepository;
    private final ScanMetricsService metricsService;
    private final RestTemplate restTemplate = new RestTemplate();

    public ScanJobController(
            RecoveryQueueService queueService,
            RecoveredFileRepository fileRepository,
            ScanMetricsService metricsService
    ) {
        this.queueService = queueService;
        this.fileRepository = fileRepository;
        this.metricsService = metricsService;
    }

    // 1. List Drives (REST API bridge to native worker)
    @GetMapping("/drives")
    public ResponseEntity<List<Map<String,Object>>> listDrives() {
        String workerUrl = "http://127.0.0.1:8081/drives";
        try {
            Map[] response = restTemplate.getForObject(workerUrl, Map[].class);
            if (response == null) return ResponseEntity.ok(List.of());
            // Remap snake_case Rust fields -> camelCase for React frontend
            List<Map<String,Object>> mapped = new java.util.ArrayList<>();
            for (Map raw : response) {
                Map<String,Object> m = new java.util.LinkedHashMap<>();
                m.put("name",       raw.getOrDefault("name", "UNKNOWN"));
                m.put("path",       raw.getOrDefault("path", ""));
                m.put("capacity",   raw.getOrDefault("capacity", "0 GB"));
                m.put("freeSpace",  raw.getOrDefault("free_space", "0 GB"));
                m.put("fileSystem", raw.getOrDefault("file_system", "NTFS"));
                m.put("isPrimary",  raw.getOrDefault("is_primary", false));
                m.put("type",       raw.getOrDefault("type", "SSD"));
                mapped.add(m);
            }
            return ResponseEntity.ok(mapped);
        } catch (Exception e) {
            return ResponseEntity.status(503).body(List.of(Map.of("error", "Rust worker unreachable: " + e.getMessage())));
        }
    }

    // 2. Submit Scan Job
    @PostMapping("/scan")
    public ResponseEntity<ScanJob> submitScan(@RequestBody Map<String, String> request) {
        String name = request.getOrDefault("drive_name", "Unknown Drive");
        String path = request.getOrDefault("drive_path", "mock_drive.raw");
        String type = request.getOrDefault("scan_type", "quick");
        
        ScanJob job = queueService.submitJob(name, path, type);
        return ResponseEntity.ok(job);
    }

    // 3. Get Recovered Files for a Job
    @GetMapping("/jobs/{jobId}/files")
    public ResponseEntity<List<RecoveredFile>> getRecoveredFiles(@PathVariable Long jobId) {
        List<RecoveredFile> files = fileRepository.findByJobId(jobId);
        return ResponseEntity.ok(files);
    }

    // 4. Execute Extraction (Slices binary chunks from worker over REST)
    @PostMapping("/recover")
    public ResponseEntity<Map<String, Object>> recoverFiles(@RequestBody Map<String, Object> request) {
        List<Integer> fileIds = (List<Integer>) request.get("file_ids");
        String destination = (String) request.getOrDefault("destination", "C:\\Recovery");

        File destDir = new File(destination);
        if (!destDir.exists()) {
            destDir.mkdirs();
        }

        int successCount = 0;
        String workerUrl = "http://127.0.0.1:8081/read";

        for (Integer fileId : fileIds) {
            Optional<RecoveredFile> fileOpt = fileRepository.findById(fileId.longValue());
            if (fileOpt.isEmpty()) continue;

            RecoveredFile file = fileOpt.get();

            // 1. Direct filesystem copy for file-level finds (Quick Scan)
            if (file.getFirstSector() == 0) {
                try {
                    File srcFile = new File(file.getPath());
                    if (srcFile.exists() && srcFile.isFile()) {
                        File outputFile = new File(destDir, file.getName());
                        java.nio.file.Files.copy(srcFile.toPath(), outputFile.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                        successCount++;
                        metricsService.incrementSuccess();
                        continue;
                    }
                } catch (Exception e) {
                    System.err.println("Direct filesystem copy failed for " + file.getName() + ": " + e.getMessage());
                }
            }

            // Set size based on type for carving request
            int readSize = file.getExtension().equalsIgnoreCase("jpg") ? 4096 : 8192;

            // Extract drive path from file path (e.g. \\\\.\\D: or mock_drive.raw)
            String drivePath = "mock_drive.raw";
            String fp = file.getPath();
            if (fp != null && fp.contains("\\DELETED_RECOVERED\\")) {
                drivePath = fp.substring(0, fp.indexOf("\\DELETED_RECOVERED\\"));
            }

            Map<String, Object> readReq = new HashMap<>();
            readReq.put("drive_path", drivePath);
            readReq.put("offset", file.getFirstSector() * 512);
            readReq.put("size", readSize);

            try {
                // Request raw bytes from Rust worker
                byte[] rawBytes = restTemplate.postForObject(workerUrl, readReq, byte[].class);
                
                if (rawBytes != null && rawBytes.length > 0) {
                    byte[] slicedBytes = sliceFileBytes(rawBytes, file.getExtension());
                    
                    File outputFile = new File(destDir, file.getName());
                    try (FileOutputStream fos = new FileOutputStream(outputFile)) {
                        fos.write(slicedBytes);
                    }
                    successCount++;
                    metricsService.incrementSuccess();
                } else {
                    metricsService.incrementFailure();
                }
            } catch (Exception e) {
                System.err.println("Failed to carve file " + file.getName() + ": " + e.getMessage());
                metricsService.incrementFailure();
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("filesRecovered", successCount);
        response.put("destinationPath", destination);

        return ResponseEntity.ok(response);
    }

    private byte[] sliceFileBytes(byte[] rawBytes, String ext) {
        int length = rawBytes.length;
        
        if (ext.equalsIgnoreCase("jpg")) {
            // Find JPEG Footer FF D9
            for (int i = 0; i < rawBytes.length - 1; i++) {
                if ((rawBytes[i] & 0xFF) == 0xFF && (rawBytes[i + 1] & 0xFF) == 0xD9) {
                    length = i + 2;
                    break;
                }
            }
        } else if (ext.equalsIgnoreCase("png")) {
            // Find PNG Footer: IEND signature
            byte[] iend = {0x49, 0x45, 0x4E, 0x44, (byte) 0xAE, 0x42, 0x60, (byte) 0x82};
            int index = indexOf(rawBytes, iend);

            if (index != -1) {
                length = index + 12;
            }
        } else if (ext.equalsIgnoreCase("pdf")) {
            // Find PDF Footer %%EOF
            byte[] eof = "%%EOF".getBytes();
            int index = indexOf(rawBytes, eof);
            if (index != -1) {
                length = index + 5;
            }
        }

        return Arrays.copyOfRange(rawBytes, 0, Math.min(length, rawBytes.length));
    }

    private int indexOf(byte[] array, byte[] target) {
        for (int i = 0; i <= array.length - target.length; i++) {
            boolean found = true;
            for (int j = 0; j < target.length; j++) {
                if (array[i + j] != target[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return i;
        }
        return -1;
    }
}
