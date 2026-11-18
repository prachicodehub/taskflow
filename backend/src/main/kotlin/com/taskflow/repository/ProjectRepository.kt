package com.taskflow.repository

import com.taskflow.entity.Project
import org.springframework.data.jpa.repository.JpaRepository

interface ProjectRepository : JpaRepository<Project, Long> {

    fun findAllByOwnerIdOrderByCreatedAtDesc(ownerId: Long): List<Project>

    /** Ownership is part of the WHERE clause, so another user's project is simply "not found". */
    fun findByIdAndOwnerId(id: Long, ownerId: Long): Project?
}
