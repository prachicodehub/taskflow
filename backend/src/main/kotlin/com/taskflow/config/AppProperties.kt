package com.taskflow.config

import org.springframework.boot.context.properties.ConfigurationProperties

/*
 * Typed settings bound from application.yml (like reading process.env, but checked at startup).
 * Picked up automatically thanks to @ConfigurationPropertiesScan on TaskFlowApplication.
 */

/** taskflow.jwt.* */
@ConfigurationProperties("taskflow.jwt")
data class JwtProperties(
    /** HS256 signing key; must be at least 32 bytes. */
    val secret: String,
    val expirationMinutes: Long,
)

/** taskflow.cors.* — a comma-separated env value becomes a list. */
@ConfigurationProperties("taskflow.cors")
data class CorsProperties(
    val allowedOrigins: List<String>,
)
