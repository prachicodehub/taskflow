package com.taskflow.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.Instant

data class RegisterRequest(
    @field:NotBlank(message = "Name is required")
    @field:Size(max = 100, message = "Name must not exceed 100 characters")
    val name: String = "",

    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Email must be a valid email address")
    @field:Size(max = 255, message = "Email must not exceed 255 characters")
    val email: String = "",

    // BCrypt only uses the first 72 bytes of a password, hence the upper limit.
    @field:Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
    @field:Pattern(
        regexp = "^(?=.*[A-Za-z])(?=.*\\d).*$",
        message = "Password must contain at least one letter and one number",
    )
    val password: String = "",
)

data class LoginRequest(
    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Email must be a valid email address")
    val email: String = "",

    @field:NotBlank(message = "Password is required")
    val password: String = "",
)

data class AuthResponse(
    val token: String,
    val expiresAt: Instant,
    val user: UserResponse,
)
