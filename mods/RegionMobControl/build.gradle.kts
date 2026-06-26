plugins {
    kotlin("jvm") version "2.2.21"
}

group = "com.github.regionmob"
version = "1.0.0"

repositories {
    mavenCentral()
    maven("https://repo.codemc.io/repository/hytale/")
}

dependencies {
    implementation(kotlin("stdlib"))
    compileOnly(files("libs/Server.jar"))
    compileOnly(files("../WorldProtect/WorldProtect-1.0.11.jar"))
}

tasks {
    test {
        useJUnitPlatform()
    }
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

kotlin {
    jvmToolchain(25)
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_24)
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.release.set(24)
}
