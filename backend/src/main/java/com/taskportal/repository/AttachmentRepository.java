package com.taskportal.repository;

import com.taskportal.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByRequestId(Long requestId);
    void deleteByRequestId(Long requestId);
}