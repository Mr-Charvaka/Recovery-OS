package com.recovery.server.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class ScanMetricsService {
    private final Counter filesFoundCounter;
    private final Counter recoverySuccessCounter;
    private final Counter recoveryFailureCounter;
    private final AtomicReference<Double> currentScanSpeed = new AtomicReference<>(0.0);

    public ScanMetricsService(MeterRegistry registry) {
        // Register custom Prometheus metrics
        this.filesFoundCounter = Counter.builder("recovery_files_found_total")
                .description("Total number of files carved from disks")
                .register(registry);

        this.recoverySuccessCounter = Counter.builder("recovery_extractions_success_total")
                .description("Total successful file extractions")
                .register(registry);

        this.recoveryFailureCounter = Counter.builder("recovery_extractions_failure_total")
                .description("Total failed file extractions")
                .register(registry);

        // Register gauge for scanning speed
        registry.gauge("recovery_scan_speed_gbs", currentScanSpeed, ref -> ref.get());
    }

    public void incrementFilesFound(int count) {
        filesFoundCounter.increment(count);
    }

    public void incrementSuccess() {
        recoverySuccessCounter.increment();
    }

    public void incrementFailure() {
        recoveryFailureCounter.increment();
    }

    public void setScanSpeed(double speedGbS) {
        currentScanSpeed.set(speedGbS);
    }
}
