package com.taskflow.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant

// `@field:` puts the annotation on the Java field, which is where Bean Validation looks.
// Defaults ("") mean a missing JSON field still reaches validation and gets a proper 400 message.

data class CreateProjectRequest(
    @field:NotBlank(message = "Project name is required")
    @field:Size(max = 100, message = "Project name must not exceed 100 characters")
    val name: String = "",

    @field:Size(max = 1000, message = "Description must not exceed 1000 characters")
    val description: String? = null,
)

data class ProjectResponse(
    val id: Long,
    val name: String,
    val description: String?,
    val createdAt: Instant,
)

data class ProjectSummaryResponse(
    val total: Long,
    val todo: Long,
    val inProgress: Long,
    val done: Long,
    val overdue: Long,
)
