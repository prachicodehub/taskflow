package com.taskflow.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "projects")
class Project(
    @Column(nullable = false, length = 100)
    var name: String,

    @Column(length = 1000)
    var description: String?,

    // Many projects belong to one owner. LAZY = don't load the user unless we touch it.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    var owner: User,
) : BaseEntity()
