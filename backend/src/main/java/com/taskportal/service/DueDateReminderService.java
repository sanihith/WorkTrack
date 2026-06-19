package com.taskportal.service;

import com.taskportal.entity.Request;
import com.taskportal.repository.RequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Scheduled service that sends reminders when tasks are nearing their due date.
 * Runs daily at 9:00 AM.
 * 
 * Reminder schedule:
 *   5 days before  → INFO reminder
 *   2 days before  → WARNING reminder  
 *   1 day before   → URGENT reminder
 *   Due today      → OVERDUE alert
 *   Past due date  → PAST DUE alert (daily until status changes)
 */
@Service
public class DueDateReminderService {

    private static final Logger log = LoggerFactory.getLogger(DueDateReminderService.class);

    @Autowired
    private RequestRepository requestRepository;

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private NotificationService notificationService;

    /**
     * Runs daily at 9:00 AM.
     * Cron: second minute hour day-of-month month day-of-week
     */
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional(readOnly = true)
    public void sendDueDateReminders() {
        log.info("Running due date reminder check");
        List<Request> openRequests = requestRepository.findByStatus("OPEN");
        List<Request> inProgressRequests = requestRepository.findByStatus("IN_PROGRESS");
        
        int reminderCount = 0;
        
        for (Request request : openRequests) {
            if (request.getAssignedTo() == null || request.getRequestedByDate() == null) continue;
            reminderCount += checkAndSendReminder(request, "OPEN");
        }
        
        for (Request request : inProgressRequests) {
            if (request.getAssignedTo() == null || request.getRequestedByDate() == null) continue;
            reminderCount += checkAndSendReminder(request, "IN_PROGRESS");
        }
        
        log.info("Due date reminder check complete. Reminders sent: {}", reminderCount);
    }

    private int checkAndSendReminder(Request request, String currentStatus) {
        LocalDate today = LocalDate.now();
        LocalDate dueDate = request.getRequestedByDate();
        
        long daysUntilDue = java.time.temporal.ChronoUnit.DAYS.between(today, dueDate);
        
        String assigneeEmail = request.getAssignedTo().getEmail();
        String assigneeName = request.getAssignedTo().getName();
        String requesterName = request.getCreatedBy() != null ? request.getCreatedBy().getName() : "Unknown";
        String subject = request.getSubject();
        
        if (daysUntilDue < 0) {
            // Past due — send daily past-due alert
            sendReminderEmail(
                assigneeEmail,
                assigneeName,
                subject,
                requesterName,
                dueDate,
                daysUntilDue,
                "PAST_DUE",
                request.getId()
            );
            return 1;
        } else if (daysUntilDue == 0) {
            // Due today
            sendReminderEmail(
                assigneeEmail,
                assigneeName,
                subject,
                requesterName,
                dueDate,
                daysUntilDue,
                "OVERDUE_TODAY",
                request.getId()
            );
            return 1;
        } else if (daysUntilDue == 1) {
            // Due tomorrow
            sendReminderEmail(
                assigneeEmail,
                assigneeName,
                subject,
                requesterName,
                dueDate,
                daysUntilDue,
                "DUE_TOMORROW",
                request.getId()
            );
            return 1;
        } else if (daysUntilDue == 2) {
            // Due in 2 days
            sendReminderEmail(
                assigneeEmail,
                assigneeName,
                subject,
                requesterName,
                dueDate,
                daysUntilDue,
                "DUE_IN_2_DAYS",
                request.getId()
            );
            return 1;
        } else if (daysUntilDue == 5) {
            // Due in 5 days
            sendReminderEmail(
                assigneeEmail,
                assigneeName,
                subject,
                requesterName,
                dueDate,
                daysUntilDue,
                "DUE_IN_5_DAYS",
                request.getId()
            );
            return 1;
        }
        
        return 0;
    }

    private void sendReminderEmail(
            String assigneeEmail,
            String assigneeName,
            String taskSubject,
            String requesterName,
            LocalDate dueDate,
            long daysUntilDue,
            String reminderType,
            Long requestId
    ) {
        try {
            String urgency;
            String body;
            
            switch (reminderType) {
                case "PAST_DUE" -> {
                    urgency = "⚠️ PAST DUE";
                    body = buildPastDueEmail(assigneeName, taskSubject, requesterName, dueDate, requestId);
                }
                case "OVERDUE_TODAY" -> {
                    urgency = "🚨 DUE TODAY";
                    body = buildDueTodayEmail(assigneeName, taskSubject, requesterName, dueDate, requestId);
                }
                case "DUE_TOMORROW" -> {
                    urgency = "⚡ DUE TOMORROW";
                    body = buildUrgentEmail(assigneeName, taskSubject, requesterName, dueDate, requestId);
                }
                case "DUE_IN_2_DAYS" -> {
                    urgency = "🔶 DUE IN 2 DAYS";
                    body = buildWarningEmail(assigneeName, taskSubject, requesterName, dueDate, requestId);
                }
                case "DUE_IN_5_DAYS" -> {
                    urgency = "ℹ️ DUE IN 5 DAYS";
                    body = buildInfoEmail(assigneeName, taskSubject, requesterName, dueDate, requestId);
                }
                default -> {
                    urgency = "📅 REMINDER";
                    body = buildInfoEmail(assigneeName, taskSubject, requesterName, dueDate, requestId);
                }
            }
            
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(assigneeEmail);
            message.setSubject(String.format("[%s] Task: %s", urgency, taskSubject));
            message.setText(body);
            mailSender.send(message);
            
            log.info("Sent {} reminder to {} for task ID {}", reminderType, assigneeEmail, requestId);
        } catch (Exception e) {
            log.error("Failed to send {} reminder to {}: {}", reminderType, assigneeEmail, e.getMessage());
        }
    }

    private String buildInfoEmail(String name, String task, String requester, LocalDate due, Long id) {
        return String.format(
            "Hi %s,\n\n" +
            "Just a friendly reminder that the following task is due in 5 days:\n\n" +
            "Task: %s\n" +
            "Requested by: %s\n" +
            "Due date: %s (%s)\n\n" +
            "Please plan accordingly.\n\n" +
            "Task Portal",
            name, task, requester, due, due.getDayOfWeek().name().toLowerCase()
        );
    }

    private String buildWarningEmail(String name, String task, String requester, LocalDate due, Long id) {
        return String.format(
            "Hi %s,\n\n" +
            "This is a reminder that the following task is due in 2 days:\n\n" +
            "Task: %s\n" +
            "Requested by: %s\n" +
            "Due date: %s (%s)\n\n" +
            "Please ensure this is completed on time.\n\n" +
            "Task Portal",
            name, task, requester, due, due.getDayOfWeek().name().toLowerCase()
        );
    }

    private String buildUrgentEmail(String name, String task, String requester, LocalDate due, Long id) {
        return String.format(
            "Hi %s,\n\n" +
            "⚡ IMPORTANT: The following task is due TOMORROW:\n\n" +
            "Task: %s\n" +
            "Requested by: %s\n" +
            "Due date: %s (%s)\n\n" +
            "Please prioritize this task.\n\n" +
            "Task Portal",
            name, task, requester, due, due.getDayOfWeek().name().toLowerCase()
        );
    }

    private String buildDueTodayEmail(String name, String task, String requester, LocalDate due, Long id) {
        return String.format(
            "Hi %s,\n\n" +
            "🚨 URGENT: The following task is due TODAY:\n\n" +
            "Task: %s\n" +
            "Requested by: %s\n" +
            "Due date: TODAY (%s)\n\n" +
            "Please complete this task immediately.\n\n" +
            "Task Portal",
            name, task, requester, due.getDayOfWeek().name().toLowerCase()
        );
    }

    private String buildPastDueEmail(String name, String task, String requester, LocalDate due, Long id) {
        return String.format(
            "Hi %s,\n\n" +
            "⚠️ OVERDUE: The following task was due on %s (%s) and is now past due:\n\n" +
            "Task: %s\n" +
            "Requested by: %s\n" +
            "Original due date: %s\n\n" +
            "Please address this task as soon as possible.\n\n" +
            "Task Portal",
            name, due, due.getDayOfWeek().name().toLowerCase(), task, requester, due
        );
    }
}