package com.taskportal.controller;

import com.taskportal.entity.User;
import com.taskportal.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<List<User>> getAll() {
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getById(@PathVariable Long id) {
        return userService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/reportees")
    public ResponseEntity<List<User>> getReportees(@RequestParam Long managerId) {
        List<User> reportees = userService.findReportees(managerId);
        List<User> ccUsers = userService.findReporteesAndCc(managerId);
        // Remove duplicates and return combined list
        reportees.removeAll(ccUsers);
        reportees.addAll(ccUsers);
        return ResponseEntity.ok(reportees);
    }

    @GetMapping("/manager")
    public ResponseEntity<User> getManager(@RequestParam Long userId) {
        return userService.findManager(userId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<User> create(@RequestBody User user) {
        return ResponseEntity.ok(userService.save(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> update(@PathVariable Long id, @RequestBody User user) {
        user.setId(id);
        return ResponseEntity.ok(userService.save(user));
    }
}