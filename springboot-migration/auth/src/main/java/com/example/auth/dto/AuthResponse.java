package com.example.auth.dto;

public record AuthResponse(
        boolean success,
        UserResponse user,
        String token
) {
    public record UserResponse(String id, String email) {
    }
}