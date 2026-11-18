package com.taskflow.exception

import com.fasterxml.jackson.databind.exc.InvalidFormatException
import com.fasterxml.jackson.databind.exc.MismatchedInputException
import com.taskflow.dto.ApiError
import com.taskflow.dto.ApiFieldError
import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.web.ErrorResponse
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.HandlerMethodValidationException
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.servlet.resource.NoResourceFoundException

/**
 * Turns every exception thrown by a controller or service into the ApiError JSON shape.
 * Like an Express error-handling middleware `(err, req, res, next) => ...`, but each
 * exception type gets its own small method.
 *
 * (Errors raised inside the security filters — 401/403 — are written by SecurityErrorResponder.)
 */
@RestControllerAdvice
class GlobalExceptionHandler {

    private val log = LoggerFactory.getLogger(javaClass)

    // ---------- 400 Bad Request ----------

    /** @Valid on a request body failed, e.g. blank title. One entry per invalid field. */
    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleBodyValidation(ex: MethodArgumentNotValidException, request: HttpServletRequest) =
        respond(
            HttpStatus.BAD_REQUEST,
            "Validation failed",
            request,
            ex.bindingResult.fieldErrors.map { ApiFieldError(it.field, it.defaultMessage ?: "Invalid value") },
        )

    /** Constraint annotations directly on controller parameters failed. */
    @ExceptionHandler(HandlerMethodValidationException::class)
    fun handleParameterValidation(ex: HandlerMethodValidationException, request: HttpServletRequest) =
        respond(
            HttpStatus.BAD_REQUEST,
            "Validation failed",
            request,
            ex.parameterValidationResults.flatMap { result ->
                result.resolvableErrors.map {
                    ApiFieldError(result.methodParameter.parameterName ?: "parameter", it.defaultMessage ?: "Invalid value")
                }
            },
        )

    /** A business rule in a service failed, e.g. due date in the past. */
    @ExceptionHandler(BadRequestException::class)
    fun handleBadRequest(ex: BadRequestException, request: HttpServletRequest) =
        respond(
            HttpStatus.BAD_REQUEST,
            ex.message ?: "Bad request",
            request,
            listOf(ApiFieldError(ex.field, ex.message ?: "Invalid value")),
        )

    /** Body is not valid JSON, or a value has the wrong type (e.g. "priority": "URGENT"). */
    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleUnreadableBody(ex: HttpMessageNotReadableException, request: HttpServletRequest): ResponseEntity<ApiError> {
        val cause = ex.cause as? MismatchedInputException
            ?: return respond(HttpStatus.BAD_REQUEST, "Malformed JSON request", request)

        val field = cause.path.joinToString(".") { it.fieldName ?: "[${it.index}]" }.ifEmpty { "body" }
        val message = (cause as? InvalidFormatException)?.let { invalid ->
            val allowed = invalid.targetType?.enumConstants?.joinToString()
            if (allowed != null) "Invalid value '${invalid.value}'. Allowed values: $allowed" else "Invalid value '${invalid.value}'"
        } ?: "Invalid or missing value"

        return respond(HttpStatus.BAD_REQUEST, "Validation failed", request, listOf(ApiFieldError(field, message)))
    }

    /** Query/path parameter has the wrong type, e.g. ?status=FOO or /projects/abc. */
    @ExceptionHandler(MethodArgumentTypeMismatchException::class)
    fun handleTypeMismatch(ex: MethodArgumentTypeMismatchException, request: HttpServletRequest): ResponseEntity<ApiError> {
        val allowed = ex.requiredType?.enumConstants?.joinToString()
        val message = if (allowed != null) {
            "Invalid value '${ex.value}'. Allowed values: $allowed"
        } else {
            "Invalid value '${ex.value}'"
        }
        return respond(HttpStatus.BAD_REQUEST, "Validation failed", request, listOf(ApiFieldError(ex.name, message)))
    }

    // ---------- 401 / 404 / 409 ----------

    @ExceptionHandler(BadCredentialsException::class)
    fun handleBadCredentials(ex: BadCredentialsException, request: HttpServletRequest) =
        respond(HttpStatus.UNAUTHORIZED, ex.message ?: "Invalid email or password", request)

    @ExceptionHandler(NotFoundException::class)
    fun handleNotFound(ex: NotFoundException, request: HttpServletRequest) =
        respond(HttpStatus.NOT_FOUND, ex.message ?: "Resource not found", request)

    /** Unknown URL. */
    @ExceptionHandler(NoResourceFoundException::class)
    fun handleNoResource(ex: NoResourceFoundException, request: HttpServletRequest) =
        respond(HttpStatus.NOT_FOUND, "No endpoint ${request.method} ${request.requestURI}", request)

    @ExceptionHandler(ConflictException::class)
    fun handleConflict(ex: ConflictException, request: HttpServletRequest) =
        respond(HttpStatus.CONFLICT, ex.message ?: "Conflict", request)

    /** A DB constraint caught something the service check missed (e.g. two simultaneous sign-ups). */
    @ExceptionHandler(DataIntegrityViolationException::class)
    fun handleDataIntegrity(ex: DataIntegrityViolationException, request: HttpServletRequest): ResponseEntity<ApiError> {
        log.warn("Data integrity violation on {} {}: {}", request.method, request.requestURI, ex.mostSpecificCause.message)
        return respond(HttpStatus.CONFLICT, "The request conflicts with existing data", request)
    }

    // ---------- 500 ----------

    /**
     * Fallback. Spring MVC's own exceptions (415 unsupported media type, missing parameter, ...)
     * already know their HTTP status, so we keep it. Anything else is a real bug: log it,
     * but never leak a stack trace to the client.
     */
    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception, request: HttpServletRequest): ResponseEntity<ApiError> {
        if (ex is ErrorResponse) {
            val status = HttpStatus.resolve(ex.statusCode.value()) ?: HttpStatus.BAD_REQUEST
            return respond(status, ex.body.detail ?: status.reasonPhrase, request)
        }
        log.error("Unhandled error on {} {}", request.method, request.requestURI, ex)
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred", request)
    }

    private fun respond(
        status: HttpStatus,
        message: String,
        request: HttpServletRequest,
        fieldErrors: List<ApiFieldError> = emptyList(),
    ): ResponseEntity<ApiError> =
        ResponseEntity.status(status).body(
            ApiError(
                status = status.value(),
                error = status.reasonPhrase,
                message = message,
                path = request.requestURI,
                fieldErrors = fieldErrors,
            ),
        )
}
