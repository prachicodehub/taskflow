package com.taskflow.security

/**
 * The logged-in user, as read from the JWT. Controllers receive it with
 * `@AuthenticationPrincipal user: AuthUser` (wired up in Phase 4).
 */
data class AuthUser(
    val id: Long,
    val email: String,
    val name: String,
)
