package com.taskflow.controller

import com.taskflow.support.IntegrationTest
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import java.time.LocalDate

/** Projects + tasks over HTTP: happy paths, validation (400), ownership (404) and summary. */
class TaskApiIntegrationTest : IntegrationTest() {

    private val today: LocalDate = LocalDate.now()

    private lateinit var ownerToken: String
    private lateinit var intruderToken: String
    private var projectId = 0L

    @BeforeEach
    fun setUp() {
        ownerToken = register("owner@test.dev", name = "Owner")
        intruderToken = register("intruder@test.dev", name = "Intruder")
        projectId = createProject(ownerToken, "Website relaunch")
    }

    // ---------- happy paths ----------

    @Test
    fun `task lifecycle - create, update, change status, delete`() {
        val taskId = createTask(ownerToken, projectId, mapOf("title" to "Draft copy", "priority" to "HIGH"))

        mockMvc.put("/api/tasks/$taskId") {
            bearer(ownerToken)
            json(mapOf("title" to "Final copy", "priority" to "LOW", "dueDate" to today.plusDays(3).toString()))
        }.andExpect {
            status { isOk() }
            jsonPath("$.title") { value("Final copy") }
            jsonPath("$.priority") { value("LOW") }
            jsonPath("$.status") { value("TODO") }
        }

        mockMvc.patch("/api/tasks/$taskId/status") {
            bearer(ownerToken)
            json(mapOf("status" to "DONE"))
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("DONE") }
        }

        mockMvc.delete("/api/tasks/$taskId") { bearer(ownerToken) }.andExpect { status { isNoContent() } }
        mockMvc.put("/api/tasks/$taskId") {
            bearer(ownerToken)
            json(mapOf("title" to "Gone"))
        }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `list supports filtering, sorting and pagination`() {
        createTask(ownerToken, projectId, mapOf("title" to "A", "priority" to "LOW"))
        createTask(ownerToken, projectId, mapOf("title" to "B", "priority" to "HIGH"))
        createTask(ownerToken, projectId, mapOf("title" to "C", "priority" to "MEDIUM"))
        createTask(ownerToken, projectId, mapOf("title" to "D", "priority" to "HIGH", "status" to "DONE"))

        mockMvc.get("/api/projects/$projectId/tasks?sort=priority&direction=desc&size=2") {
            bearer(ownerToken)
        }.andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(2) }
            jsonPath("$.content[0].priority") { value("HIGH") }
            jsonPath("$.totalElements") { value(4) }
            jsonPath("$.totalPages") { value(2) }
        }

        mockMvc.get("/api/projects/$projectId/tasks?priority=HIGH&status=TODO") {
            bearer(ownerToken)
        }.andExpect {
            jsonPath("$.content.length()") { value(1) }
            jsonPath("$.content[0].title") { value("B") }
        }
    }

    @Test
    fun `summary counts tasks per status`() {
        createTask(ownerToken, projectId, mapOf("title" to "A"))
        createTask(ownerToken, projectId, mapOf("title" to "B", "status" to "IN_PROGRESS"))
        createTask(ownerToken, projectId, mapOf("title" to "C", "status" to "DONE"))

        mockMvc.get("/api/projects/$projectId/summary") { bearer(ownerToken) }.andExpect {
            status { isOk() }
            jsonPath("$.total") { value(3) }
            jsonPath("$.todo") { value(1) }
            jsonPath("$.inProgress") { value(1) }
            jsonPath("$.done") { value(1) }
            jsonPath("$.overdue") { value(0) }
        }
    }

    // ---------- 400 validation ----------

    @Test
    fun `blank title returns 400 with a field error`() {
        expectTaskValidationError(mapOf("title" to "  "), field = "title", message = "Title is required")
    }

    @Test
    fun `title longer than 120 characters returns 400`() {
        expectTaskValidationError(
            mapOf("title" to "x".repeat(121)),
            field = "title",
            message = "Title must not exceed 120 characters",
        )
    }

    @Test
    fun `due date in the past returns 400`() {
        expectTaskValidationError(
            mapOf("title" to "Late", "dueDate" to today.minusDays(1).toString()),
            field = "dueDate",
            message = "Due date cannot be in the past",
        )
    }

    @Test
    fun `unknown priority value returns 400 listing the allowed values`() {
        expectTaskValidationError(
            mapOf("title" to "Bad", "priority" to "URGENT"),
            field = "priority",
            message = "Invalid value 'URGENT'. Allowed values: LOW, MEDIUM, HIGH",
        )
    }

    @Test
    fun `assignee that does not exist returns 400`() {
        expectTaskValidationError(
            mapOf("title" to "Assign", "assigneeId" to 999_999),
            field = "assigneeId",
            message = "Assignee 999999 does not exist",
        )
    }

    @Test
    fun `unsupported sort or filter value returns 400`() {
        mockMvc.get("/api/projects/$projectId/tasks?sort=title") { bearer(ownerToken) }.andExpect {
            status { isBadRequest() }
            jsonPath("$.fieldErrors[0].field") { value("sort") }
        }
        mockMvc.get("/api/projects/$projectId/tasks?status=BLOCKED") { bearer(ownerToken) }.andExpect {
            status { isBadRequest() }
            jsonPath("$.fieldErrors[0].field") { value("status") }
        }
    }

    // ---------- 404 ownership ----------

    @Test
    fun `project list only contains the caller's own projects`() {
        mockMvc.get("/api/projects") { bearer(ownerToken) }.andExpect {
            jsonPath("$.length()") { value(1) }
            jsonPath("$[0].name") { value("Website relaunch") }
        }
        mockMvc.get("/api/projects") { bearer(intruderToken) }.andExpect {
            jsonPath("$.length()") { value(0) }
        }
    }

    @Test
    fun `another user's project is reported as not found`() {
        mockMvc.get("/api/projects/$projectId/tasks") { bearer(intruderToken) }.andExpect { status { isNotFound() } }
        mockMvc.get("/api/projects/$projectId/summary") { bearer(intruderToken) }.andExpect { status { isNotFound() } }
        mockMvc.post("/api/projects/$projectId/tasks") {
            bearer(intruderToken)
            json(mapOf("title" to "Sneaky"))
        }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `another user's task cannot be read, changed or deleted by guessing its id`() {
        val taskId = createTask(ownerToken, projectId, mapOf("title" to "Private"))

        mockMvc.put("/api/tasks/$taskId") {
            bearer(intruderToken)
            json(mapOf("title" to "Hacked"))
        }.andExpect {
            status { isNotFound() }
            jsonPath("$.message") { value("Task $taskId not found") }
        }
        mockMvc.patch("/api/tasks/$taskId/status") {
            bearer(intruderToken)
            json(mapOf("status" to "DONE"))
        }.andExpect { status { isNotFound() } }
        mockMvc.delete("/api/tasks/$taskId") { bearer(intruderToken) }.andExpect { status { isNotFound() } }

        // Still intact for the owner.
        mockMvc.get("/api/projects/$projectId/tasks") { bearer(ownerToken) }.andExpect {
            jsonPath("$.content[0].title") { value("Private") }
            jsonPath("$.content[0].status") { value("TODO") }
        }
    }

    @Test
    fun `missing project returns 404`() {
        mockMvc.get("/api/projects/999999/summary") { bearer(ownerToken) }.andExpect {
            status { isNotFound() }
            jsonPath("$.message") { value("Project 999999 not found") }
        }
    }

    private fun expectTaskValidationError(body: Map<String, Any?>, field: String, message: String) {
        mockMvc.post("/api/projects/$projectId/tasks") {
            bearer(ownerToken)
            json(body)
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.status") { value(400) }
            jsonPath("$.fieldErrors[0].field") { value(field) }
            jsonPath("$.fieldErrors[0].message") { value(message) }
        }
    }
}
