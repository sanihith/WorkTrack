package com.taskportal.controller;

import com.taskportal.service.JwtService;
import com.taskportal.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

import com.taskportal.entity.User;
import com.taskportal.entity.User;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletResponse;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserService userService;


    @GetMapping("/login")
    public void loginRedirect(HttpServletResponse response) throws java.io.IOException {
        response.sendRedirect("/oauth2/authorization/azure");
    }

    /**
     * Dev bypass: returns JWT for any existing user by ID.
     * No real authentication — for development only.
     */
    @GetMapping("/dev-users")
    public ResponseEntity<?> getDevUsers() {
        return ResponseEntity.ok(userService.findAll().stream()
            .map(u -> Map.of(
                "id", u.getId(),
                "name", u.getName(),
                "email", u.getEmail(),
                "role", u.getRole()
            ))
            .toList());
    }

    @PostMapping("/dev-login")
    public ResponseEntity<?> devLogin(@RequestBody Map<String, Long> payload) {
        Long userId = payload.get("userId");
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId required"));
        }
        var userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        String token = jwtService.generateTokenWithUserIdAndRole(user.getId(), user.getEmail(), user.getRole());
        return ResponseEntity.ok(Map.of("token", token, "userId", user.getId()));
    }

    @GetMapping("/callback")
    public ResponseEntity<?> callback(@RequestParam(required = false) String code, @RequestParam(required = false) String error) {
        if (error != null) {
            return ResponseEntity.badRequest().body(Map.of("error", error));
        }
        String demoEmail = "demo@company.com";
        String token = jwtService.generateToken(demoEmail);
        return ResponseEntity.ok(Map.of(
            "token", token,
            "type", "Bearer",
            "email", demoEmail
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "No token provided"));
        }
        
        String token = authHeader.substring(7);
        String email = jwtService.extractUsername(token);
        
        if (email == null || email.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }
        
        var userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }
        
        User u = userOpt.get();
        Long managerId = null;
        String managerEmail = null;
        try {
            if (u.getManager() != null) {
                managerId = u.getManager().getId();
                managerEmail = u.getManager().getEmail();
            }
        } catch (Exception ignored) {}
        
        Map<String, Object> response = new HashMap<>();
        response.put("id", u.getId());
        response.put("email", u.getEmail());
        response.put("name", u.getName());
        response.put("employeeId", u.getEmployeeId());
        response.put("role", u.getRole());
        response.put("managerId", managerId);
        response.put("managerEmail", managerEmail);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/teams-token")
    public ResponseEntity<?> teamsToken(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String displayName = payload.get("displayName");
        
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email required"));
        }
        
        // Find or create user
        User user = userService.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                .email(email)
                .name(displayName != null ? displayName : email)
                .employeeId(email.contains("@") ? email.substring(0, email.indexOf("@")).toUpperCase() : email)
                .role("USER")
                .build();
            return userService.save(newUser);
        });
        
        String token = jwtService.generateTokenWithUserIdAndRole(user.getId(), email, user.getRole());
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}