package com.taskportal.repository;

import com.taskportal.entity.Request;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequestRepository extends JpaRepository<Request, Long> {
    List<Request> findByCreatedById(Long createdById);
    List<Request> findByAssignedToId(Long assignedToId);
    List<Request> findByStatus(String status);
    List<Request> findByCreatedByIdOrAssignedToId(Long createdById, Long assignedToId);
    @Query("SELECT r FROM Request r WHERE r.assignedTo.id = :userId AND r.status = :status")
    List<Request> findByAssignedToIdAndStatus(@Param("userId") Long userId, @Param("status") String status);
    @Query("SELECT r FROM Request r WHERE r.assignedTo.id = :userId AND r.isMyDay = true")
    List<Request> findByAssignedToIdAndIsMyDayTrue(@Param("userId") Long userId);

    @Query("SELECT r FROM Request r WHERE r.assignedTo.id = :userId AND r.isImportant = true")
    List<Request> findByAssignedToIdAndIsImportantTrue(@Param("userId") Long userId);

    boolean existsByIdAndCreatedById(Long id, Long createdById);
    boolean existsByIdAndAssignedToId(Long id, Long assignedToId);
}