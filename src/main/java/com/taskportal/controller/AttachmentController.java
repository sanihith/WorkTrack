package com.taskportal.controller;

import com.taskportal.entity.Attachment;
import com.taskportal.entity.User;
import com.taskportal.repository.AttachmentRepository;
import com.taskportal.repository.UserRepository;
import com.taskportal.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attachments")
@CrossOrigin(origins = "http://localhost:5173")
public class AttachmentController {

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/upload")
    public ResponseEntity<Attachment> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("requestId") Long requestId,
            @RequestParam(value = "commentId", required = false) Long commentId) {
        try {
            String filePath = fileStorageService.store(file);
            
            Attachment attachment = new Attachment();
            attachment.setFileName(file.getOriginalFilename());
            attachment.setFilePath(filePath);
            
            com.taskportal.entity.Request request = new com.taskportal.entity.Request();
            request.setId(requestId);
            attachment.setRequest(request);

            if (commentId != null) {
                com.taskportal.entity.Comment comment = new com.taskportal.entity.Comment();
                comment.setId(commentId);
                attachment.setComment(comment);
            }
            
            Attachment saved = attachmentRepository.save(attachment);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        var attachmentOpt = attachmentRepository.findById(id);
        if (attachmentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        try {
            var attachment = attachmentOpt.get();
            byte[] fileData = fileStorageService.load(attachment.getFilePath());
            ByteArrayResource resource = new ByteArrayResource(fileData);
            
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                    "attachment; filename=\"" + attachment.getFileName() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(fileData.length)
                .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/request/{requestId}")
    public ResponseEntity<List<Attachment>> getByRequestId(@PathVariable Long requestId) {
        return ResponseEntity.ok(attachmentRepository.findByRequestId(requestId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean isManager = user.getRole() != null && (
                user.getRole().equals("MANAGER") ||
                user.getRole().equals("DIRECTOR") ||
                user.getRole().equals("ADMIN"));

        var attachmentOpt = attachmentRepository.findById(id);
        if (attachmentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Attachment attachment = attachmentOpt.get();

        boolean isParticipant = false;
        if (attachment.getRequest() != null) {
            boolean isRequester = attachment.getRequest().getCreatedBy() != null
                    && attachment.getRequest().getCreatedBy().getId().equals(user.getId());
            boolean isAssignee = attachment.getRequest().getAssignedTo() != null
                    && attachment.getRequest().getAssignedTo().getId().equals(user.getId());
            isParticipant = isRequester || isAssignee;
        }

        if (!isManager && !isParticipant) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            fileStorageService.delete(attachment.getFilePath());
            attachmentRepository.delete(attachment);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}