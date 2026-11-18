package com.taskflow.exception

/*
 * Domain exceptions thrown by services. They carry no HTTP details;
 * GlobalExceptionHandler (Phase 5) maps each one to a status code + ApiError body.
 */

/** → 404. Also used when a resource exists but belongs to another user, so IDs can't be probed. */
class NotFoundException(message: String) : RuntimeException(message)

/** → 409. E.g. registering an email that is already taken. */
class ConflictException(message: String) : RuntimeException(message)

/** → 400. A business rule failed for one specific request field. */
class BadRequestException(val field: String, message: String) : RuntimeException(message)
