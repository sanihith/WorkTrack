package com.taskportal.config;

import com.taskportal.entity.User;
import com.taskportal.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.util.List;

@Configuration
@Profile("!test")
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository) {
        return args -> {
            if (userRepository.count() == 0) {
                User admin = User.builder()
                    .employeeId("ADMIN001")
                    .name("Admin User")
                    .email("admin@company.com")
                    .role("ADMIN")
                    .build();

                User director = User.builder()
                    .employeeId("DIR001")
                    .name("Director User")
                    .email("director@company.com")
                    .role("DIRECTOR")
                    .manager(null)
                    .build();

                User manager = User.builder()
                    .employeeId("MGR001")
                    .name("Manager User")
                    .email("manager@company.com")
                    .role("MANAGER")
                    .manager(null)
                    .build();

                User employee1 = User.builder()
                    .employeeId("EMP001")
                    .name("Employee One")
                    .email("employee1@company.com")
                    .role("EMPLOYEE")
                    .manager(null)
                    .build();

                User employee2 = User.builder()
                    .employeeId("EMP002")
                    .name("Employee Two")
                    .email("employee2@company.com")
                    .role("EMPLOYEE")
                    .manager(null)
                    .build();

                userRepository.saveAll(List.of(admin, director, manager, employee1, employee2));

                // Set manager relationships
                manager.setManager(director);
                employee1.setManager(manager);
                employee2.setManager(manager);
                userRepository.saveAll(List.of(manager, employee1, employee2));
                System.out.println("[DataInitializer] Seed complete with manager relationships.");
            } else {
                // Fix-up pass: ensure manager relationships are always correctly set
                // even if DB was previously seeded without manager_id set
                userRepository.findByEmail("director@company.com").ifPresent(director -> {
                    userRepository.findByEmail("manager@company.com").ifPresent(manager -> {
                        if (manager.getManager() == null) {
                            manager.setManager(director);
                            userRepository.save(manager);
                            System.out.println("[DataInitializer] Fixed: manager -> director relationship.");
                        }
                    });
                });

                userRepository.findByEmail("manager@company.com").ifPresent(manager -> {
                    userRepository.findByEmail("employee1@company.com").ifPresent(emp -> {
                        if (emp.getManager() == null) {
                            emp.setManager(manager);
                            userRepository.save(emp);
                            System.out.println("[DataInitializer] Fixed: employee1 -> manager relationship.");
                        }
                    });
                    userRepository.findByEmail("employee2@company.com").ifPresent(emp -> {
                        if (emp.getManager() == null) {
                            emp.setManager(manager);
                            userRepository.save(emp);
                            System.out.println("[DataInitializer] Fixed: employee2 -> manager relationship.");
                        }
                    });
                });
            }
        };
    }
}