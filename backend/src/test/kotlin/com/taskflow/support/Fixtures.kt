package com.taskflow.support

import com.taskflow.entity.Project
import com.taskflow.entity.Task
import com.taskflow.entity.TaskPriority
import com.taskflow.entity.TaskStatus
import com.taskflow.entity.User
import com.taskflow.repository.StatusCount
import java.time.Clock
import java.time.LocalDate
import java.time.ZoneOffset

/** Small builders so unit tests read as "given a task with X" instead of constructor noise. */
object Fixtures {

    /** Every unit test runs "on" this date, so date rules are deterministic. */
    val TODAY: LocalDate = LocalDate.of(2026, 3, 10)
    val CLOCK: Clock = Clock.fixed(TODAY.atStartOfDay().toInstant(ZoneOffset.UTC), ZoneOffset.UTC)

    fun user(id: Long = 1, name: String = "Alice", email: String = "alice@test.dev") =
        User(name = name, email = email, passwordHash = "hashed").apply { this.id = id }

    fun project(id: Long = 10, owner: User = user(), name: String = "Website") =
        Project(name = name, description = null, owner = owner).apply { this.id = id }

    fun task(
        id: Long = 100,
        project: Project = project(),
        title: String = "Write tests",
        status: TaskStatus = TaskStatus.TODO,
        priority: TaskPriority = TaskPriority.MEDIUM,
        dueDate: LocalDate? = null,
        assignee: User? = null,
    ) = Task(title, null, status, priority, dueDate, assignee, project).apply { this.id = id }

    fun statusCount(status: TaskStatus, count: Long) = object : StatusCount {
        override val status = status
        override val count = count
    }
}
