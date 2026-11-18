package com.taskflow.repository

import com.taskflow.entity.User
import org.springframework.data.jpa.repository.JpaRepository

/**
 * Spring Data generates the implementation at startup from the method names,
 * e.g. findByEmail → "select u from User u where u.email = ?".
 */
interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): User?
    fun existsByEmail(email: String): Boolean
    fun findAllByOrderByNameAsc(): List<User>
}
