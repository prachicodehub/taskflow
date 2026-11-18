package com.taskflow.controller

import com.taskflow.dto.AuthResponse
import com.taskflow.dto.LoginRequest
import com.taskflow.dto.RegisterRequest
import com.taskflow.dto.UserResponse
import com.taskflow.security.AuthUser
import com.taskflow.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(private val authService: AuthService) {

    /** Public. Creates the account and logs the user straight in. */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    fun register(@Valid @RequestBody request: RegisterRequest): AuthResponse = authService.register(request)

    /** Public. Wrong email/password → 401. */
    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): AuthResponse = authService.login(request)

    /** Protected. Who am I? Used by the frontend to restore a session from a stored token. */
    @GetMapping("/me")
    fun me(@AuthenticationPrincipal user: AuthUser): UserResponse = authService.currentUser(user.id)
}
