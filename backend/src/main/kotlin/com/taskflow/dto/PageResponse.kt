package com.taskflow.dto

import org.springframework.data.domain.Page

/** Stable pagination shape for the frontend (Spring's own Page JSON is verbose and not guaranteed stable). */
data class PageResponse<T>(
    val content: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val last: Boolean,
)

fun <T> Page<T>.toPageResponse() = PageResponse(
    content = content,
    page = number,
    size = size,
    totalElements = totalElements,
    totalPages = totalPages,
    last = isLast,
)
