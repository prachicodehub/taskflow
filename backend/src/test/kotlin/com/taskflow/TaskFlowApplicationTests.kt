package com.taskflow

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

/** Smoke test: the whole Spring context (DB, Flyway, security) starts without errors. */
@SpringBootTest
@ActiveProfiles("test")
class TaskFlowApplicationTests {

    @Test
    fun `context loads`() {
    }
}
