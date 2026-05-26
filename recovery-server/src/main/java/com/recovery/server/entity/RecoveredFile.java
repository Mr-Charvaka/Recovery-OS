package com.recovery.server.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "recovered_files")
@Data
public class RecoveredFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long jobId;
    private String name;
    @Column(length = 2048)
    private String path;
    private String size;
    private String extension;
    private String confidence; // HIGH, MEDIUM, LOW
    private Long firstSector;
}
