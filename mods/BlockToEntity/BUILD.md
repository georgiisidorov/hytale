# BlockToEntity

```bash
cd BlockToEntity
rm -rf build/out && mkdir -p build/out
javac --release 21 -encoding UTF-8 \
  -cp ../ServerWelcome/libs/Server.jar \
  -d build/out \
  src/main/java/com/github/blocktoentity/*.java
cp src/main/resources/manifest.json build/out/manifest.json
cd build/out
jar cf ../BlockToEntity-1.1.2.jar manifest.json com
cd ../..
cp build/BlockToEntity-1.1.2.jar .
```

Команда: **`/blocktoentity`** (игрок смотрит на блок). Поворот берётся из вокселя до `breakBlock` и применяется к сущности после спавна.

Сервер после замены плагина — **полный рестарт**.
