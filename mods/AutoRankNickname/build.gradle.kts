plugins {
    kotlin("jvm") version "2.2.21"
}

group = "com.github.autorank"
version = "1.0.0"

repositories {
    mavenCentral()
    maven("https://repo.codemc.io/repository/hytale/")
}

dependencies {
    // Hytale server API
    compileOnly(files("libs/Server.jar"))

    // Подключаем HeroChat как локальную зависимость; положи jar в папку libs
    compileOnly(files("libs/HeroChat-v1.7.0.jar"))
}

tasks.named<Jar>("jar") {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    from(
        configurations.runtimeClasspath.get().map { f ->
            if (f.isDirectory) f else zipTree(f)
        }
    )
    from("src/main/resources/manifest.json")
}

tasks {
    test {
        useJUnitPlatform()
    }
}

kotlin {
    jvmToolchain(25)
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_24)
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.release.set(24)
}

