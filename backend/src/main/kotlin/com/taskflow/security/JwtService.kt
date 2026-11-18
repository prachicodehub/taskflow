package com.taskflow.security

import com.taskflow.config.JwtProperties
import com.taskflow.entity.User
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.Date
import javax.crypto.SecretKey

data class IssuedToken(val token: String, val expiresAt: Instant)

/**
 * Creates and verifies JWTs (HS256).
 * Token payload: sub = user id, plus email and name, so requests need no DB lookup to know who is calling.
 */
@Service
class JwtService(
    private val properties: JwtProperties,
    private val clock: Clock,
) {
    // Fails fast at startup (WeakKeyException) if the secret is shorter than 256 bits.
    private val signingKey: SecretKey = Keys.hmacShaKeyFor(properties.secret.toByteArray(Charsets.UTF_8))

    fun issueToken(user: User): IssuedToken {
        val issuedAt = clock.instant()
        val expiresAt = issuedAt.plus(Duration.ofMinutes(properties.expirationMinutes))

        val token = Jwts.builder()
            .subject(requireNotNull(user.id).toString())
            .claim(CLAIM_EMAIL, user.email)
            .claim(CLAIM_NAME, user.name)
            .issuedAt(Date.from(issuedAt))
            .expiration(Date.from(expiresAt))
            .signWith(signingKey)
            .compact()

        return IssuedToken(token, expiresAt)
    }

    /**
     * Verifies signature and expiry, then returns the user inside the token.
     * @throws io.jsonwebtoken.ExpiredJwtException if the token has expired
     * @throws JwtException if the token is malformed, tampered with or otherwise invalid
     */
    fun parseToken(token: String): AuthUser {
        val claims = try {
            Jwts.parser()
                .verifyWith(signingKey)
                .clock { Date.from(clock.instant()) }
                .build()
                .parseSignedClaims(token)
                .payload
        } catch (e: IllegalArgumentException) {
            throw JwtException("Token is empty", e)
        }

        return AuthUser(
            id = claims.subject?.toLongOrNull() ?: throw JwtException("Token subject is not a user id"),
            email = claims.get(CLAIM_EMAIL, String::class.java) ?: throw JwtException("Token has no email"),
            name = claims.get(CLAIM_NAME, String::class.java) ?: "",
        )
    }

    private companion object {
        const val CLAIM_EMAIL = "email"
        const val CLAIM_NAME = "name"
    }
}
