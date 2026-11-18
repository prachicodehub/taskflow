package com.taskflow.service

import com.taskflow.dto.CreateProjectRequest
import com.taskflow.entity.Project
import com.taskflow.entity.TaskStatus
import com.taskflow.exception.NotFoundException
import com.taskflow.repository.ProjectRepository
import com.taskflow.repository.TaskRepository
import com.taskflow.repository.UserRepository
import com.taskflow.support.Fixtures
import com.taskflow.support.Fixtures.statusCount
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class ProjectServiceTest {

    private val projectRepository = mockk<ProjectRepository>()
    private val taskRepository = mockk<TaskRepository>()
    private val userRepository = mockk<UserRepository>()
    private val projectService = ProjectService(projectRepository, taskRepository, userRepository, Fixtures.CLOCK)

    private val owner = Fixtures.user(id = 1)

    @Test
    fun `listProjects returns only the caller's projects as DTOs`() {
        every { projectRepository.findAllByOwnerIdOrderByCreatedAtDesc(1) } returns
            listOf(Fixtures.project(id = 10, owner = owner, name = "Website"))

        val projects = projectService.listProjects(userId = 1)

        assertThat(projects).extracting("id", "name").containsExactly(org.assertj.core.groups.Tuple.tuple(10L, "Website"))
    }

    @Test
    fun `createProject trims input and assigns the caller as owner`() {
        val saved = slot<Project>()
        every { userRepository.getReferenceById(1) } returns owner
        every { projectRepository.save(capture(saved)) } answers { saved.captured.apply { id = 11 } }

        val response = projectService.createProject(1, CreateProjectRequest(name = "  Mobile app ", description = "   "))

        assertThat(saved.captured.owner).isSameAs(owner)
        assertThat(response.name).isEqualTo("Mobile app")
        assertThat(response.description).isNull() // blank description stored as null
    }

    @Test
    fun `getSummary combines status counts, fills missing statuses with zero and counts overdue for today`() {
        every { projectRepository.findByIdAndOwnerId(10, 1) } returns Fixtures.project(owner = owner)
        every { taskRepository.countByStatus(10) } returns listOf(
            statusCount(TaskStatus.TODO, 4),
            statusCount(TaskStatus.DONE, 2),
        )
        every { taskRepository.countOverdue(10, Fixtures.TODAY) } returns 3

        val summary = projectService.getSummary(projectId = 10, userId = 1)

        assertThat(summary.total).isEqualTo(6)
        assertThat(summary.todo).isEqualTo(4)
        assertThat(summary.inProgress).isZero()
        assertThat(summary.done).isEqualTo(2)
        assertThat(summary.overdue).isEqualTo(3)
    }

    @Test
    fun `getSummary of a project the user does not own is not found and runs no task queries`() {
        every { projectRepository.findByIdAndOwnerId(10, 2) } returns null

        assertThrows<NotFoundException> { projectService.getSummary(projectId = 10, userId = 2) }

        verify(exactly = 0) { taskRepository.countByStatus(any()) }
    }
}
