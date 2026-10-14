package com.example.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Service
public class JwtTokenService {

    private final SecretKey jwtKey;

    public JwtTokenService(@Value("${jwt.secret}") String jwtSecret) {
        this.jwtKey = Keys.hmacShaKeyFor(
                jwtSecret.getBytes(StandardCharsets.UTF_8)
        );
    }

    public String getCustomerId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(jwtKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        String customerId = claims.getSubject();

        if (customerId == null || customerId.isBlank()) {
            throw new IllegalArgumentException(
                    "JWT customer identity is missing"
            );
        }

        return customerId;
    }
}
