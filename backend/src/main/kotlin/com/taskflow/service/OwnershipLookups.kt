package com.taskflow.service

import com.taskflow.entity.Project
import com.taskflow.entity.Task
import com.taskflow.exception.NotFoundException
import com.taskflow.repository.ProjectRepository
import com.taskflow.repository.TaskRepository

/*
 * Every lookup by ID goes through these helpers, so the ownership rule lives in one place:
 * if the row doesn't belong to the current user we answer "not found" (404),
 * which doesn't reveal whether that ID exists for someone else.
 */

internal fun ProjectRepository.requireOwned(projectId: Long, userId: Long): Project =
    findByIdAndOwnerId(projectId, userId) ?: throw NotFoundException("Project $projectId not found")

internal fun TaskRepository.requireOwned(taskId: Long, userId: Long): Task =
    findByIdAndProjectOwnerId(taskId, userId) ?: throw NotFoundException("Task $taskId not found")
