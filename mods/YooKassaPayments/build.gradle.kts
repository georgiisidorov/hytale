plugins {
    java
}

group = "com.github.hytale"
version = "1.5.128"

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

val assetsZip =
    sequenceOf(
        providers.gradleProperty("hytale.assetsZip").orNull,
        System.getenv("HYTALE_ASSETS_ZIP"),
        project.file("../../Assets.zip").absolutePath,
        project.file("../../../Assets.zip").absolutePath,
    ).firstOrNull { path -> path != null && project.file(path).exists() }
        ?.let { project.file(it) }

val payPageJava = project.file("src/main/java/com/github/hytale/yookassa/YooKassaPayPage.java")
val shopIconsDir = project.file("src/main/resources/Common/UI/Custom/Pages/YooKassa/Images/Shop/items")
val wheelIconsDir = project.file("src/main/resources/Common/UI/Custom/Pages/YooKassa/Images/Wheel/items")

dependencies {
    compileOnly(files(serverJar))
    implementation("org.json:json:20240303")
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(javaVersion))
    }
}

tasks.register<Exec>("upscaleItemIcons") {
    group = "yookassa"
    description = "Авто: иконки по item id из Java + апскейл Upscayl (инкрементально)"
    workingDir = project.projectDir
    commandLine("bash", "scripts/sync-upscale-item-icons.sh", "--quiet")

    inputs.file(payPageJava)
    inputs.dir(project.file("scripts"))
    inputs.dir(project.file("../../images"))
    assetsZip?.let { inputs.file(it) }
    // Всегда вызываем скрипт; внутри — инкремент (только новые/устаревшие id). Иначе Gradle
    // не замечает пропавшие PNG в outputs.dir.
    outputs.upToDateWhen { false }

    if (assetsZip != null) {
        environment("HYTALE_ASSETS_ZIP", assetsZip.absolutePath)
    }
    val skipUpscale = project.findProperty("yookassa.skipIconUpscale")?.toString() ?: "1"
    environment("YOOKASSA_SKIP_ICON_UPSCALE", skipUpscale)
    project.findProperty("yookassa.marketCatalogUrl")?.toString()?.trim()?.takeIf { it.isNotEmpty() }?.let {
        environment("MARKET_CATALOG_URL", it)
    }
    project.findProperty("yookassa.marketCatalogKey")?.toString()?.trim()?.takeIf { it.isNotEmpty() }?.let {
        environment("MARKET_CATALOG_API_KEY", it)
    }
    System.getenv("MARKET_CATALOG_URL")?.trim()?.takeIf { it.isNotEmpty() }?.let {
        environment("MARKET_CATALOG_URL", it)
    }
}

tasks.named<ProcessResources>("processResources") {
    dependsOn("upscaleItemIcons")
    exclude("yookassa.properties.example")
    exclude("Common/UI/Custom/Pages/YooKassa/YooKassaPaySafe.ui")
    exclude("Common/UI/Custom/Pages/YooKassa/YooKassaSmoke.ui")
    exclude("Common/UI/Custom/Pages/YooKassa/Images/.icons-upscale.stamp")
    exclude("Common/UI/Custom/Pages/YooKassa/Images/.header-upscale.stamp")
    exclude("Common/UI/Custom/Pages/YooKassa/Images/Wheel/.wheel-upscale.stamp")
    exclude("Common/UI/Custom/Pages/YooKassa/Images/plus.png")
    exclude("Common/UI/Custom/Pages/YooKassa/Images/x_24.png")
    exclude("Common/UI/Custom/Pages/YooKassa/Images/x_32.png")
    exclude("Common/UI/Custom/Pages/YooKassa/Images/x_hover.png")
    filesMatching("manifest.json") {
        filter { line ->
            line.replace(
                Regex(""""Version"\s*:\s*"[^"]+""""),
                """"Version": "${project.version}"""",
            )
        }
    }
}

tasks.named<Jar>("jar") {
    dependsOn("upscaleItemIcons")
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    from(
        configurations.runtimeClasspath.get().map { f ->
            if (f.isDirectory) f else zipTree(f)
        }
    ) {
        include("org/json/**")
        exclude("META-INF/**", "module-info.class")
    }
    from("src/main/resources/manifest.json")
}
