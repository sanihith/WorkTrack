package com.taskportal.service;

import com.taskportal.entity.User;
import com.taskportal.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public User save(User user) {
        return userRepository.save(user);
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public List<User> findReportees(Long managerId) {
        return userRepository.findByManagerId(managerId);
    }

    public List<User> findReporteesAndCc(Long userId) {
        List<User> reportees = userRepository.findByManagerId(userId);
        List<User> ccUsers = userRepository.findCcUsersForRequests(userId);
        return reportees;
    }

    public Optional<User> findManager(Long userId) {
        return userRepository.findById(userId)
            .map(User::getManager);
    }
}