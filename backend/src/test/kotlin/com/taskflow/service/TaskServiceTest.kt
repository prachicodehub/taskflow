package com.taskflow.service

import com.taskflow.dto.TaskRequest
import com.taskflow.entity.Task
import com.taskflow.entity.TaskPriority
import com.taskflow.entity.TaskStatus
import com.taskflow.exception.BadRequestException
import com.taskflow.exception.NotFoundException
import com.taskflow.repository.ProjectRepository
import com.taskflow.repository.TaskFilter
import com.taskflow.repository.TaskRepository
import com.taskflow.repository.UserRepository
import com.taskflow.service.task.CreatedAtSortStrategy
import com.taskflow.service.task.DueDateSortStrategy
import com.taskflow.service.task.PrioritySortStrategy
import com.taskflow.service.task.TaskSortStrategyResolver
import com.taskflow.support.Fixtures
import com.taskflow.support.Fixtures.TODAY
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import java.util.Optional

class TaskServiceTest {

    private val taskRepository = mockk<TaskRepository>()
    private val projectRepository = mockk<ProjectRepository>()
    private val userRepository = mockk<UserRepository>()

    // The real resolver with the real strategies: they are plain objects with no dependencies.
    private val sortResolver = TaskSortStrategyResolver(
        listOf(CreatedAtSortStrategy(), DueDateSortStrategy(), PrioritySortStrategy()),
    )
    private val taskService = TaskService(taskRepository, projectRepository, userRepository, sortResolver, Fixtures.CLOCK)

    private val owner = Fixtures.user(id = 1)
    private val project = Fixtures.project(id = 10, owner = owner)

    private fun givenOwnedProject() {
        every { projectRepository.findByIdAndOwnerId(10, 1) } returns project
    }

    private fun givenOwnedTask(task: Task) {
        every { taskRepository.findByIdAndProjectOwnerId(task.id!!, 1) } returns task
        every { taskRepository.saveAndFlush(task) } returns task
    }

    @Nested
    inner class CreateTask {

        @Test
        fun `creates a TODO task in the project with trimmed fields`() {
            givenOwnedProject()
            val saved = slot<Task>()
            every { taskRepository.save(capture(saved)) } answers { saved.captured.apply { id = 100 } }

            val response = taskService.createTask(
                projectId = 10,
                userId = 1,
                request = TaskRequest(title = "  Ship it  ", priority = TaskPriority.HIGH, dueDate = TODAY),
            )

            assertThat(saved.captured.project).isSameAs(project)
            assertThat(response.title).isEqualTo("Ship it")
            assertThat(response.status).isEqualTo(TaskStatus.TODO)
            assertThat(response.priority).isEqualTo(TaskPriority.HIGH)
            assertThat(response.overdue).isFalse() // due today is not overdue
        }

        @Test
        fun `rejects a due date in the past`() {
            givenOwnedProject()

            val error = assertThrows<BadRequestException> {
                taskService.createTask(10, 1, TaskRequest(title = "Late", dueDate = TODAY.minusDays(1)))
            }

            assertThat(error.field).isEqualTo("dueDate")
            verify(exactly = 0) { taskRepository.save(any()) }
        }

        @Test
        fun `rejects an assignee that does not exist`() {
            givenOwnedProject()
            every { userRepository.findById(99) } returns Optional.empty()

            val error = assertThrows<BadRequestException> {
                taskService.createTask(10, 1, TaskRequest(title = "Assign me", assigneeId = 99))
            }

            assertThat(error.field).isEqualTo("assigneeId")
        }

        @Test
        fun `in another user's project is not found and nothing is saved`() {
            every { projectRepository.findByIdAndOwnerId(10, 2) } returns null

            assertThrows<NotFoundException> { taskService.createTask(10, 2, TaskRequest(title = "Sneaky")) }

            verify(exactly = 0) { taskRepository.save(any()) }
        }
    }

    @Nested
    inner class UpdateTask {

        @Test
        fun `applies all fields and keeps the status when none is sent`() {
            val assignee = Fixtures.user(id = 2, name = "Bob", email = "bob@test.dev")
            val task = Fixtures.task(project = project, status = TaskStatus.IN_PROGRESS)
            givenOwnedTask(task)
            every { userRepository.findById(2) } returns Optional.of(assignee)

            val response = taskService.updateTask(
                taskId = 100,
                userId = 1,
                request = TaskRequest(title = "Renamed", priority = TaskPriority.LOW, dueDate = TODAY.plusDays(2), assigneeId = 2),
            )

            assertThat(response.title).isEqualTo("Renamed")
            assertThat(response.priority).isEqualTo(TaskPriority.LOW)
            assertThat(response.status).isEqualTo(TaskStatus.IN_PROGRESS)
            assertThat(response.assignee?.name).isEqualTo("Bob")
        }

        @Test
        fun `allows editing an already overdue task as long as its due date is unchanged`() {
            val pastDate = TODAY.minusDays(3)
            val task = Fixtures.task(project = project, dueDate = pastDate)
            givenOwnedTask(task)

            val response = taskService.updateTask(100, 1, TaskRequest(title = "Still late", dueDate = pastDate))

            assertThat(response.title).isEqualTo("Still late")
            assertThat(response.overdue).isTrue()
        }

        @Test
        fun `rejects moving the due date into the past`() {
            givenOwnedTask(Fixtures.task(project = project, dueDate = TODAY.plusDays(5)))

            val error = assertThrows<BadRequestException> {
                taskService.updateTask(100, 1, TaskRequest(title = "Oops", dueDate = TODAY.minusDays(1)))
            }

            assertThat(error.field).isEqualTo("dueDate")
        }

        @Test
        fun `of another user's task is not found and nothing is saved`() {
            every { taskRepository.findByIdAndProjectOwnerId(100, 2) } returns null

            assertThrows<NotFoundException> { taskService.updateTask(100, 2, TaskRequest(title = "Hacked")) }

            verify(exactly = 0) { taskRepository.saveAndFlush(any<Task>()) }
        }
    }

    @Nested
    inner class StatusAndDelete {

        @Test
        fun `updateStatus changes only the status`() {
            val task = Fixtures.task(project = project, title = "Keep me", status = TaskStatus.TODO)
            givenOwnedTask(task)

            val response = taskService.updateStatus(100, 1, TaskStatus.DONE)

            assertThat(response.status).isEqualTo(TaskStatus.DONE)
            assertThat(response.title).isEqualTo("Keep me")
            verify { taskRepository.saveAndFlush(task) }
        }

        @Test
        fun `deleteTask deletes the owned task`() {
            val task = Fixtures.task(project = project)
            givenOwnedTask(task)
            every { taskRepository.delete(task) } returns Unit

            taskService.deleteTask(100, 1)

            verify { taskRepository.delete(task) }
        }

        @Test
        fun `deleteTask of another user's task is not found and deletes nothing`() {
            every { taskRepository.findByIdAndProjectOwnerId(100, 2) } returns null

            assertThrows<NotFoundException> { taskService.deleteTask(100, 2) }

            verify(exactly = 0) { taskRepository.delete(any<Task>()) }
        }
    }

    @Nested
    inner class ListTasks {

        @Test
        fun `maps the page and caps the page size at 100`() {
            givenOwnedProject()
            val pageable = slot<Pageable>()
            val overdueTask = Fixtures.task(project = project, dueDate = TODAY.minusDays(1))
            every { taskRepository.findAll(any<Specification<Task>>(), capture(pageable)) } answers {
                PageImpl(listOf(overdueTask), pageable.captured, 1)
            }

            val page = taskService.listTasks(10, 1, TaskFilter(), TaskListOptions(sort = "dueDate", size = 500))

            assertThat(pageable.captured.pageSize).isEqualTo(TaskService.MAX_PAGE_SIZE)
            assertThat(page.totalElements).isEqualTo(1)
            assertThat(page.content.single().overdue).isTrue()
        }

        @Test
        fun `rejects an unknown sort key before querying`() {
            givenOwnedProject()

            val error = assertThrows<BadRequestException> {
                taskService.listTasks(10, 1, TaskFilter(), TaskListOptions(sort = "title"))
            }

            assertThat(error.field).isEqualTo("sort")
            assertThat(error.message).contains("createdAt", "dueDate", "priority")
            verify(exactly = 0) { taskRepository.findAll(any<Specification<Task>>(), any<Pageable>()) }
        }
    }
}
