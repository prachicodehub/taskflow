package com.taskflow.entity

enum class TaskStatus { TODO, IN_PROGRESS, DONE }

/** [rank] gives the real order (HIGH > MEDIUM > LOW); alphabetical order would be wrong. */
enum class TaskPriority(val rank: Int) {
    LOW(1),
    MEDIUM(2),
    HIGH(3),
}
