package com.taskportal.config;

import com.taskportal.entity.User;
import com.taskportal.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);
        
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        
        // Save or update user in database
        Optional<User> existingUser = userRepository.findByEmail(email);
        
        User user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
            user.setName(name);
        } else {
            user = User.builder()
                .email(email)
                .name(name)
                .employeeId(extractEmployeeId(email))
                .role("USER")
                .build();
        }
        
        userRepository.save(user);
        
        return oauth2User;
    }

    private String extractEmployeeId(String email) {
        // Extract employee ID from email prefix (e.g., "john.doe" from "john.doe@company.com")
        if (email != null && email.contains("@")) {
            return email.substring(0, email.indexOf("@")).toUpperCase();
        }
        return email;
    }
}