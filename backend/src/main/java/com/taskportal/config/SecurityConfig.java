package com.taskportal.config;

import com.taskportal.entity.User;
import com.taskportal.repository.UserRepository;
import com.taskportal.service.JwtService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@Profile("!test")
public class SecurityConfig {

    private final CustomOAuth2UserService oAuth2UserService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final CorsConfigurationSource corsConfigurationSource;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(CustomOAuth2UserService oAuth2UserService, JwtService jwtService,
                          UserRepository userRepository, CorsConfigurationSource corsConfigurationSource,
                          JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.oAuth2UserService = oAuth2UserService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.corsConfigurationSource = corsConfigurationSource;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(unauthorizedEntryPoint())
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/auth/login",
                    "/api/auth/dev-login",
                    "/api/auth/dev-users",
                    "/api/auth/callback",
                    "/api/auth/teams-token",
                    "/api/health"
                ).permitAll()
                .requestMatchers("/api/auth/me", "/api/auth/logout").authenticated()
                .requestMatchers("/api/users/reportees").hasAnyRole("MANAGER", "DIRECTOR", "ADMIN")
                .requestMatchers("/api/requests/**").authenticated()
                .requestMatchers("/api/users/**").authenticated()
                .requestMatchers("/api/attachments/**").authenticated()
                .requestMatchers("/api/notifications/**").authenticated()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(oAuth2UserService)
                )
                .successHandler(oAuth2SuccessHandler())
            );
        return http.build();
    }

    @Bean
    public AuthenticationEntryPoint unauthorizedEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"" + authException.getMessage() + "\"}");
        };
    }

    @Bean
    public AuthenticationSuccessHandler oAuth2SuccessHandler() {
        SimpleUrlAuthenticationSuccessHandler handler = new SimpleUrlAuthenticationSuccessHandler() {
            @Override
            public void onAuthenticationSuccess(jakarta.servlet.http.HttpServletRequest request,
                                                jakarta.servlet.http.HttpServletResponse response,
                                                org.springframework.security.core.Authentication authentication)
                    throws java.io.IOException, jakarta.servlet.ServletException {
                org.springframework.security.oauth2.core.user.OAuth2User oauth2User =
                    (org.springframework.security.oauth2.core.user.OAuth2User) authentication;

                String email = oauth2User.getAttribute("email");
                String name = oauth2User.getAttribute("name");

                User user = userRepository.findByEmail(email).orElse(null);

                String token;
                if (user != null) {
                    token = jwtService.generateTokenWithUserIdAndRole(user.getId(), email, user.getRole());
                } else {
                    User newUser = User.builder()
                        .email(email)
                        .name(name)
                        .employeeId(email != null && email.contains("@")
                            ? email.substring(0, email.indexOf("@")).toUpperCase() : email)
                        .role("EMPLOYEE")
                        .build();
                    User saved = userRepository.save(newUser);
                    token = jwtService.generateTokenWithUserIdAndRole(saved.getId(), email, saved.getRole());
                }

                response.sendRedirect("http://localhost:5173/auth/callback?token=" + token);
            }
        };
        handler.setDefaultTargetUrl("http://localhost:5173/auth/callback");
        return handler;
    }
}