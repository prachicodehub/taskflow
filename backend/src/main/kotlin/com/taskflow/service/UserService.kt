package com.taskflow.service

import com.taskflow.dto.UserResponse
import com.taskflow.dto.mapper.toResponse
import com.taskflow.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class UserService(private val userRepository: UserRepository) {

    /** Registered users, for the task "Assignee" dropdown. */
    fun listUsers(): List<UserResponse> = userRepository.findAllByOrderByNameAsc().map { it.toResponse() }
}
