package com.taskflow.service

import com.taskflow.dto.AuthResponse
import com.taskflow.dto.LoginRequest
import com.taskflow.dto.RegisterRequest
import com.taskflow.dto.UserResponse
import com.taskflow.dto.mapper.toResponse
import com.taskflow.entity.User
import com.taskflow.exception.ConflictException
import com.taskflow.exception.NotFoundException
import com.taskflow.repository.UserRepository
import com.taskflow.security.JwtService
import org.springframework.data.repository.findByIdOrNull
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
) {

    @Transactional
    fun register(request: RegisterRequest): AuthResponse {
        val email = normalizeEmail(request.email)
        if (userRepository.existsByEmail(email)) {
            throw ConflictException("An account with this email already exists")
        }

        val user = userRepository.save(
            User(
                name = request.name.trim(),
                email = email,
                passwordHash = passwordEncoder.encode(request.password), // never store the raw password
            ),
        )
        return authResponseFor(user)
    }

    fun login(request: LoginRequest): AuthResponse {
        val user = userRepository.findByEmail(normalizeEmail(request.email))
        // Same message whether the email or the password is wrong, so attackers can't discover accounts.
        if (user == null || !passwordEncoder.matches(request.password, user.passwordHash)) {
            throw BadCredentialsException(INVALID_CREDENTIALS)
        }
        return authResponseFor(user)
    }

    fun currentUser(userId: Long): UserResponse =
        userRepository.findByIdOrNull(userId)?.toResponse() ?: throw NotFoundException("User $userId not found")

    private fun authResponseFor(user: User): AuthResponse {
        val issued = jwtService.issueToken(user)
        return AuthResponse(token = issued.token, expiresAt = issued.expiresAt, user = user.toResponse())
    }

    /** "John@Mail.com " and "john@mail.com" are the same account. */
    private fun normalizeEmail(email: String) = email.trim().lowercase()

    companion object {
        const val INVALID_CREDENTIALS = "Invalid email or password"
    }
}
