package com.recovery.server.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "scan_jobs")
@Data
public class ScanJob {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String driveName;
    private String drivePath;
    private String scanType;
    private String status; // PENDING, RUNNING, COMPLETED, FAILED
    private Integer filesFound = 0;
    private Double scanSpeed = 0.0; // GB/s

    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
