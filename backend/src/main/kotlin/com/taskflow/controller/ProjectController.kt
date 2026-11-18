package com.taskflow.controller

import com.taskflow.dto.CreateProjectRequest
import com.taskflow.dto.ProjectResponse
import com.taskflow.dto.ProjectSummaryResponse
import com.taskflow.security.AuthUser
import com.taskflow.service.ProjectService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/**
 * Controllers only deal with HTTP: read the request, validate it (@Valid), call the service, return a DTO.
 * `@AuthenticationPrincipal` hands us the user that the JWT filter put into the security context.
 */
@RestController
@RequestMapping("/api/projects")
class ProjectController(private val projectService: ProjectService) {

    @GetMapping
    fun list(@AuthenticationPrincipal user: AuthUser): List<ProjectResponse> =
        projectService.listProjects(user.id)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @AuthenticationPrincipal user: AuthUser,
        @Valid @RequestBody request: CreateProjectRequest,
    ): ProjectResponse = projectService.createProject(user.id, request)

    @GetMapping("/{projectId}/summary")
    fun summary(
        @AuthenticationPrincipal user: AuthUser,
        @PathVariable projectId: Long,
    ): ProjectSummaryResponse = projectService.getSummary(projectId, user.id)
}
