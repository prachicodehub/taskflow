package com.taskflow.service

import com.taskflow.dto.LoginRequest
import com.taskflow.dto.RegisterRequest
import com.taskflow.entity.User
import com.taskflow.exception.ConflictException
import com.taskflow.repository.UserRepository
import com.taskflow.security.IssuedToken
import com.taskflow.security.JwtService
import com.taskflow.support.Fixtures
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.crypto.password.PasswordEncoder
import java.time.Instant

/**
 * Pure unit tests: no Spring, no database. MockK replaces every dependency with a fake
 * whose answers we script with `every { ... } returns ...` and check with `verify { ... }`.
 */
class AuthServiceTest {

    private val userRepository = mockk<UserRepository>()
    private val passwordEncoder = mockk<PasswordEncoder>()
    private val jwtService = mockk<JwtService>()
    private val authService = AuthService(userRepository, passwordEncoder, jwtService)

    private val issuedToken = IssuedToken("jwt-token", Instant.parse("2026-03-10T12:00:00Z"))

    @Test
    fun `register normalises the email, hashes the password and returns a token`() {
        val savedUser = slot<User>()
        every { userRepository.existsByEmail("new@test.dev") } returns false
        every { passwordEncoder.encode("secret123") } returns "bcrypt-hash"
        every { userRepository.save(capture(savedUser)) } answers { savedUser.captured.apply { id = 7 } }
        every { jwtService.issueToken(any()) } returns issuedToken

        val response = authService.register(RegisterRequest(name = " New User ", email = " NEW@Test.dev ", password = "secret123"))

        assertThat(savedUser.captured.email).isEqualTo("new@test.dev")
        assertThat(savedUser.captured.name).isEqualTo("New User")
        assertThat(savedUser.captured.passwordHash).isEqualTo("bcrypt-hash")
        assertThat(response.token).isEqualTo("jwt-token")
        assertThat(response.user.id).isEqualTo(7)
    }

    @Test
    fun `register rejects an email that is already taken`() {
        every { userRepository.existsByEmail("taken@test.dev") } returns true

        assertThrows<ConflictException> {
            authService.register(RegisterRequest(name = "Copy", email = "taken@test.dev", password = "secret123"))
        }
        verify(exactly = 0) { userRepository.save(any()) }
    }

    @Test
    fun `login returns a token for correct credentials`() {
        val user = Fixtures.user(email = "alice@test.dev")
        every { userRepository.findByEmail("alice@test.dev") } returns user
        every { passwordEncoder.matches("secret123", "hashed") } returns true
        every { jwtService.issueToken(user) } returns issuedToken

        val response = authService.login(LoginRequest(email = "Alice@test.dev", password = "secret123"))

        assertThat(response.token).isEqualTo("jwt-token")
        assertThat(response.user.email).isEqualTo("alice@test.dev")
    }

    @Test
    fun `login fails with the same message for a wrong password and an unknown email`() {
        every { userRepository.findByEmail("alice@test.dev") } returns Fixtures.user()
        every { passwordEncoder.matches("wrong", "hashed") } returns false
        every { userRepository.findByEmail("ghost@test.dev") } returns null

        val wrongPassword = assertThrows<BadCredentialsException> {
            authService.login(LoginRequest(email = "alice@test.dev", password = "wrong"))
        }
        val unknownEmail = assertThrows<BadCredentialsException> {
            authService.login(LoginRequest(email = "ghost@test.dev", password = "secret123"))
        }

        assertThat(wrongPassword.message).isEqualTo(unknownEmail.message).isEqualTo("Invalid email or password")
        verify(exactly = 0) { jwtService.issueToken(any()) }
    }
}
