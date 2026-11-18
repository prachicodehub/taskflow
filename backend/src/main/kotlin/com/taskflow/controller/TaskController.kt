package com.taskflow.controller

import com.taskflow.dto.PageResponse
import com.taskflow.dto.TaskRequest
import com.taskflow.dto.TaskResponse
import com.taskflow.dto.UpdateTaskStatusRequest
import com.taskflow.entity.TaskPriority
import com.taskflow.entity.TaskStatus
import com.taskflow.repository.TaskFilter
import com.taskflow.security.AuthUser
import com.taskflow.service.TaskListOptions
import com.taskflow.service.TaskService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class TaskController(private val taskService: TaskService) {

    /** e.g. GET /api/projects/1/tasks?status=TODO&priority=HIGH&assigneeId=2&sort=dueDate&direction=asc&page=0&size=20 */
    @GetMapping("/projects/{projectId}/tasks")
    fun list(
        @AuthenticationPrincipal user: AuthUser,
        @PathVariable projectId: Long,
        @RequestParam(required = false) status: TaskStatus?,
        @RequestParam(required = false) priority: TaskPriority?,
        @RequestParam(required = false) assigneeId: Long?,
        @RequestParam(defaultValue = "createdAt") sort: String,
        @RequestParam(defaultValue = "desc") direction: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): PageResponse<TaskResponse> = taskService.listTasks(
        projectId = projectId,
        userId = user.id,
        filter = TaskFilter(status, priority, assigneeId),
        options = TaskListOptions(
            sort = sort,
            ascending = !direction.equals("desc", ignoreCase = true),
            page = page,
            size = size,
        ),
    )

    @PostMapping("/projects/{projectId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @AuthenticationPrincipal user: AuthUser,
        @PathVariable projectId: Long,
        @Valid @RequestBody request: TaskRequest,
    ): TaskResponse = taskService.createTask(projectId, user.id, request)

    @PutMapping("/tasks/{taskId}")
    fun update(
        @AuthenticationPrincipal user: AuthUser,
        @PathVariable taskId: Long,
        @Valid @RequestBody request: TaskRequest,
    ): TaskResponse = taskService.updateTask(taskId, user.id, request)

    @PatchMapping("/tasks/{taskId}/status")
    fun updateStatus(
        @AuthenticationPrincipal user: AuthUser,
        @PathVariable taskId: Long,
        @Valid @RequestBody request: UpdateTaskStatusRequest,
    ): TaskResponse = taskService.updateStatus(taskId, user.id, requireNotNull(request.status))

    @DeleteMapping("/tasks/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @AuthenticationPrincipal user: AuthUser,
        @PathVariable taskId: Long,
    ) = taskService.deleteTask(taskId, user.id)
}
