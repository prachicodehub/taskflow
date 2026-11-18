package com.taskflow.dto

import java.time.Instant

/** The single JSON shape for every error response (400, 401, 403, 404, 409, 500). */
data class ApiError(
    val status: Int,
    val error: String,
    val message: String,
    val path: String,
    val fieldErrors: List<ApiFieldError> = emptyList(),
    val timestamp: Instant = Instant.now(),
)

data class ApiFieldError(
    val field: String,
    val message: String,
)
