package com.taskportal.controller;

import com.taskportal.entity.Request;
import com.taskportal.service.RequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/requests")
@CrossOrigin(origins = "http://localhost:5173")
public class RequestController {

    @Autowired
    private RequestService requestService;

    @PostMapping
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'DIRECTOR', 'ADMIN')")
    public ResponseEntity<Request> create(@RequestBody Map<String, Object> payload) {
        Request request = new Request();
        request.setSubject((String) payload.get("subject"));
        request.setExplanation((String) payload.get("explanation"));
        
        if (payload.get("requestedByDate") != null) {
            request.setRequestedByDate(java.time.LocalDate.parse((String) payload.get("requestedByDate")));
        }
        request.setPriority(payload.get("priority") != null ? (String) payload.get("priority") : "MEDIUM");
        request.setStatus(payload.get("status") != null ? (String) payload.get("status") : "OPEN");
        
        Long createdById = ((Number) payload.get("createdById")).longValue();
        String assignedToEmail = (String) payload.get("assignedToEmail");
        
        @SuppressWarnings("unchecked")
        List<String> ccEmails = (List<String>) payload.get("ccEmails");
        
        Request created = requestService.create(request, createdById, assignedToEmail, ccEmails);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Request> getById(@PathVariable Long id) {
        return requestService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/my-requests")
    public ResponseEntity<List<Request>> getMyRequests(@RequestParam Long userId) {
        return ResponseEntity.ok(requestService.findByCreatedBy(userId));
    }

    @GetMapping("/todos")
    public ResponseEntity<List<Request>> getTodos(@RequestParam Long userId) {
        return ResponseEntity.ok(requestService.findByAssignedTo(userId));
    }

    @GetMapping("/todos/status/{status}")
    public ResponseEntity<List<Request>> getTodosByStatus(@RequestParam Long userId, @PathVariable String status) {
        return ResponseEntity.ok(requestService.findByAssignedToAndStatus(userId, status));
    }

    @GetMapping("/my-day")
    public ResponseEntity<List<Request>> getMyDayTasks(@RequestParam Long userId) {
        return ResponseEntity.ok(requestService.findMyDayTasks(userId));
    }

    @GetMapping("/important")
    public ResponseEntity<List<Request>> getImportantTasks(@RequestParam Long userId) {
        return ResponseEntity.ok(requestService.findImportantTasks(userId));
    }

    @PatchMapping("/{id}/toggle-my-day")
    public ResponseEntity<Request> toggleMyDay(@PathVariable Long id) {
        return ResponseEntity.ok(requestService.toggleMyDay(id));
    }

    @PatchMapping("/{id}/toggle-important")
    public ResponseEntity<Request> toggleImportant(@PathVariable Long id) {
        return ResponseEntity.ok(requestService.toggleImportant(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'DIRECTOR', 'ADMIN')")
    public ResponseEntity<List<Request>> getAll() {
        return ResponseEntity.ok(requestService.findAll());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'DIRECTOR', 'ADMIN', 'USER')")
    public ResponseEntity<Request> update(
            @PathVariable Long id, 
            @RequestBody Request request,
            org.springframework.security.core.Authentication authentication) {
        try {
            String actingUserEmail = authentication != null ? authentication.getName() : null;
            return ResponseEntity.ok(requestService.update(id, request, actingUserEmail));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        requestService.delete(id);
        return ResponseEntity.noContent().build();
    }
}