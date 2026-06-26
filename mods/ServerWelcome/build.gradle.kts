plugins {
    kotlin("jvm") version "2.2.21"
}

group = "com.github.serverwelcome"
version = "1.1.1"

repositories {
    mavenCentral()
}

dependencies {
    implementation(kotlin("stdlib"))
    compileOnly(files("libs/Server.jar"))
}

tasks {
    test {
        useJUnitPlatform()
    }
}

// Hytale PluginClassLoader не видит kotlin-stdlib из сервера — кладём runtime в fat-jar.
// manifest.json — в конце jar, чтобы зависимости не перезаписали ServerVersion.
tasks.named<Jar>("jar") {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    from(
        configurations.runtimeClasspath.get().map { f ->
            if (f.isDirectory) f else zipTree(f)
        }
    )
    from("src/main/resources/manifest.json")
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

