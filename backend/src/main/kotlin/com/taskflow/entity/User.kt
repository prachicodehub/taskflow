package com.taskflow.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity
@Table(name = "users") // "user" is a reserved word in PostgreSQL
class User(
    @Column(nullable = false, length = 100)
    var name: String,

    @Column(nullable = false, unique = true)
    var email: String,

    @Column(name = "password_hash", nullable = false, length = 100)
    var passwordHash: String,
) : BaseEntity()
