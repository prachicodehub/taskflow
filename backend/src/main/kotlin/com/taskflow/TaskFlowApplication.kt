package com.taskflow

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

// Login is handled by our own AuthService + JWT, so we switch off Spring's default
// in-memory user (the one that prints "Using generated security password" at startup).
@SpringBootApplication(exclude = [UserDetailsServiceAutoConfiguration::class])
@ConfigurationPropertiesScan
class TaskFlowApplication

fun main(args: Array<String>) {
    runApplication<TaskFlowApplication>(*args)
}
