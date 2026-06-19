package com.taskportal.controller;

import com.taskportal.entity.Comment;
import com.taskportal.entity.CommentType;
import com.taskportal.entity.Request;
import com.taskportal.entity.User;
import com.taskportal.repository.CommentRepository;
import com.taskportal.repository.UserRepository;
import com.taskportal.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/requests/{requestId}/comments")
@CrossOrigin(origins = "http://localhost:5173")
public class CommentController {

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<Comment>> getComments(@PathVariable Long requestId) {
        return ResponseEntity.ok(commentRepository.findByRequestIdOrderByCreatedAtAsc(requestId));
    }

    @PostMapping
    public ResponseEntity<Comment> addComment(
            @PathVariable Long requestId,
            @RequestBody Comment comment,
            Authentication authentication) {
        
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Request request = new Request();
        request.setId(requestId);
        
        comment.setRequest(request);
        comment.setCreatedBy(user);
        
        Comment saved = commentRepository.save(comment);
        
        // Trigger notifications
        try {
            notificationService.sendCommentNotification(saved);
        } catch (Exception e) {
            System.err.println("Failed to trigger comment notifications: " + e.getMessage());
        }
        
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteComments(
            @PathVariable Long requestId,
            @RequestBody BulkDeleteCommentsRequest payload,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean isManager = user.getRole() != null && (
                user.getRole().equals("MANAGER") ||
                user.getRole().equals("DIRECTOR") ||
                user.getRole().equals("ADMIN"));

        List<Long> ids = payload.getIds() != null ? payload.getIds() : Collections.emptyList();
        int deleted = 0;
        int skipped = 0;

        for (Long commentId : ids) {
            try {
                Optional<Comment> opt = commentRepository.findById(commentId);
                if (opt.isEmpty()) {
                    skipped++;
                    continue;
                }
                Comment comment = opt.get();
                if (comment.getRequest() == null || !comment.getRequest().getId().equals(requestId)) {
                    skipped++;
                    continue;
                }
                if (comment.getType() == CommentType.SYSTEM) {
                    skipped++;
                    continue;
                }
                boolean isOwner = comment.getCreatedBy() != null && comment.getCreatedBy().getId().equals(user.getId());
                if (!isOwner && !isManager) {
                    skipped++;
                    continue;
                }
                commentRepository.delete(comment);
                deleted++;
            } catch (Exception e) {
                System.err.println("Failed to delete comment " + commentId + ": " + e.getMessage());
                skipped++;
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("deleted", deleted);
        result.put("skipped", skipped);
        return ResponseEntity.ok(result);
    }
}
