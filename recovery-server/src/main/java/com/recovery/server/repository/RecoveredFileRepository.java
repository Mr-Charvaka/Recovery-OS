package com.recovery.server.repository;

import com.recovery.server.entity.RecoveredFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RecoveredFileRepository extends JpaRepository<RecoveredFile, Long> {
    List<RecoveredFile> findByJobId(Long jobId);
}
