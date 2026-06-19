package com.taskportal.repository;

import com.taskportal.entity.RequestCc;
import com.taskportal.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmployeeId(String employeeId);
    List<User> findByManagerId(Long managerId);
    @Query("SELECT DISTINCT cc.user FROM RequestCc cc WHERE cc.request.createdBy.id = :userId OR cc.request.assignedTo.id = :userId")
    List<User> findCcUsersForRequests(@Param("userId") Long userId);
}