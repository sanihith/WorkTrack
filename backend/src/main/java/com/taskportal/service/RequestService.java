package com.taskportal.service;

import com.taskportal.entity.Comment;
import com.taskportal.entity.CommentType;
import com.taskportal.entity.Request;
import com.taskportal.entity.RequestCc;
import com.taskportal.entity.User;
import com.taskportal.repository.RequestRepository;
import com.taskportal.repository.UserRepository;
import com.taskportal.repository.CommentRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class RequestService {

    @Autowired
    private RequestRepository requestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CommentRepository commentRepository;

    public Request create(Request request, Long createdById, String assignedToEmail, List<String> ccEmails) {
        User createdBy = userRepository.findById(createdById)
            .orElseThrow(() -> new RuntimeException("User not found: " + createdById));
        request.setCreatedBy(createdBy);
        
        if (assignedToEmail != null && !assignedToEmail.isBlank()) {
            User assignedTo = userRepository.findByEmail(assignedToEmail.trim())
                .orElseThrow(() -> new RuntimeException("Assigned user not found: " + assignedToEmail));
            request.setAssignedTo(assignedTo);
        }
        
        Request saved = requestRepository.save(request);
        
        // Handle CC users
        if (ccEmails != null && !ccEmails.isEmpty()) {
            for (String ccEmail : ccEmails) {
                if (ccEmail != null && !ccEmail.trim().isBlank()) {
                    userRepository.findByEmail(ccEmail.trim()).ifPresent(ccUser -> {
                        RequestCc requestCc = RequestCc.builder()
                            .request(saved)
                            .user(ccUser)
                            .build();
                        saved.getCcUsers().add(requestCc);
                    });
                }
            }
            requestRepository.save(saved);
        }
        
        // Send notification if assigned
        if (assignedToEmail != null && !assignedToEmail.isBlank()) {
            try {
                notificationService.sendAssignmentNotification(saved);
            } catch (Exception e) {
                System.err.println("Failed to send assignment notification: " + e.getMessage());
            }
        }
        
        return saved;
    }

    public Optional<Request> findById(Long id) {
        return requestRepository.findById(id);
    }

    public List<Request> findByCreatedBy(Long userId) {
        return requestRepository.findByCreatedById(userId);
    }

    public List<Request> findByAssignedTo(Long userId) {
        return requestRepository.findByAssignedToId(userId);
    }

    public List<Request> findByStatus(String status) {
        return requestRepository.findByStatus(status);
    }

    public List<Request> findByAssignedToAndStatus(Long userId, String status) {
        return requestRepository.findByAssignedToIdAndStatus(userId, status);
    }

    public List<Request> findMyDayTasks(Long userId) {
        return requestRepository.findByAssignedToIdAndIsMyDayTrue(userId);
    }

    public List<Request> findImportantTasks(Long userId) {
        return requestRepository.findByAssignedToIdAndIsImportantTrue(userId);
    }

    public List<Request> findAll() {
        return requestRepository.findAll();
    }

    public Request update(Long id, Request updated, String actingUserEmail) {
        Request existing = requestRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Request not found: " + id));
        
        User actingUser = null;
        if (actingUserEmail != null) {
            actingUser = userRepository.findByEmail(actingUserEmail).orElse(null);
        }
        // Fallback to creator if no acting user found
        if (actingUser == null) {
            actingUser = existing.getCreatedBy();
        }

        if (updated.getSubject() != null && !updated.getSubject().isBlank()) {
            existing.setSubject(updated.getSubject());
        }
        if (updated.getExplanation() != null) {
            existing.setExplanation(updated.getExplanation());
        }
        
        // Log Due Date change
        if (updated.getRequestedByDate() != null && !updated.getRequestedByDate().equals(existing.getRequestedByDate())) {
            String oldDate = existing.getRequestedByDate() != null ? existing.getRequestedByDate().toString() : "None";
            existing.setRequestedByDate(updated.getRequestedByDate());
            

        }

        if (updated.getPriority() != null && !updated.getPriority().isBlank()) {
            existing.setPriority(updated.getPriority());
        }

        // Log Status change
        if (updated.getStatus() != null && !updated.getStatus().isBlank() && !updated.getStatus().equals(existing.getStatus())) {
            String oldStatus = existing.getStatus();
            existing.setStatus(updated.getStatus());
            logSystemComment(existing, existing.getSubject() + " changed from " + oldStatus.toLowerCase() + " to " + updated.getStatus().toLowerCase());
            try {
                notificationService.sendStatusChangeNotification(existing, oldStatus, updated.getStatus(), actingUser);
            } catch (Exception e) {
                System.err.println("Failed to send status change notification: " + e.getMessage());
            }
        }

        // Log Assignment change
        if (updated.getAssignedTo() != null && (existing.getAssignedTo() == null || !updated.getAssignedTo().getId().equals(existing.getAssignedTo().getId()))) {
            String oldAssignee = existing.getAssignedTo() != null ? existing.getAssignedTo().getName() : "Unassigned";
            
            // Note: updated.getAssignedTo() might only have an ID if it's coming from JSON
            User newAssignee = userRepository.findById(updated.getAssignedTo().getId())
                    .orElseThrow(() -> new RuntimeException("New assignee not found: " + updated.getAssignedTo().getId()));
            
            existing.setAssignedTo(newAssignee);

            // Trigger assignment notification
            try {
                notificationService.sendAssignmentNotification(existing);
            } catch (Exception e) {
                System.err.println("Failed to send reassignment notification: " + e.getMessage());
            }
        }

        if (updated.getIsMyDay() != null) {
            existing.setIsMyDay(updated.getIsMyDay());
        }
        if (updated.getIsImportant() != null) {
            existing.setIsImportant(updated.getIsImportant());
        }
        
        return requestRepository.save(existing);
    }



    public Request toggleMyDay(Long id) {
        Request existing = requestRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Request not found: " + id));
        existing.setIsMyDay(existing.getIsMyDay() != null ? !existing.getIsMyDay() : true);
        return requestRepository.save(existing);
    }

    public Request toggleImportant(Long id) {
        Request existing = requestRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Request not found: " + id));
        existing.setIsImportant(existing.getIsImportant() != null ? !existing.getIsImportant() : true);
        return requestRepository.save(existing);
    }

    public void delete(Long id) {
        requestRepository.deleteById(id);
    }

    private void logSystemComment(Request request, String content) {
        Comment systemComment = Comment.builder()
            .content(content)
            .type(CommentType.SYSTEM)
            .request(request)
            .createdBy(request.getCreatedBy() != null ? request.getCreatedBy() : request.getAssignedTo())
            .build();
        commentRepository.save(systemComment);
    }
}