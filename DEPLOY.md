# DEPLOY — как выложить на сервер для команды

Приложение: Node-сервер (`server.js`) + статика + генерация картинок (FAL/OpenAI) +
рендер видео (Remotion → headless Chromium + встроенный ffmpeg).

> ⚠️ В приложении **нет авторизации**, а оно тратит платные API-ключи (FAL, OpenAI).
> Поэтому при выкладке наружу **обязательно** закрой его Basic Auth / VPN / IP-allowlist.
> Иначе любой, кто узнает адрес, будет жечь твои ключи.

Ниже два пути: **Docker** (рекомендую — все системные зависимости Chromium уже внутри)
и **«на голую Ubuntu»**.

---

## 🚀 Наш сценарий: Coolify (рекомендуется)

Файлы в репозитории: `Dockerfile`, `docker-compose.yaml`, `.env.example`, `.dockerignore`.
HTTPS и Basic Auth настраиваются в Coolify (Traefik) — в compose только **app**.

**Шаги:**

1. Подключить репозиторий в Coolify, выбрать `docker-compose.yaml`.
2. В переменных окружения задать `FAL_KEY`, `OPENAI_API_KEY` (и при необходимости модели).
3. Включить домен, HTTPS и Basic Auth в панели Coolify.
4. Задеплоить.

---

## Альтернатива: Ubuntu VPS + Docker (без Coolify)

`compose.yaml` поднимает один контейнер **app** на порту `8082`.
HTTPS и защиту ставь отдельно (nginx, Traefik, VPN).

**Шаги на сервере:**

```bash
# 0. Поставить Docker (если ещё нет)
curl -fsSL https://get.docker.com | sh

# 1. Залить проект на сервер (git clone или rsync), зайти в папку
cd units-gen

# 2. Подготовить .env
cp .env.example .env
nano .env        # вписать FAL_KEY, OPENAI_API_KEY

# 3. Собрать и запустить (первая сборка качает Chromium — пару минут)
docker compose up -d --build

# 4. Логи / проверка
docker compose logs -f app
```

Готово: приложение на `http://IP:8082` (или за reverse-proxy с HTTPS).

**Обновление после правок кода:**
```bash
git pull        # или rsync новые файлы
docker compose up -d --build
```

**Полезное:**
- Картинки/видео переживают пересборку — лежат в `./_generated` (примонтировано как volume).
- Перезапуск: `docker compose restart app`. Стоп: `docker compose down`.

Подробности по компонентам — ниже.

---

## Что нужно от сервера

- Linux VPS (Ubuntu 22.04+), Node 18+ (лучше 20/22).
- RAM: **минимум 2 ГБ, комфортно 4 ГБ** (Chromium при рендере любит память).
- Диск: ~1–2 ГБ под Chromium + место под `_generated/` (картинки и видео копятся).
- Исходящий интернет (FAL, OpenAI, Google Fonts при рендере).
- Домен + HTTPS (через reverse-proxy).

---

## Вариант A — Docker (рекомендуется)

- **Coolify** — `docker-compose.yaml` (HTTPS/Basic Auth в панели Coolify).
- **Standalone** — `compose.yaml` (только app на `:8082`, прокси снаружи).

`Dockerfile` — образ с системными либами Chromium + `npm ci` + предзагрузка браузера.

---

## Вариант B — на голую Ubuntu (без Docker)

```bash
# 1. Node (через nvm или nodesource), затем:
git clone <repo>            # или залить файлы (rsync/scp)
cd "v0001 - units-gen"
npm ci --omit=dev

# 2. Системные библиотеки для Chromium
sudo apt-get update && sudo apt-get install -y \
  libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 \
  libxrandr2 libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 \
  libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 fonts-liberation

# 3. Скачать Chromium для Remotion
npx remotion browser ensure

# 4. Создать .env (ключи)
#   FAL_KEY=...   OPENAI_API_KEY=...   PORT=8082
```

Запуск под процесс-менеджером, чтобы жил после перезагрузки:

**pm2:**
```bash
npm i -g pm2
PORT=8082 pm2 start server.js --name mascot-gen
pm2 save && pm2 startup
```

**или systemd** (`/etc/systemd/system/mascot-gen.service`):
```ini
[Unit]
Description=Mascot Generator
After=network.target

[Service]
WorkingDirectory=/opt/mascot-gen/v0001 - units-gen
Environment=PORT=8082
EnvironmentFile=/opt/mascot-gen/v0001 - units-gen/.env
ExecStart=/usr/bin/node server.js
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now mascot-gen
```

---

## Reverse-proxy + HTTPS + защита (обязательно)

На **Coolify** это настраивается в UI (домен, сертификат, Basic Auth).

Для standalone Docker — поставь nginx/Traefik перед `:8082` или закрой доступ через
VPN (WireGuard/Tailscale) и не свети порт наружу.

---

## Эксплуатация

- **Рендеры идут по одному за раз** (в коде — последовательная очередь), чтобы не
  положить сервер. Под нагрузкой нескольких человек видео будут вставать в очередь —
  это ок для команды, но если станет узко, выноси рендер в отдельный воркер.
- **Диск**: `_generated/` растёт. Периодически чистить старое или поставить cron на удаление
  файлов старше N дней (галерея хранит максимум 200 записей в `gallery.json`).
- **Ключи** только в `.env` на сервере, не в гит.
- **Первый рендер** после старта собирает Remotion-бандл (несколько секунд) — дальше быстрее
  (бандл кэшируется в памяти процесса; после рестарта собирается заново).
- **Обновление**: залить новый код → `npm ci` (если менялись зависимости) → перезапуск
  (`pm2 restart mascot-gen` / `systemctl restart` / пересборка Docker-образа).

---

## Чек-лист перед открытием команде

- [ ] `.env` с рабочими `FAL_KEY` и `OPENAI_API_KEY`.
- [ ] `npx remotion browser ensure` отработал (Chromium на месте).
- [ ] Тестовый рендер видео прошёл (`POST /api/render-video`).
- [ ] Reverse-proxy + HTTPS подняты.
- [ ] Закрыто Basic Auth / VPN — наружу без защиты не висит.
- [ ] `_generated/` на volume / с бэкапом, есть план чистки диска.
