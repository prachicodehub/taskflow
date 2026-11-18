package com.taskflow.service

import com.taskflow.dto.CreateProjectRequest
import com.taskflow.dto.ProjectResponse
import com.taskflow.dto.ProjectSummaryResponse
import com.taskflow.dto.mapper.toEntity
import com.taskflow.dto.mapper.toResponse
import com.taskflow.entity.TaskStatus
import com.taskflow.repository.ProjectRepository
import com.taskflow.repository.TaskRepository
import com.taskflow.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

@Service
// Every public method runs in a DB transaction; readOnly lets the DB/Hibernate skip change tracking.
@Transactional(readOnly = true)
class ProjectService(
    // Constructor injection: Spring passes these in. No @Autowired needed in Kotlin.
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val userRepository: UserRepository,
    private val clock: Clock,
) {

    fun listProjects(userId: Long): List<ProjectResponse> =
        projectRepository.findAllByOwnerIdOrderByCreatedAtDesc(userId).map { it.toResponse() }

    @Transactional
    fun createProject(userId: Long, request: CreateProjectRequest): ProjectResponse {
        // getReferenceById returns a lightweight proxy: no SELECT needed just to set the foreign key.
        val owner = userRepository.getReferenceById(userId)
        return projectRepository.save(request.toEntity(owner)).toResponse()
    }

    fun getSummary(projectId: Long, userId: Long): ProjectSummaryResponse {
        projectRepository.requireOwned(projectId, userId)

        val countsByStatus = taskRepository.countByStatus(projectId).associate { it.status to it.count }
        val countOf = { status: TaskStatus -> countsByStatus[status] ?: 0L }

        return ProjectSummaryResponse(
            total = countsByStatus.values.sum(),
            todo = countOf(TaskStatus.TODO),
            inProgress = countOf(TaskStatus.IN_PROGRESS),
            done = countOf(TaskStatus.DONE),
            overdue = taskRepository.countOverdue(projectId, LocalDate.now(clock)),
        )
    }
}
