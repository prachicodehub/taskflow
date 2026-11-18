# ---- Build stage: compile and package the Spring Boot jar ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Gradle wrapper + build scripts first, so dependency downloads are cached between builds.
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null

COPY src src
# Tests run in CI; skip them here to keep image builds fast.
RUN ./gradlew --no-daemon bootJar -x test

# ---- Runtime stage: JRE only ----
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN useradd --system --uid 1001 taskflow
COPY --from=build /app/build/libs/*.jar app.jar
USER taskflow

EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
