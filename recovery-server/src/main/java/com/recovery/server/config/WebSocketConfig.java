package com.recovery.server.config;

import com.recovery.server.handler.ProgressWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final ProgressWebSocketHandler progressHandler;

    public WebSocketConfig(ProgressWebSocketHandler progressHandler) {
        this.progressHandler = progressHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(progressHandler, "/ws/scan-progress")
                .setAllowedOrigins("*");
    }
}
