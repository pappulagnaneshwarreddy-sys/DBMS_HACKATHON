package com.relieflink.inventory.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "HEALTHY");
        response.put("service", "RELIEFLINK 360 Inventory & Dispatch Microservice (Spring Boot)");
        response.put("transactional_engine", "PostgreSQL ACID with Row-Level Locking");
        return ResponseEntity.ok(response);
    }
}
