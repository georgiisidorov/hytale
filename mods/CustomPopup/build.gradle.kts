plugins {
    java
}

group = "com.github.custompopup"
version = "1.1.0"

val javaVersion = 25

repositories {
    mavenCentral()
}

val serverJar =
    sequenceOf(
        project.file("../../HytaleServer.jar"),
        project.file("../HytaleMetricsExporter/libs/Server.jar"),
        project.file("/home/hytale/server/HytaleServer.jar"),
        project.file("libs/Server.jar"),
    ).firstOrNull { it.exists() }
        ?: error("Положите HytaleServer.jar/Server.jar: mods/HytaleMetricsExporter/libs/Server.jar или libs/Server.jar")

dependencies {
    compileOnly(files(serverJar))
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(javaVersion))
    }
}

tasks.named<Jar>("jar") {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    from("src/main/resources/manifest.json")
}
