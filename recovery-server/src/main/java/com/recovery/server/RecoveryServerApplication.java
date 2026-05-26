package com.recovery.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class RecoveryServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(RecoveryServerApplication.class, args);
    }
}
