# Spec Delta

## Purpose

Даёт мониторингу и будущему деплою два адреса: жив ли процесс API и готов ли он обслуживать запросы, то есть доступна ли база.

## ADDED Requirements

### Requirement: Адрес «жив» не зависит от базы
Сервер SHALL отвечать на `GET /api/health` кодом 200 и телом `{ "status": "ok" }`, пока процесс работает, и SHALL NOT обращаться к базе данных при этом запросе.

#### Scenario: Процесс работает
- **WHEN** клиент запрашивает `GET /api/health`
- **THEN** ответ — 200, JSON `{ "status": "ok" }`

#### Scenario: База недоступна
- **GIVEN** база данных недоступна
- **WHEN** клиент запрашивает `GET /api/health`
- **THEN** ответ — 200, JSON `{ "status": "ok" }`

### Requirement: Адрес «готов» проверяет базу
Сервер SHALL отвечать на `GET /api/health/ready` после проверочного запроса к базе: кодом 200 и телом `{ "status": "ok", "db": "ok" }`, если база ответила, и кодом 503 и телом `{ "status": "error", "db": "error" }`, если не ответила.

#### Scenario: База доступна
- **GIVEN** база данных доступна
- **WHEN** клиент запрашивает `GET /api/health/ready`
- **THEN** ответ — 200, JSON `{ "status": "ok", "db": "ok" }`

#### Scenario: База недоступна
- **GIVEN** база данных недоступна
- **WHEN** клиент запрашивает `GET /api/health/ready`
- **THEN** ответ — 503, JSON `{ "status": "error", "db": "error" }`
- **AND** в ответе нет текста ошибки базы
