# HideRegionMapLabels

Скрывает **только подписи** регионов `spawn` и `countryside` на карте WorldProtect. Цветная заливка зон не трогается.

## Сборка

```bash
./patch-wp-labels.sh          # патчит ../WorldProtect/WorldProtect-1.0.11.jar
cd .. && ./build-listed-plugins.sh
```

На сервер: пропатченный `WorldProtect-1.0.11.jar` + `HideRegionMapLabels-1.0.0.jar`. Удалите `WorldProtectOverlayFix`.

В `mods/WorldProtect/config/config.properties` можно снова включить `map.enabled=true`.
