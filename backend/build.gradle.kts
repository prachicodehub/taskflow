plugins {
    id("org.springframework.boot") version "3.5.16"
    id("io.spring.dependency-management") version "1.1.7"
    kotlin("jvm") version "2.2.21"
    // Makes Spring-annotated classes `open` (Kotlin classes are final by default; Spring needs to subclass them for proxies).
    kotlin("plugin.spring") version "2.2.21"
    // Adds no-arg constructors to @Entity classes, which Hibernate needs.
    kotlin("plugin.jpa") version "2.2.21"
}

group = "com.taskflow"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

val jjwtVersion = "0.12.7"
val springdocVersion = "2.8.17"
val mockkVersion = "1.14.12"
val springMockkVersion = "4.0.2"

dependencies {
    // Web, validation, persistence, security
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    // JWT
    implementation("io.jsonwebtoken:jjwt-api:$jjwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:$jjwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:$jjwtVersion")

    // Database + migrations
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")

    // API docs (Swagger UI at /swagger-ui.html)
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:$springdocVersion")

    // Tests
    testImplementation("org.springframework.boot:spring-boot-starter-test") {
        exclude(module = "mockito-core") // we use MockK instead
    }
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("io.mockk:mockk:$mockkVersion")
    testImplementation("com.ninja-squad:springmockk:$springMockkVersion")
    // In-memory DB: tests, plus `bootRun` with the h2 profile (developmentOnly = never packaged in the jar).
    testRuntimeOnly("com.h2database:h2")
    developmentOnly("com.h2database:h2")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
    compilerOptions {
        // Treat Spring's @Nullable annotations as Kotlin nullability.
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}

// JPA entities must be open so Hibernate can create lazy-loading proxies.
allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
