package com.taskflow.service

import com.taskflow.dto.PageResponse
import com.taskflow.dto.TaskRequest
import com.taskflow.dto.TaskResponse
import com.taskflow.dto.mapper.toEntity
import com.taskflow.dto.mapper.toResponse
import com.taskflow.dto.mapper.updateFrom
import com.taskflow.dto.toPageResponse
import com.taskflow.entity.Task
import com.taskflow.entity.TaskStatus
import com.taskflow.entity.User
import com.taskflow.exception.BadRequestException
import com.taskflow.repository.ProjectRepository
import com.taskflow.repository.TaskFilter
import com.taskflow.repository.TaskRepository
import com.taskflow.repository.TaskSpecifications
import com.taskflow.repository.UserRepository
import com.taskflow.service.task.TaskSortStrategyResolver
import org.springframework.data.domain.PageRequest
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

/** Paging + sorting options for the task list, as received from the query string. */
data class TaskListOptions(
    val sort: String = "createdAt",
    val ascending: Boolean = false,
    val page: Int = 0,
    val size: Int = 20,
)

@Service
@Transactional(readOnly = true)
class TaskService(
    private val taskRepository: TaskRepository,
    private val projectRepository: ProjectRepository,
    private val userRepository: UserRepository,
    private val sortResolver: TaskSortStrategyResolver,
    private val clock: Clock,
) {

    fun listTasks(
        projectId: Long,
        userId: Long,
        filter: TaskFilter,
        options: TaskListOptions,
    ): PageResponse<TaskResponse> {
        projectRepository.requireOwned(projectId, userId)

        val sortSpec = sortResolver.resolve(options.sort).toSpecification(options.ascending)
        val spec = TaskSpecifications.matching(projectId, filter).and(sortSpec)
        val pageable = PageRequest.of(options.page.coerceAtLeast(0), options.size.coerceIn(1, MAX_PAGE_SIZE))

        val today = today()
        return taskRepository.findAll(spec, pageable).map { it.toResponse(today) }.toPageResponse()
    }

    @Transactional
    fun createTask(projectId: Long, userId: Long, request: TaskRequest): TaskResponse {
        val project = projectRepository.requireOwned(projectId, userId)
        requireNotInPast(request.dueDate)

        val task = request.toEntity(project, findAssignee(request.assigneeId))
        return taskRepository.save(task).toResponse(today())
    }

    @Transactional
    fun updateTask(taskId: Long, userId: Long, request: TaskRequest): TaskResponse {
        val task = taskRepository.requireOwned(taskId, userId)
        // Editing other fields of a task that is already overdue must still work,
        // so the "not in the past" rule only applies when the due date actually changes.
        if (request.dueDate != task.dueDate) requireNotInPast(request.dueDate)

        task.updateFrom(request, findAssignee(request.assigneeId))
        return flushAndMap(task)
    }

    @Transactional
    fun updateStatus(taskId: Long, userId: Long, status: TaskStatus): TaskResponse {
        val task = taskRepository.requireOwned(taskId, userId)
        task.status = status
        return flushAndMap(task)
    }

    @Transactional
    fun deleteTask(taskId: Long, userId: Long) {
        taskRepository.delete(taskRepository.requireOwned(taskId, userId))
    }

    /**
     * Inside a transaction Hibernate would write the changes on its own when the method returns
     * ("dirty checking"). We flush now so @PreUpdate has set updatedAt before we build the response.
     */
    private fun flushAndMap(task: Task): TaskResponse = taskRepository.saveAndFlush(task).toResponse(today())

    private fun findAssignee(assigneeId: Long?): User? =
        assigneeId?.let {
            userRepository.findByIdOrNull(it)
                ?: throw BadRequestException("assigneeId", "Assignee $it does not exist")
        }

    private fun requireNotInPast(dueDate: LocalDate?) {
        if (dueDate != null && dueDate.isBefore(today())) {
            throw BadRequestException("dueDate", "Due date cannot be in the past")
        }
    }

    private fun today(): LocalDate = LocalDate.now(clock)

    companion object {
        const val MAX_PAGE_SIZE = 100
    }
}
