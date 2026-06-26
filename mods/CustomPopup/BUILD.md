# CustomPopup

**Popup в игре** на Custom UI (`InteractiveCustomUIPage`) — карточка поверх мира, как YooKassa / ServerWelcome.

Не открывает внешний браузер и не раздаёт HTML. Контент — `Label` + `TextButton` + `Message` (в т.ч. кликабельные ссылки через `Message.link`).

## Ограничение Hytale

**JavaScript внутри игрового UI серверным модом выполнить нельзя** — в API нет WebView/HTML. JS возможен только во внешнем браузере (отдельная схема, если понадобится).

## Сборка

```bash
cd mods/CustomPopup && ./gradlew jar
```

## Проверка

`/custompopup` — демо: текст со ссылкой, две кнопки.

## API

```java
PopupService popup = CustomPopupPlugin.instance().service();
popup.open(playerRef, ref, store, PopupContent.builder()
    .title("Заголовок")
    .body(Message.raw("Текст ").insert(Message.raw("ссылка").link("https://example.com")))
    .actions(PopupAction.of("pay", "Оплатить"))
    .build(),
    (pr, r, st, actionId) -> { /* ... */ return false; });
```

## Интеграция

- **ServerWelcome** — заменить свой `RulesPage` на `PopupService` + общий `.ui`.
- **YooKassaPayments** — форма оплаты в `PopupContent` / отдельный `.ui` через тот же плагин.
