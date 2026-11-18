package com.taskflow.dto.mapper

import com.taskflow.dto.CreateProjectRequest
import com.taskflow.dto.ProjectResponse
import com.taskflow.dto.TaskRequest
import com.taskflow.dto.TaskResponse
import com.taskflow.dto.UserResponse
import com.taskflow.entity.Project
import com.taskflow.entity.Task
import com.taskflow.entity.TaskStatus
import com.taskflow.entity.User
import java.time.LocalDate

/*
 * Mapper / factory functions: the ONLY place that converts entities <-> DTOs.
 * Kotlin "extension functions" let us write user.toResponse() without
 * putting API concerns inside the entity classes themselves.
 */

fun User.toResponse() = UserResponse(id = requireNotNull(id), name = name, email = email)

fun Project.toResponse() = ProjectResponse(
    id = requireNotNull(id),
    name = name,
    description = description,
    createdAt = createdAt,
)

/** [today] is passed in (not read from the system clock) so overdue logic stays testable. */
fun Task.toResponse(today: LocalDate) = TaskResponse(
    id = requireNotNull(id),
    title = title,
    description = description,
    status = status,
    priority = priority,
    dueDate = dueDate,
    overdue = isOverdue(today),
    assignee = assignee?.toResponse(),
    projectId = requireNotNull(project.id),
    createdAt = createdAt,
    updatedAt = updatedAt,
)

fun CreateProjectRequest.toEntity(owner: User) = Project(
    name = name.trim(),
    description = description?.trim()?.ifBlank { null },
    owner = owner,
)

fun TaskRequest.toEntity(project: Project, assignee: User?) = Task(
    title = title.trim(),
    description = description?.trim()?.ifBlank { null },
    status = status ?: TaskStatus.TODO,
    priority = priority,
    dueDate = dueDate,
    assignee = assignee,
    project = project,
)

/** Applies a PUT body onto an existing task. */
fun Task.updateFrom(request: TaskRequest, assignee: User?) {
    title = request.title.trim()
    description = request.description?.trim()?.ifBlank { null }
    priority = request.priority
    request.status?.let { status = it }
    dueDate = request.dueDate
    this.assignee = assignee
}
