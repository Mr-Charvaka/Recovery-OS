package com.recovery.server.repository;

import com.recovery.server.entity.ScanJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ScanJobRepository extends JpaRepository<ScanJob, Long> {
}
