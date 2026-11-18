package com.taskflow.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Clock

/**
 * Services ask this Clock for "today" instead of calling LocalDate.now() directly.
 * Tests can then pass a fixed clock and get the same result every day.
 */
@Configuration
class ClockConfig {
    @Bean
    fun clock(): Clock = Clock.systemDefaultZone()
}
