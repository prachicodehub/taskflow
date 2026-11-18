package com.taskflow.controller

import com.taskflow.config.JwtProperties
import com.taskflow.entity.User
import com.taskflow.security.JwtService
import com.taskflow.support.IntegrationTest
import org.hamcrest.Matchers.hasItems
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit

class AuthFlowIntegrationTest : IntegrationTest() {

    @Autowired
    private lateinit var jwtProperties: JwtProperties

    @Test
    fun `register returns a token that unlocks protected endpoints`() {
        val token = register("alice@test.dev")

        mockMvc.get("/api/auth/me") { bearer(token) }.andExpect {
            status { isOk() }
            jsonPath("$.email") { value("alice@test.dev") }
        }
    }

    @Test
    fun `register with an existing email returns 409`() {
        register("taken@test.dev")

        mockMvc.post("/api/auth/register") {
            json(mapOf("name" to "Copy", "email" to "TAKEN@test.dev", "password" to PASSWORD))
        }.andExpect {
            status { isConflict() }
            jsonPath("$.message") { value("An account with this email already exists") }
        }
    }

    @Test
    fun `register with invalid data returns 400 with field errors`() {
        mockMvc.post("/api/auth/register") {
            json(mapOf("name" to "", "email" to "not-an-email", "password" to "abc"))
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { value("Validation failed") }
            jsonPath("$.fieldErrors[*].field") { value(hasItems("name", "email", "password")) }
        }
    }

    @Test
    fun `login works with registered credentials, case-insensitive email`() {
        register("bob@test.dev")

        mockMvc.post("/api/auth/login") {
            json(mapOf("email" to "BOB@Test.dev", "password" to PASSWORD))
        }.andExpect {
            status { isOk() }
            jsonPath("$.token") { isNotEmpty() }
            jsonPath("$.user.name") { value("Test User") }
        }
    }

    @Test
    fun `login with wrong password returns 401`() {
        register("carol@test.dev")

        mockMvc.post("/api/auth/login") {
            json(mapOf("email" to "carol@test.dev", "password" to "wrong-password1"))
        }.andExpect {
            status { isUnauthorized() }
            jsonPath("$.message") { value("Invalid email or password") }
        }
    }

    @Test
    fun `protected endpoint without token returns 401 in ApiError format`() {
        mockMvc.get("/api/projects").andExpect {
            status { isUnauthorized() }
            jsonPath("$.status") { value(401) }
            jsonPath("$.message") { value("Authentication required") }
            jsonPath("$.path") { value("/api/projects") }
        }
    }

    @Test
    fun `tampered token returns 401`() {
        val token = register("dave@test.dev")

        mockMvc.get("/api/projects") { bearer(token.dropLast(2) + "xx") }.andExpect {
            status { isUnauthorized() }
            jsonPath("$.message") { value("Invalid token") }
        }
    }

    @Test
    fun `expired token returns 401 with an explicit message`() {
        val twoHoursAgo = Clock.fixed(Instant.now().minus(2, ChronoUnit.HOURS), ZoneOffset.UTC)
        val expiredToken = JwtService(jwtProperties, twoHoursAgo)
            .issueToken(User("Old", "old@test.dev", "hash").apply { id = 1 })
            .token

        mockMvc.get("/api/projects") { bearer(expiredToken) }.andExpect {
            status { isUnauthorized() }
            jsonPath("$.message") { value("Token has expired") }
        }
    }
}
