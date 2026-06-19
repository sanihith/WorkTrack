package com.taskportal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TaskPortalApplication {

    public static void main(String[] args) {
        SpringApplication.run(TaskPortalApplication.class, args);
    }
}