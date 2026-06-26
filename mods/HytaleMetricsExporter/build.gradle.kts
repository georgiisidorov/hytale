plugins {
    java
}

group = "com.github.hytale"
version = "1.0.0"

val javaVersion = 25

repositories {
    mavenCentral()
}

dependencies {
    // Hytale server API:
    // - если собираем прямо на сервере — используем "оригинальный" jar без дублирования
    // - иначе (например, локальная сборка) — можно положить копию в libs/Server.jar
    val serverJar = file("/home/hytale/server/HytaleServer.jar")
    compileOnly(files(if (serverJar.exists()) serverJar else file("libs/Server.jar")))
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(javaVersion))
    }
}

