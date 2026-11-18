package com.taskflow.security

import com.fasterxml.jackson.databind.ObjectMapper
import com.taskflow.dto.ApiError
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.stereotype.Component

/**
 * Security rejections happen in filters, before any controller runs, so @RestControllerAdvice
 * never sees them. This class writes the same ApiError JSON for those cases:
 *  - 401 when there is no valid login (AuthenticationEntryPoint)
 *  - 403 when logged in but not allowed (AccessDeniedHandler)
 */
@Component
class SecurityErrorResponder(private val objectMapper: ObjectMapper) : AuthenticationEntryPoint, AccessDeniedHandler {

    override fun commence(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authException: AuthenticationException,
    ) {
        val message = request.getAttribute(JwtAuthenticationFilter.AUTH_ERROR_ATTRIBUTE) as? String
            ?: "Authentication required"
        write(request, response, HttpStatus.UNAUTHORIZED, message)
    }

    override fun handle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        accessDeniedException: AccessDeniedException,
    ) = write(request, response, HttpStatus.FORBIDDEN, "You do not have access to this resource")

    private fun write(request: HttpServletRequest, response: HttpServletResponse, status: HttpStatus, message: String) {
        response.status = status.value()
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        objectMapper.writeValue(
            response.outputStream,
            ApiError(status = status.value(), error = status.reasonPhrase, message = message, path = request.requestURI),
        )
    }
}
