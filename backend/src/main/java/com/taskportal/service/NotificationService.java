package com.taskportal.service;

import com.taskportal.entity.Comment;
import com.taskportal.entity.Notification;
import com.taskportal.entity.Request;
import com.taskportal.entity.User;
import com.taskportal.repository.NotificationRepository;
import com.taskportal.repository.RequestRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private RequestRepository requestRepository;

    public void sendAssignmentNotification(Request request) {
        if (request.getAssignedTo() == null || request.getAssignedTo().getEmail() == null) {
            return;
        }
        System.out.println("[NotificationService] Creating assignment notification for userId=" + request.getAssignedTo().getId() + ", requestId=" + request.getId());

        // 1. Create in-app notification for the assignee
        Notification inApp = Notification.builder()
            .user(request.getAssignedTo())
            .message("You have been assigned a new task: " + request.getSubject())
            .requestId(request.getId())
            .senderId(request.getCreatedBy() != null ? request.getCreatedBy().getId() : null)
            .senderName(request.getCreatedBy() != null ? request.getCreatedBy().getName() : null)
            .build();
        notificationRepository.save(inApp);

        // 2. Send email notification
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom("worktrack@localhost");
            helper.setTo(request.getAssignedTo().getEmail());
            
            // Add CCs
            if (request.getCcUsers() != null && !request.getCcUsers().isEmpty()) {
                String[] ccArray = request.getCcUsers().stream()
                    .map(u -> u.getUser().getEmail())
                    .toArray(String[]::new);
                helper.setCc(ccArray);
            }

            helper.setSubject("WorkTrack | New Task: " + request.getSubject());

            String priorityColor = "HIGH".equals(request.getPriority()) ? "#ef5350" : "#66bb6a";

            String htmlContent = String.format(
                "<div style='font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #eee; border-radius: 8px; overflow: hidden;'>" +
                "  <div style='background-color: #5B5FC7; color: white; padding: 20px;'>" +
                "    <h2 style='margin: 0;'>New Task Assigned</h2>" +
                "  </div>" +
                "  <div style='padding: 20px;'>" +
                "    <h3 style='color: #333; margin-top: 0;'>%s</h3>" +
                "    <div style='display: flex; gap: 10px; margin-bottom: 20px;'>" +
                "      <span style='background: %s; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;'>%s</span>" +
                "      <span style='background: #eee; color: #666; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;'>%s</span>" +
                "    </div>" +
                "    <p><strong>Due Date:</strong> <span style='color: #ef5350;'>%s</span></p>" +
                "    <p style='color: #666; line-height: 1.6;'>%s</p>" +
                "    <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;' />" +
                "    <p style='font-size: 12px; color: #999;'>Sent by WorkTrack Pro. View this task in your dashboard.</p>" +
                "  </div>" +
                "</div>",
                request.getSubject(),
                priorityColor,
                request.getPriority(),
                request.getStatus(),
                request.getRequestedByDate(),
                request.getExplanation()
            );

            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send HTML notification: " + e.getMessage());
        }
    }

    public void sendStatusChangeNotification(Request request, String oldStatus, String newStatus, User actor) {
        System.out.println("[NotificationService] Status change for requestId=" + request.getId() + ", old=" + oldStatus + ", new=" + newStatus + ", actorId=" + (actor != null ? actor.getId() : "null"));
        Set<User> recipients = new HashSet<>();

        // Notify both creator and assignee
        if (request.getCreatedBy() != null) {
            recipients.add(request.getCreatedBy());
        }
        if (request.getAssignedTo() != null) {
            recipients.add(request.getAssignedTo());
        }

        // Don't notify the person who changed the status
        if (actor != null) {
            recipients.removeIf(u -> u.getId().equals(actor.getId()));
        }

        if (recipients.isEmpty()) {
            System.out.println("[NotificationService] No recipients for status change after removing actor.");
            return;
        }

        System.out.println("[NotificationService] Recipients for status change: " + recipients.stream().map(User::getId).collect(Collectors.toList()));

        for (User recipient : recipients) {
            System.out.println("[NotificationService] Saving status-change notification for recipientId=" + recipient.getId());
            Notification notification = Notification.builder()
                .user(recipient)
                .message(request.getSubject() + " changed from " + oldStatus.toLowerCase() + " to " + newStatus.toLowerCase())
                .requestId(request.getId())
                .senderId(actor != null ? actor.getId() : null)
                .senderName(actor != null ? actor.getName() : null)
                .build();

            notificationRepository.save(notification);
            System.out.println("[NotificationService] Saved notification id=" + notification.getId());
        }
    }

    public void sendCommentNotification(Comment comment) {
        Long requestId = comment.getRequest().getId();
        Request request = requestRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Request not found"));

        Set<User> recipients = new HashSet<>();
        
        // Add creator
        if (request.getCreatedBy() != null) {
            recipients.add(request.getCreatedBy());
        }
        
        // Add assignee
        if (request.getAssignedTo() != null) {
            recipients.add(request.getAssignedTo());
        }
        
        // Add CCs
        if (request.getCcUsers() != null) {
            request.getCcUsers().forEach(cc -> recipients.add(cc.getUser()));
        }

        // Exclude the person who made the comment
        recipients.removeIf(u -> u.getId().equals(comment.getCreatedBy().getId()));

        for (User recipient : recipients) {
            // 1. Create In-App Notification
            Notification notification = Notification.builder()
                .user(recipient)
                .message("New comment on: " + request.getSubject())
                .requestId(requestId)
                .senderId(comment.getCreatedBy().getId())
                .senderName(comment.getCreatedBy().getName())
                .build();
            notificationRepository.save(notification);

            // 2. Send Email Notification
            sendCommentEmail(recipient, request, comment);
        }
    }

    private void sendCommentEmail(User recipient, Request request, Comment comment) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(recipient.getEmail());
            helper.setSubject("WorkTrack | New Comment on " + request.getSubject());

            String htmlContent = String.format(
                "<div style='font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #eee; border-radius: 8px; overflow: hidden;'>" +
                "  <div style='background-color: #5B5FC7; color: white; padding: 20px;'>" +
                "    <h2 style='margin: 0;'>New Comment Added</h2>" +
                "  </div>" +
                "  <div style='padding: 20px;'>" +
                "    <p><strong>%s</strong> added a comment to <strong>%s</strong>:</p>" +
                "    <div style='background-color: #f9f9f9; padding: 15px; border-left: 4px solid #5B5FC7; font-style: italic; color: #555;'>" +
                "      %s" +
                "    </div>" +
                "    <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;' />" +
                "    <p style='font-size: 12px; color: #999;'>Sent by WorkTrack Pro. View this thread in your dashboard.</p>" +
                "  </div>" +
                "</div>",
                comment.getCreatedBy().getName(),
                request.getSubject(),
                comment.getContent().replace("\n", "<br/>")
            );

            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send comment email: " + e.getMessage());
        }
    }
}