package com.taskflow.repository

import com.taskflow.entity.Task
import com.taskflow.entity.TaskStatus
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

/** One row of the "tasks per status" summary query. */
interface StatusCount {
    val status: TaskStatus
    val count: Long
}

interface TaskRepository : JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    /** Same as the inherited findAll, but loads each task's assignee in the same query (avoids N+1 queries). */
    @EntityGraph(attributePaths = ["assignee"])
    override fun findAll(spec: Specification<Task>?, pageable: Pageable): Page<Task>

    /** Finds a task only if it lives in a project owned by [ownerId] (task → project → owner). */
    @EntityGraph(attributePaths = ["assignee", "project"])
    fun findByIdAndProjectOwnerId(id: Long, ownerId: Long): Task?

    @Query("select t.status as status, count(t) as count from Task t where t.project.id = :projectId group by t.status")
    fun countByStatus(@Param("projectId") projectId: Long): List<StatusCount>

    /** Overdue = has a due date before today and is not DONE (same rule as Task.isOverdue). */
    @Query(
        "select count(t) from Task t where t.project.id = :projectId " +
            "and t.status <> com.taskflow.entity.TaskStatus.DONE and t.dueDate < :today",
    )
    fun countOverdue(@Param("projectId") projectId: Long, @Param("today") today: LocalDate): Long
}
