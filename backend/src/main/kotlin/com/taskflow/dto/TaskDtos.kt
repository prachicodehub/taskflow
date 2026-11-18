package com.taskflow.dto

import com.taskflow.entity.TaskPriority
import com.taskflow.entity.TaskStatus
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.Instant
import java.time.LocalDate

/** Body for both create (POST) and full update (PUT). */
data class TaskRequest(
    @field:NotBlank(message = "Title is required")
    @field:Size(max = 120, message = "Title must not exceed 120 characters")
    val title: String = "",

    @field:Size(max = 2000, message = "Description must not exceed 2000 characters")
    val description: String? = null,

    val priority: TaskPriority = TaskPriority.MEDIUM,

    /** Create: defaults to TODO. Update: null keeps the current status. */
    val status: TaskStatus? = null,

    val dueDate: LocalDate? = null,

    val assigneeId: Long? = null,
)

data class UpdateTaskStatusRequest(
    @field:NotNull(message = "Status is required")
    val status: TaskStatus? = null,
)

data class TaskResponse(
    val id: Long,
    val title: String,
    val description: String?,
    val status: TaskStatus,
    val priority: TaskPriority,
    val dueDate: LocalDate?,
    val overdue: Boolean,
    val assignee: UserResponse?,
    val projectId: Long,
    val createdAt: Instant,
    val updatedAt: Instant,
)
