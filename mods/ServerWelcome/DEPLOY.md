# Деплой ServerWelcome

## Ошибка `lateinit property userService has not been initialized`

Возникает, если в `mods` лежит **старый** `ServerWelcome-1.0.0.jar` (HeroChat ещё не готов в фазе `setup()`).

### Что сделать на сервере

1. Скопировать с машины разработки:
   - `build/libs/ServerWelcome-1.0.1.jar`
2. В каталоге `mods` сервера:
   - **удалить** `ServerWelcome-1.0.0.jar`
   - **положить** `ServerWelcome-1.0.1.jar`
3. Перезапустить контейнер / процесс Hytale.

Проверка в логе при старте: строка загрузки должна быть  
`Custom:ServerWelcome from path ServerWelcome-1.0.1.jar`.
