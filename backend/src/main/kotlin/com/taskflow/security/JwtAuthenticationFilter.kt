package com.taskflow.security

import io.jsonwebtoken.ExpiredJwtException
import io.jsonwebtoken.JwtException
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Runs once per request, before Spring Security decides whether the route needs a login.
 * Similar to an Express `authMiddleware`, except it never rejects the request itself:
 *  - valid token   → stores the AuthUser as the "current user"
 *  - missing/bad   → stores nothing; if the route is protected, Spring Security then
 *                    calls SecurityErrorResponder, which answers 401.
 *
 * Deliberately NOT a @Component: Spring Boot would also register it as a global servlet filter.
 * SecurityConfig creates it and puts it into the security filter chain only.
 */
class JwtAuthenticationFilter(private val jwtService: JwtService) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val token = request.getHeader(HttpHeaders.AUTHORIZATION)
            ?.takeIf { it.startsWith(BEARER_PREFIX) }
            ?.removePrefix(BEARER_PREFIX)
            ?.trim()

        if (token != null && SecurityContextHolder.getContext().authentication == null) {
            try {
                val user = jwtService.parseToken(token)
                // Empty authority list: the app has no roles, only "logged in or not".
                val authentication = UsernamePasswordAuthenticationToken(user, null, emptyList())
                SecurityContextHolder.getContext().authentication = authentication
            } catch (e: ExpiredJwtException) {
                request.setAttribute(AUTH_ERROR_ATTRIBUTE, "Token has expired")
            } catch (e: JwtException) {
                request.setAttribute(AUTH_ERROR_ATTRIBUTE, "Invalid token")
            }
        }

        filterChain.doFilter(request, response)
    }

    companion object {
        private const val BEARER_PREFIX = "Bearer "

        /** Lets SecurityErrorResponder explain *why* the request was rejected. */
        const val AUTH_ERROR_ATTRIBUTE = "taskflow.authError"
    }
}
