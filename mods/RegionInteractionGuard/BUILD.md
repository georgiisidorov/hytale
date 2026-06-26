# Сборка RegionInteractionGuard

Плагин не Gradle-проект: классы компилируются вручную против `Server.jar`.

JDK из репозитория (есть `javac`): `../jdk-25.0.2+10/bin/javac`.

```bash
cd RegionInteractionGuard
rm -rf build/out && mkdir -p build/out
../jdk-25.0.2+10/bin/javac --release 21 -encoding UTF-8 \
  -cp ../ServerWelcome/libs/Server.jar \
  -d build/out \
  src/main/java/com/github/regionguard/*.java
cp src/main/resources/manifest.json build/out/manifest.json
cd build/out
../../jdk-25.0.2+10/bin/jar cf ../RegionInteractionGuard-1.0.28.jar manifest.json com
cd ../..
cp build/RegionInteractionGuard-1.0.28.jar .
```

Готовый артефакт: **`RegionInteractionGuard-1.0.28.jar`** в корне каталога плагина.

После замены на сервере — **полный рестарт** процесса сервера.

## Отладка подсказки взаимодействия (preview)

В `plugins/RegionInteractionGuard/rules.txt` (или где лежит data folder плагина):

```properties
debug_preview=true
debug_preview_interval_sec=5
```

`/regionguard reload` — затем в **логах сервера** (INFO) появятся строки `[RegionInteractionGuard][preview-debug] ...` (цепочки подбора предметов, `willCancel`, `inProt`, `placed` и т.д.). Не чаще чем раз в `debug_preview_interval_sec` **на игрока**.

Если `willCancel=0` всегда, а подсказка `F` на клиенте есть — значит либо цепочек нет, либо подсказка рисуется **не** через то, что мы отменяем.
