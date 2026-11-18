package com.taskflow.repository

import com.taskflow.entity.Project
import com.taskflow.entity.Task
import com.taskflow.entity.TaskPriority
import com.taskflow.entity.TaskStatus
import com.taskflow.entity.User
import com.taskflow.service.task.DueDateSortStrategy
import com.taskflow.service.task.PrioritySortStrategy
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager
import org.springframework.data.domain.PageRequest
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDate

/**
 * Runs the real queries against H2 (schema created by the Flyway migration), so it checks
 * the entity mappings, the filter specifications, both sort strategies and the summary queries.
 * Each test runs in a transaction that is rolled back afterwards.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class TaskRepositoryTest @Autowired constructor(
    private val em: TestEntityManager,
    private val taskRepository: TaskRepository,
    private val projectRepository: ProjectRepository,
) {
    private val today = LocalDate.of(2026, 1, 15)

    private lateinit var owner: User
    private lateinit var other: User
    private lateinit var project: Project

    @BeforeEach
    fun setUp() {
        owner = em.persist(User("Owner", "owner@test.dev", "hash"))
        other = em.persist(User("Other", "other@test.dev", "hash"))
        project = em.persist(Project("Website", null, owner))

        task("low-late", TaskPriority.LOW, TaskStatus.TODO, today.plusDays(10), assignee = other)
        task("high-soon", TaskPriority.HIGH, TaskStatus.IN_PROGRESS, today.plusDays(1))
        task("medium-none", TaskPriority.MEDIUM, TaskStatus.TODO, null)
        task("high-overdue", TaskPriority.HIGH, TaskStatus.TODO, today.minusDays(2), assignee = other)
        task("done-past", TaskPriority.LOW, TaskStatus.DONE, today.minusDays(5))
        em.flush()
    }

    @Test
    fun `filters by status, priority and assignee`() {
        val filter = TaskFilter(status = TaskStatus.TODO, priority = TaskPriority.HIGH, assigneeId = other.id)

        val titles = titles(TaskSpecifications.matching(project.id!!, filter))

        assertThat(titles).containsExactly("high-overdue")
    }

    @Test
    fun `sorts by priority using rank, not alphabetically`() {
        val spec = TaskSpecifications.matching(project.id!!, TaskFilter())
            .and(PrioritySortStrategy().toSpecification(ascending = false))

        val priorities = taskRepository.findAll(spec, PageRequest.of(0, 10)).content.map { it.priority }

        assertThat(priorities).containsExactly(
            TaskPriority.HIGH, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW, TaskPriority.LOW,
        )
    }

    @Test
    fun `sorts by due date ascending with missing dates last`() {
        val spec = TaskSpecifications.matching(project.id!!, TaskFilter())
            .and(DueDateSortStrategy().toSpecification(ascending = true))

        assertThat(titles(spec)).containsExactly("done-past", "high-overdue", "high-soon", "low-late", "medium-none")
    }

    @Test
    fun `paginates and reports total count`() {
        val page = taskRepository.findAll(TaskSpecifications.matching(project.id!!, TaskFilter()), PageRequest.of(0, 2))

        assertThat(page.content).hasSize(2)
        assertThat(page.totalElements).isEqualTo(5)
        assertThat(page.totalPages).isEqualTo(3)
    }

    @Test
    fun `counts tasks per status and overdue tasks`() {
        val counts = taskRepository.countByStatus(project.id!!).associate { it.status to it.count }

        assertThat(counts).containsEntry(TaskStatus.TODO, 3L)
            .containsEntry(TaskStatus.IN_PROGRESS, 1L)
            .containsEntry(TaskStatus.DONE, 1L)
        // done-past is in the past but DONE, so only high-overdue counts.
        assertThat(taskRepository.countOverdue(project.id!!, today)).isEqualTo(1)
    }

    @Test
    fun `ownership lookups hide other users' data`() {
        val taskId = taskRepository.findAll().first().id!!

        assertThat(projectRepository.findByIdAndOwnerId(project.id!!, owner.id!!)).isNotNull
        assertThat(projectRepository.findByIdAndOwnerId(project.id!!, other.id!!)).isNull()
        assertThat(taskRepository.findByIdAndProjectOwnerId(taskId, owner.id!!)).isNotNull
        assertThat(taskRepository.findByIdAndProjectOwnerId(taskId, other.id!!)).isNull()
    }

    private fun titles(spec: org.springframework.data.jpa.domain.Specification<Task>) =
        taskRepository.findAll(spec, PageRequest.of(0, 10)).content.map { it.title }

    private fun task(
        title: String,
        priority: TaskPriority,
        status: TaskStatus,
        dueDate: LocalDate?,
        assignee: User? = null,
    ) = em.persist(Task(title, null, status, priority, dueDate, assignee, project))
}
