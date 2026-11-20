# Spec Delta

## Purpose

Задаёт один формат ошибок для всех адресов API, чтобы фронт разбирал любую ошибку одной схемой и не получал внутренних подробностей сервера.

## ADDED Requirements

### Requirement: Единый формат ошибки
Каждый ответ API с кодом 4xx или 5xx SHALL иметь JSON-тело `{ "error": { "code": string, "message": string, "details"?: unknown } }`. `code` — машинный код из строчных латинских букв и `_`, `message` — текст для человека.

#### Scenario: Любая ошибка
- **WHEN** запрос к API заканчивается ошибкой
- **THEN** тело ответа соответствует формату `{ error: { code, message, details? } }`

### Requirement: Неизвестный адрес API
Сервер SHALL отвечать на запрос к неизвестному адресу под `/api` кодом 404 с `code` = `not_found`.

#### Scenario: Нет такого маршрута
- **WHEN** клиент запрашивает `GET /api/no-such-route`
- **THEN** ответ — 404, `error.code` = `not_found`

### Requirement: Запрос не прошёл проверку схемой
Сервер SHALL отвечать кодом 400 с `code` = `validation_failed`, если данные запроса не прошли проверку схемой; `details` SHALL содержать список ошибок проверки с путём к полю и текстом.

#### Scenario: Неверное тело запроса
- **GIVEN** маршрут проверяет тело запроса схемой
- **WHEN** клиент присылает тело, которое не подходит под схему
- **THEN** ответ — 400, `error.code` = `validation_failed`
- **AND** `error.details` — массив, в каждом элементе есть путь к полю и текст ошибки

### Requirement: Неверный JSON
Сервер SHALL отвечать кодом 400 с `code` = `invalid_json`, если тело запроса с типом `application/json` не разбирается как JSON.

#### Scenario: Битый JSON
- **WHEN** клиент присылает `Content-Type: application/json` и тело `{oops`
- **THEN** ответ — 400, `error.code` = `invalid_json`

### Requirement: Слишком большое тело
Сервер SHALL отвечать кодом 413 с `code` = `payload_too_large`, если JSON-тело запроса больше 100 КБ.

#### Scenario: Тело больше лимита
- **WHEN** клиент присылает JSON-тело больше 100 КБ
- **THEN** ответ — 413, `error.code` = `payload_too_large`

### Requirement: Внутренняя ошибка без подробностей
Сервер SHALL отвечать на непредвиденную ошибку кодом 500 с `code` = `internal_error` и общим текстом, и SHALL NOT включать в ответ текст исключения или стек вызовов.

#### Scenario: Ошибка в обработчике
- **WHEN** обработчик маршрута бросает непредвиденную ошибку с текстом `secret detail`
- **THEN** ответ — 500, `error.code` = `internal_error`
- **AND** в теле ответа нет `secret detail` и стека вызовов
