package com.taskflow.repository

import com.taskflow.entity.Project
import com.taskflow.entity.Task
import com.taskflow.entity.TaskPriority
import com.taskflow.entity.TaskStatus
import com.taskflow.entity.User
import org.springframework.data.jpa.domain.Specification

/** Optional filters for the task list. A null field means "don't filter on this". */
data class TaskFilter(
    val status: TaskStatus? = null,
    val priority: TaskPriority? = null,
    val assigneeId: Long? = null,
)

/**
 * Specification pattern: every filter is a small, reusable WHERE-clause piece.
 * [matching] combines only the pieces the caller asked for, so we never need
 * one repository method per filter combination.
 */
object TaskSpecifications {

    fun inProject(projectId: Long) = Specification<Task> { root, _, cb ->
        cb.equal(root.get<Project>("project").get<Long>("id"), projectId)
    }

    fun hasStatus(status: TaskStatus) = Specification<Task> { root, _, cb ->
        cb.equal(root.get<TaskStatus>("status"), status)
    }

    fun hasPriority(priority: TaskPriority) = Specification<Task> { root, _, cb ->
        cb.equal(root.get<TaskPriority>("priority"), priority)
    }

    fun assignedTo(userId: Long) = Specification<Task> { root, _, cb ->
        cb.equal(root.get<User>("assignee").get<Long>("id"), userId)
    }

    fun matching(projectId: Long, filter: TaskFilter): Specification<Task> =
        Specification.allOf(
            listOfNotNull(
                inProject(projectId),
                filter.status?.let(::hasStatus),
                filter.priority?.let(::hasPriority),
                filter.assigneeId?.let(::assignedTo),
            ),
        )
}
