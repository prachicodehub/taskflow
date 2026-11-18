package com.taskflow.support

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockHttpServletRequestDsl
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

/**
 * Base class for HTTP-level tests: the full app (security → controller → service → H2)
 * driven through MockMvc. @Transactional rolls the database back after every test.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
abstract class IntegrationTest {

    @Autowired
    protected lateinit var mockMvc: MockMvc

    @Autowired
    protected lateinit var objectMapper: ObjectMapper

    /** Registers a user and returns their JWT. */
    protected fun register(email: String, name: String = "Test User"): String =
        postForJson("/api/auth/register", null, mapOf("name" to name, "email" to email, "password" to PASSWORD))
            .path("token").asText()

    protected fun createProject(token: String, name: String = "Project"): Long =
        postForJson("/api/projects", token, mapOf("name" to name)).path("id").asLong()

    protected fun createTask(token: String, projectId: Long, body: Map<String, Any?>): Long =
        postForJson("/api/projects/$projectId/tasks", token, body).path("id").asLong()

    protected fun MockHttpServletRequestDsl.bearer(token: String) {
        header(HttpHeaders.AUTHORIZATION, "Bearer $token")
    }

    protected fun MockHttpServletRequestDsl.json(body: Any) {
        contentType = MediaType.APPLICATION_JSON
        content = objectMapper.writeValueAsString(body)
    }

    private fun postForJson(url: String, token: String?, body: Any) =
        mockMvc.post(url) {
            token?.let { bearer(it) }
            json(body)
        }.andExpect {
            status { isCreated() }
        }.andReturn().response.contentAsString.let(objectMapper::readTree)

    protected companion object {
        const val PASSWORD = "secret123"
    }
}
