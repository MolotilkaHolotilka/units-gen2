# Remotion: картинка + анимированный текст → видео

План внедрения видео-модуля в существующий проект `mascot-gen`.
Цель: взять сгенерированную картинку, наложить анимированный заголовок,
отрендерить `.mp4` **на своём сервере** (без облака) и положить рядом с галереей.

---

## 0. Как это вообще работает (модель в голове)

Remotion — это «видео как React-компонент».
- Ты описываешь **один кадр** как обычный JSX (фон-картинка + текст поверх).
- Анимацию задаёшь как **функцию от номера кадра**: `frame 0 → 0% видимости`,
  `frame 20 → 100%`. Между ними значения считает `interpolate()` / `spring()`.
- Видео = последовательность кадров. При 30 fps ролик в 5 секунд = 150 кадров.
- **Рендер на сервере**: пакет `@remotion/renderer` поднимает headless-Chromium,
  прогоняет все кадры, скриншотит каждый и склеивает через встроенный ffmpeg в `.mp4`.

Ключевой факт для нас: рендер живёт **внутри Node**, то есть ложится прямо в твой
текущий `server.js` как ещё один эндпоинт. Никаких внешних сервисов.

---

## 1. Архитектура (как встроить в текущий проект)

Сейчас поток такой:
```
UI → POST /api/generate → fal.ai → скачиваем картинку → _generated/ + gallery.json
```

Добавляем второй поток:
```
UI (выбрал картинку + ввёл заголовок)
   → POST /api/render-video { imageUrl, headline, preset }
   → server.js зовёт renderMedia() из @remotion/renderer
   → Chromium прогоняет кадры композиции
   → ffmpeg склеивает в mp4
   → _generated/<id>.mp4  +  запись в gallery.json (type: "video")
   → UI получает ссылку и показывает <video>
```

Проект делится на **две части**, которые живут в одной папке:
1. `remotion/` — Remotion-проект (композиции, React-компоненты сцен).
2. `server.js` — добавляем эндпоинт, который вызывает рендер этих композиций.

---

## 2. Что поставить

```bash
npm i @remotion/renderer @remotion/bundler remotion react react-dom
```

- `remotion` — ядро (хуки `useCurrentFrame`, `interpolate`, `spring`, `<Img>`, `<Sequence>`).
- `@remotion/bundler` — собирает твой Remotion-проект в бандл (один раз перед рендером).
- `@remotion/renderer` — `renderMedia()` и `selectComposition()` для серверного рендера.
- `react` / `react-dom` — Remotion на React.

> Системно на сервере: Remotion сам тянет нужный Chromium и ffmpeg.
> На чистом Linux-VPS один раз ставятся системные библиотеки для Chromium
> (шрифты, libnss и т.д.) — Remotion при первом запуске подскажет, чего не хватает.

---

## 3. Структура файлов (что добавится)

```
v0001 - units-gen/
├── server.js                      # +1 эндпоинт /api/render-video
├── remotion/
│   ├── index.ts                   # registerRoot()
│   ├── Root.tsx                   # <Composition id="mascot-card" .../>
│   ├── MascotCard.tsx             # сама сцена: картинка + анимированный текст
│   └── animations.ts              # пресеты появления текста (fade / slide / typewriter)
└── _generated/                    # сюда же падают mp4
```

---

## 4. Сцена (сердце всего) — `MascotCard.tsx`

Концептуально (псевдокод, не финальный):

```tsx
const MascotCard = ({ imageUrl, headline, preset }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // текст «въезжает» с 10-го по 30-й кадр
  const progress = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const y = interpolate(progress, [0, 1], [40, 0]);     // снизу вверх
  const opacity = interpolate(progress, [0, 1], [0, 1]); // проявление

  return (
    <AbsoluteFill style={{ backgroundColor: "#f4f2ec" }}>
      <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: 80 }}>
        <h1 style={{
          transform: `translateY(${y}px)`,
          opacity,
          fontFamily: "Space Grotesk",      // из DESIGN.md (display)
          fontSize: 92,
          letterSpacing: "-3.8px",
          color: "#111111",
        }}>
          {headline}
        </h1>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

Важно: **дизайн берём из `DESIGN.md`** — те же шрифты (Space Grotesk / Inter),
цвета (`#f4f2ec`, `#111111`, акценты `#ff3b30` / `#49f7a5`), чтобы видео было
в том же бренд-стиле, что и интерфейс.

### Пресеты анимации (`animations.ts`)
- `fade` — простое проявление.
- `slide-up` — выезд снизу + проявление (вариант выше).
- `typewriter` — текст печатается по буквам (срез строки по `frame`).
- `mask-reveal` — открывается из-под полосы.

Это и есть ответ на твой вопрос «разные стили на выбор»: один проп `preset`
переключает функцию анимации.

---

## 5. Регистрация композиции — `Root.tsx`

```tsx
export const Root = () => (
  <Composition
    id="mascot-card"
    component={MascotCard}
    durationInFrames={150}     // 5 сек при 30 fps
    fps={30}
    width={1080} height={1350} // 4:5 под соцсети (берём из настроек)
    defaultProps={{ imageUrl: "", headline: "MASCOT", preset: "slide-up" }}
  />
);
```

Размеры/длительность можно прокидывать из UI (у тебя уже есть селектор aspect ratio).

---

## 6. Серверный эндпоинт — добавить в `server.js`

Рядом с `if (req.method === "POST" && req.url === "/api/generate")` добавляем:

```js
// псевдокод
if (req.method === "POST" && req.url === "/api/render-video") {
  const { imageUrl, headline, preset } = await readJsonBody(req);

  // 1. собрать бандл (кэшировать — собирать один раз, не на каждый запрос!)
  const bundleLocation = await bundle({ entryPoint: "./remotion/index.ts" });

  // 2. выбрать композицию + прокинуть пропсы
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "mascot-card",
    inputProps: { imageUrl, headline, preset },
  });

  // 3. рендер в файл
  const fileName = `${id}.mp4`;
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: path.join(GENERATED_DIR, fileName),
    inputProps: { imageUrl, headline, preset },
  });

  // 4. записать в gallery.json как { type: "video", videoUrl: `/generated/${fileName}` }
  // 5. вернуть ссылку
}
```

Тонкости, которые сразу заложить:
- **Бандл собирать один раз** при старте сервера (или кэшировать), а не на каждый запрос — иначе каждый рендер будет ждать сборку.
- **Картинку отдавать локальным путём** (`_generated/...png`), чтобы Chromium внутри рендера её гарантированно достал. У тебя картинки уже лежат локально — удобно.
- **Шрифты**: положить `.woff2` (Space Grotesk, Inter) в remotion-проект и подключить через `@remotion/google-fonts` или `staticFile`, иначе на сервере отрендерится системным шрифтом.
- **Очередь**: рендер — это CPU-тяжёлая операция на секунды. Если жмут кнопку часто, делать простую очередь (по одному рендеру за раз), чтобы не положить сервер.

---

## 7. UI (минимальная надстройка)

В блок результата (`result-panel`) добавить:
- поле ввода заголовка (`headline`);
- селектор пресета анимации (fade / slide-up / typewriter);
- кнопку «Make video»;
- `<video controls>` для предпросмотра + ссылку на скачивание.

Галерея уже умеет показывать карточки — добавить ветку: если `type === "video"`,
рисовать `<video>` вместо `<img>`.

---

## 8. Деплой на свой сервер

- Node 18+ — уже есть.
- Поставить системные зависимости Chromium (на Ubuntu — пакет шрифтов + libnss3 и пр.; Remotion при первом рендере явно перечислит недостающее).
- ffmpeg отдельно ставить **не нужно** — Remotion использует свой.
- Память: рендер Chromium любит RAM. Для 1080×1350 / 5 сек комфортно от 2 ГБ, лучше 4 ГБ.
- Запуск как сейчас: `node server.js` (можно под `pm2` / systemd).

---

## 9. Лицензия (важно знать заранее)

Remotion бесплатен для частных лиц, фрилансеров и команд/компаний **до 3 человек**.
Для компаний от 4 человек — платная Company License.
Для личного/маленького проекта — бесплатно. Стоит проверить под свой случай до того, как закладывать в продукт.

---

## 10. Порядок внедрения (когда дойдём до кода)

1. `npm i` пакетов Remotion.
2. Создать `remotion/` с одной композицией `mascot-card` и пресетом `slide-up`.
3. Локально проверить через Remotion Studio (`npx remotion studio`) — это визуальный
   предпросмотр анимации без сервера, очень помогает крутить тайминги.
4. Добавить эндпоинт `/api/render-video` в `server.js` (с кэшем бандла).
5. Прикрутить шрифты бренда.
6. Добавить кнопку и `<video>` в UI.
7. Добавить остальные пресеты анимации.
8. Завести очередь рендеров.
9. Деплой + системные зависимости Chromium.

---

### Резюме одним абзацем
Remotion позволяет описать «картинка + анимированный заголовок» как React-сцену и
отрендерить её в `.mp4` прямо из твоего Node-сервера (headless-Chromium + встроенный
ffmpeg). Встраивается как ещё один эндпоинт `/api/render-video` рядом с `/api/generate`,
результат кладётся в `_generated/` и в галерею. Полностью self-hosted, облако не нужно.
Главные грабли: собирать бандл один раз, отдавать картинку локальным путём, не забыть
бренд-шрифты и сделать простую очередь рендеров.
