import { createServer } from "node:http";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadLocalEnv();

const PORT = Number(process.env.PORT || 8082);
const FAL_MODEL = process.env.FAL_MODEL || "fal-ai/nano-banana-2/edit";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

const PUBLIC_DIR = path.join(__dirname, "public");
const MEDIA_DIR = path.join(__dirname, "media");
const UNIT_DIR = path.join(__dirname, "_unit-gen");
const GENERATED_DIR = path.join(__dirname, "_generated");
const GALLERY_FILE = path.join(GENERATED_DIR, "gallery.json");
const PREFERRED_SOURCE_IMAGE = "media/Mascot/Basic/3.png";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
};

const REMOTION_ENTRY = path.join(__dirname, "remotion", "index.jsx");
const VIDEO_FORMATS = new Set(["4:5", "1:1", "9:16", "16:9"]);
const VIDEO_PRESETS = new Set(["slide-up", "fade", "typewriter", "mask-reveal"]);

const UNIT_FILES = [
  "01-personal-agents.md",
  "02-process-automation.md",
  "03-generative-workflow.md",
  "04-content-systems.md",
  "05-ai-interfaces.md",
  "06-visual-engines.md",
  "07-knowledge-systems.md",
  "08-experimental-labs.md",
];

const ALLOWED_HEX = new Set([
  "#f4f2ec",
  "#ebe8df",
  "#111111",
  "#0b0b0b",
  "#e8e5dc",
  "#dedacf",
  "#171717",
  "#c8c4ba",
  "#ff3b30",
  "#49f7a5",
]);

const BANNED_COLOR_RE = /\b(cyan|magenta|yellow|colorful|rainbow|purple|orange)\b/i;
const PART_IDS = [
  "display-face",
  "head-attachments",
  "body-shell",
  "front-controls",
  "storage-slots",
  "arms-hands",
  "modules-accessories",
  "stickers-labels",
  "wear-finish",
];

const PART_TITLES = {
  "display-face": "Display / Face",
  "head-attachments": "Head Attachments",
  "body-shell": "Body Shell / Material",
  "front-controls": "Front Controls / Buttons",
  "storage-slots": "Storage Slots / Cavities",
  "arms-hands": "Arms / Hands",
  "modules-accessories": "Modules / Accessories",
  "stickers-labels": "Stickers / Labels / Markings",
  "wear-finish": "Wear / Finish / Status Lights",
};

function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function sendError(res, statusCode, message, details = undefined) {
  sendJson(res, statusCode, { error: message, details });
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function isPathInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function publicPathToFile(requestPath) {
  const decodedPath = decodeURIComponent(requestPath.split("?")[0]);
  const cleanPath = decodedPath === "/" ? "/index.html" : decodedPath;

  if (cleanPath.startsWith("/media/")) {
    const filePath = path.normalize(path.join(__dirname, cleanPath));
    if (!isPathInside(MEDIA_DIR, filePath)) return null;
    return filePath;
  }

  if (cleanPath.startsWith("/generated/")) {
    const filePath = path.normalize(path.join(GENERATED_DIR, cleanPath.replace(/^\/generated\//, "")));
    if (!isPathInside(GENERATED_DIR, filePath)) return null;
    return filePath;
  }

  const filePath = path.normalize(path.join(PUBLIC_DIR, cleanPath));
  if (!isPathInside(PUBLIC_DIR, filePath)) return null;
  return filePath;
}

function parseUnitMarkdown(fileName, markdown) {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || fileName;
  const theme = markdown.match(/## Theme\s+([\s\S]*?)\n## Prompt/m)?.[1]?.trim() || "";
  const prompt = markdown.match(/## Prompt\s+([\s\S]*)$/m)?.[1]?.trim() || markdown.trim();
  const id = fileName.replace(".md", "");
  return { id, fileName, title, theme, prompt };
}

async function listMascotImages() {
  const groups = await readdir(path.join(MEDIA_DIR, "Mascot"), { withFileTypes: true });
  const images = [];

  for (const group of groups) {
    if (!group.isDirectory()) continue;
    const groupDir = path.join(MEDIA_DIR, "Mascot", group.name);
    const files = await readdir(groupDir, { withFileTypes: true });

    for (const file of files) {
      if (!file.isFile() || !/\.(png|jpe?g|webp)$/i.test(file.name)) continue;
      const rel = `/media/Mascot/${encodeURIComponent(group.name)}/${encodeURIComponent(file.name)}`;
      images.push({
        id: `${group.name}/${file.name}`,
        group: group.name,
        file: file.name,
        url: rel,
        imagePath: `media/Mascot/${group.name}/${file.name}`,
      });
    }
  }

  return images.sort((a, b) => {
    if (a.imagePath === PREFERRED_SOURCE_IMAGE) return -1;
    if (b.imagePath === PREFERRED_SOURCE_IMAGE) return 1;

    const groupCompare = a.group.localeCompare(b.group);
    if (groupCompare !== 0) return groupCompare;
    return Number.parseInt(a.file, 10) - Number.parseInt(b.file, 10);
  });
}

async function getConfig() {
  const [template, ...unitMarkdown] = await Promise.all([
    readFile(path.join(UNIT_DIR, "mascot promt - template.md"), "utf8"),
    ...UNIT_FILES.map((fileName) => readFile(path.join(UNIT_DIR, fileName), "utf8")),
  ]);

  return {
    model: FAL_MODEL,
    textModel: OPENAI_MODEL,
    template,
    units: UNIT_FILES.map((fileName, index) => parseUnitMarkdown(fileName, unitMarkdown[index])),
    images: await listMascotImages(),
    palette: [...ALLOWED_HEX],
    defaults: {
      guidanceScale: 2.5,
      inferenceSteps: 28,
      outputFormat: "png",
      resolutionMode: "match_input",
      aspectRatio: "auto",
      resolution: "1K",
      safetyTolerance: "4",
      thinkingLevel: "minimal",
      sourceImagePath: PREFERRED_SOURCE_IMAGE,
    },
  };
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;

  const chunks = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("");
}

function normalizeGeneratedParts(parts) {
  const byId = new Map();
  for (const part of Array.isArray(parts) ? parts : []) {
    if (!PART_IDS.includes(part.id)) continue;
    const text = String(part.text || "").trim();
    if (!text) continue;
    byId.set(part.id, {
      id: part.id,
      title: PART_TITLES[part.id],
      text,
    });
  }

  return PART_IDS.map((id) => byId.get(id)).filter(Boolean);
}

function normalizeCreativeConcept(concept) {
  const source = concept && typeof concept === "object" ? concept : {};
  return {
    title: String(source.title || "").trim(),
    archetype: String(source.archetype || "").trim(),
    story: String(source.story || "").trim(),
    visualPrinciple: String(source.visualPrinciple || "").trim(),
    signatureDetails: Array.isArray(source.signatureDetails)
      ? source.signatureDetails.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
      : [],
    avoid: Array.isArray(source.avoid) ? source.avoid.map((item) => String(item).trim()).filter(Boolean).slice(0, 6) : [],
  };
}

async function buildPartsWithOpenAI({ concept, parts }) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env and restart npm run dev");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${openaiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: [
        "You are the creative director for the Bots & Bones mascot generator.",
        "Turn a short, rough, possibly non-English user idea into a rich fictional collectible mascot concept, then translate that concept into exactly nine editable physical customization parts.",
        "If the idea is in Russian or another language, understand it and output polished English image-editing prompt text.",
        "Do not merely repeat the user's words across the nine parts. First invent a specific visual archetype, narrative, attitude, product logic, and signature details.",
        "Example: 'английский гопник' should become a fictional UK estate-yard / football-terrace streetwise collectible robot archetype, not just the phrase repeated nine times.",
        "If the brief references a stereotype, transform it into a stylish fictional product archetype; avoid insulting caricature and avoid human ethnicity/class mockery.",
        "The output must be practical image-editing prompt text, not marketing copy.",
        "Preserve the original mascot identity, shape, proportions, camera, lighting, pose, and composition.",
        "The source image is a pose, lighting, material-quality, and character-structure reference, not a checklist of accessories to preserve.",
        "Source-image incidental props are not part of core identity. Template artifacts include eyeglasses, sunglasses, round frames, lenses, glasses arms, decorative flowers or daisies, ties, collars, shirts, plaid cloth, backpacks, novelty marks, snack packs, phones, smoking-related packs, visible third-party logos, and other random source accessories.",
        "If an incidental source artifact is not requested by the new concept, explicitly neutralize it, remove it cleanly, or convert it into a concept-relevant brand-safe tool/module in the relevant part.",
        "At least one generated part should include cleanup language for possible source artifacts such as eyewear, flowers, or costume props, without changing the core mascot silhouette.",
        "Do not let eyewear or lenses cover the display/face unless the generated concept explicitly asks for eyewear.",
        "Do not move existing parts, invent a new body layout, or assume a different anatomy.",
        "Each generated part must modify only the matching existing visible area of the source mascot.",
        "Prefer words like add, adjust, overlay, embed, attach, mark, tint, neutralize, convert, and refine. Do not tell the image model to replace or remove core mascot parts.",
        "For display/face, modify the existing display/face only; never relocate it to the torso or another body area.",
        "Use only the Bots & Bones brand palette: #f4f2ec, #ebe8df, #111111, #0b0b0b, #e8e5dc, #dedacf, #171717, #c8c4ba, #ff3b30, #49f7a5.",
        "Never introduce non-brand color words or non-brand hex colors.",
        "Keep the result premium, collectible, modular, and product-like.",
        "Each part text must contain concrete physical changes, not generic adjectives.",
        "Each part text should be 2-4 concise sentences and should only describe that specific physical part.",
        "Make the nine parts diverse: each part must add a different kind of detail such as expression, head detail, material, buttons, slot contents, arm/hand detail, accessory module, label language, or finish.",
      ].join("\n"),
      input: JSON.stringify({
        concept,
        requiredPartIds: PART_IDS,
        partTitles: PART_TITLES,
        currentParts: parts || [],
      }),
      max_output_tokens: 6000,
      reasoning: {
        effort: "minimal",
      },
      text: {
        format: {
          type: "json_schema",
          name: "mascot_parts",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["concept", "parts"],
            properties: {
              concept: {
                type: "object",
                additionalProperties: false,
                required: ["title", "archetype", "story", "visualPrinciple", "signatureDetails", "avoid"],
                properties: {
                  title: { type: "string" },
                  archetype: { type: "string" },
                  story: { type: "string" },
                  visualPrinciple: { type: "string" },
                  signatureDetails: {
                    type: "array",
                    minItems: 4,
                    maxItems: 6,
                    items: { type: "string" },
                  },
                  avoid: {
                    type: "array",
                    minItems: 3,
                    maxItems: 6,
                    items: { type: "string" },
                  },
                },
              },
              parts: {
                type: "array",
                minItems: 9,
                maxItems: 9,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "text"],
                  properties: {
                    id: { type: "string", enum: PART_IDS },
                    text: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || payload.detail || `OpenAI request failed with ${response.status}`);
  }

  if (payload.status === "incomplete") {
    throw new Error(payload.incomplete_details?.reason || "OpenAI response was incomplete");
  }

  const outputText = extractOutputText(payload);
  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("OpenAI returned invalid JSON for mascot parts");
  }
  const generatedParts = normalizeGeneratedParts(parsed.parts);
  if (generatedParts.length !== PART_IDS.length) {
    throw new Error("OpenAI returned an incomplete parts set");
  }

  const generatedConcept = normalizeCreativeConcept(parsed.concept);
  if (!generatedConcept.title || !generatedConcept.story || generatedConcept.signatureDetails.length < 4) {
    throw new Error("OpenAI returned an incomplete creative concept");
  }

  const conceptText = [
    generatedConcept.title,
    generatedConcept.archetype,
    generatedConcept.story,
    generatedConcept.visualPrinciple,
    generatedConcept.signatureDetails.join("\n"),
    generatedConcept.avoid.join("\n"),
  ].join("\n");
  const issues = validatePrompt(`${conceptText}\n${generatedParts.map((part) => part.text).join("\n")}`);
  if (issues.length > 0) {
    throw new Error(`Generated parts violated brand rules: ${issues.join(" ")}`);
  }

  return {
    concept: generatedConcept,
    parts: generatedParts,
    responseId: payload.id,
    model: payload.model || OPENAI_MODEL,
  };
}

async function readGallery() {
  try {
    const raw = await readFile(GALLERY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function writeGallery(items) {
  await mkdir(GENERATED_DIR, { recursive: true });
  await writeFile(GALLERY_FILE, JSON.stringify({ items }, null, 2), "utf8");
}

function extensionFromContentType(contentType) {
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("webp")) return ".webp";
  return ".png";
}

async function saveGalleryItem({ imageUrl, prompt, requestId, meta }) {
  if (!imageUrl) return null;

  await mkdir(GENERATED_DIR, { recursive: true });

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Generated image download failed with ${imageResponse.status}`);
  }

  const contentType = imageResponse.headers.get("content-type") || "image/png";
  const extension = extensionFromContentType(contentType);
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(16).slice(2, 8)}`;
  const fileName = `${id}${extension}`;
  const filePath = path.join(GENERATED_DIR, fileName);
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  await writeFile(filePath, buffer);

  const item = {
    id,
    createdAt: new Date().toISOString(),
    imageUrl: `/generated/${fileName}`,
    originalImageUrl: imageUrl,
    requestId,
    prompt,
    mode: meta?.mode || "manual",
    concept: meta?.concept || "",
    source: meta?.source || "",
    parts: Array.isArray(meta?.parts) ? meta.parts : [],
    settings: meta?.settings || {},
  };

  const items = await readGallery();
  items.unshift(item);
  await writeGallery(items.slice(0, 200));

  return item;
}

function validatePrompt(prompt) {
  const issues = [];
  const banned = prompt.match(BANNED_COLOR_RE);
  if (banned) {
    issues.push(`Remove non-brand color word: ${banned[0]}`);
  }

  const hexValues = [...prompt.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((match) => match[0].toLowerCase());
  const unknownHex = [...new Set(hexValues.filter((hex) => !ALLOWED_HEX.has(hex)))];
  if (unknownHex.length) {
    issues.push(`Remove non-brand hex values: ${unknownHex.join(", ")}`);
  }

  return issues;
}

function resolveMascotImage(imagePath) {
  if (!imagePath || typeof imagePath !== "string") {
    throw new Error("Missing imagePath");
  }

  const normalized = path.normalize(path.join(__dirname, imagePath));
  const mascotRoot = path.join(MEDIA_DIR, "Mascot");
  if (!isPathInside(mascotRoot, normalized)) {
    throw new Error("Image must be inside media/Mascot");
  }

  return normalized;
}

async function fileToDataUri(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[extension] || "application/octet-stream";
  const buffer = await readFile(filePath);
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function resolveExternalImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return null;

  const parsed = new URL(imageUrl);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("External source image must be an http(s) URL");
  }

  return parsed.toString();
}

async function resolveImageUrl({ imagePath, imageUrl }) {
  const externalUrl = resolveExternalImageUrl(imageUrl);
  if (externalUrl) return externalUrl;

  const imageFile = resolveMascotImage(imagePath);
  await stat(imageFile);
  return fileToDataUri(imageFile);
}

async function submitFalRequest({ prompt, imagePath, imageUrl, settings }) {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("FAL_KEY is not set. Run with FAL_KEY=... npm run dev");
  }

  const promptIssues = validatePrompt(prompt);
  if (promptIssues.length > 0) {
    const error = new Error("Prompt violates brand color rules");
    error.details = promptIssues;
    throw error;
  }

  const inputImageUrl = await resolveImageUrl({ imagePath, imageUrl });

  const isNanoBanana = FAL_MODEL.includes("nano-banana-2");
  const input = isNanoBanana
    ? {
        prompt,
        image_urls: [inputImageUrl],
        num_images: 1,
        aspect_ratio: settings?.aspectRatio || "auto",
        output_format: settings?.outputFormat || "png",
        safety_tolerance: settings?.safetyTolerance || "4",
        resolution: settings?.resolution || "1K",
        limit_generations: true,
      }
    : {
        prompt,
        image_url: inputImageUrl,
        num_images: 1,
        guidance_scale: Number(settings?.guidanceScale || 2.5),
        num_inference_steps: Number(settings?.inferenceSteps || 28),
        output_format: settings?.outputFormat || "png",
        resolution_mode: settings?.resolutionMode || "match_input",
        enable_safety_checker: true,
      };

  if (isNanoBanana && settings?.thinkingLevel) {
    input.thinking_level = settings.thinkingLevel;
  }

  const submitResponse = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
    method: "POST",
    headers: {
      authorization: `Key ${falKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const submitPayload = await submitResponse.json().catch(() => ({}));
  if (!submitResponse.ok) {
    throw new Error(submitPayload.detail || submitPayload.error || `FAL submit failed with ${submitResponse.status}`);
  }

  const statusUrl = submitPayload.status_url;
  const responseUrl = submitPayload.response_url;
  const requestId = submitPayload.request_id;
  let statusPayload = submitPayload;

  for (let attempt = 0; attempt < 90; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt < 10 ? 1000 : 2000));

    const statusResponse = await fetch(`${statusUrl}?logs=1`, {
      headers: { authorization: `Key ${falKey}` },
    });
    statusPayload = await statusResponse.json().catch(() => ({}));

    if (!statusResponse.ok && statusResponse.status !== 202) {
      throw new Error(statusPayload.detail || statusPayload.error || `FAL status failed with ${statusResponse.status}`);
    }

    if (statusPayload.status === "COMPLETED") break;
    if (statusPayload.status === "FAILED") {
      throw new Error(statusPayload.error || "FAL request failed");
    }
  }

  if (statusPayload.status !== "COMPLETED") {
    throw new Error("FAL request timed out while waiting for completion");
  }

  const finalResponse = await fetch(responseUrl, {
    headers: { authorization: `Key ${falKey}` },
  });
  const result = await finalResponse.json().catch(() => ({}));
  if (!finalResponse.ok) {
    throw new Error(result.detail || result.error || `FAL response failed with ${finalResponse.status}`);
  }

  return { requestId, status: statusPayload, result };
}

// --- Remotion video rendering -------------------------------------------

// Bundle is built once and reused across renders (building per request is slow).
let remotionBundlePromise = null;
// Renders are serialized: video rendering is CPU/RAM heavy, one at a time.
let renderChain = Promise.resolve();

async function getRemotionBundle() {
  if (!remotionBundlePromise) {
    const { bundle } = await import("@remotion/bundler");
    remotionBundlePromise = bundle({
      entryPoint: REMOTION_ENTRY,
      publicDir: path.join(__dirname, "remotion", "public"),
    }).catch((error) => {
      remotionBundlePromise = null; // allow retry on next request
      throw error;
    });
  }
  return remotionBundlePromise;
}

async function renderMascotVideo({ imageUrl, headline, subhead, preset, format }) {
  const { selectComposition, renderMedia, ensureBrowser } = await import("@remotion/renderer");
  await ensureBrowser();
  const serveUrl = await getRemotionBundle();
  const inputProps = { imageUrl, headline, subhead, preset, format };

  const composition = await selectComposition({ serveUrl, id: "mascot-card", inputProps });

  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(16).slice(2, 8)}`;
  const fileName = `${id}.mp4`;
  await mkdir(GENERATED_DIR, { recursive: true });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: path.join(GENERATED_DIR, fileName),
    inputProps,
  });

  return { id, fileName };
}

async function saveVideoGalleryItem({ id, fileName, headline, preset, format, sourceImageUrl }) {
  const item = {
    id,
    createdAt: new Date().toISOString(),
    type: "video",
    videoUrl: `/generated/${fileName}`,
    posterUrl: sourceImageUrl || "",
    headline,
    preset,
    format,
    mode: "video",
    concept: headline,
  };
  const items = await readGallery();
  items.unshift(item);
  await writeGallery(items.slice(0, 200));
  return item;
}

async function handleApi(req, res) {
  if (req.method === "GET" && req.url === "/api/config") {
    sendJson(res, 200, await getConfig());
    return;
  }

  if (req.method === "GET" && req.url === "/api/gallery") {
    sendJson(res, 200, { items: await readGallery() });
    return;
  }

  if (req.method === "POST" && req.url === "/api/validate") {
    const body = await readJsonBody(req);
    sendJson(res, 200, { issues: validatePrompt(String(body.prompt || "")) });
    return;
  }

  if (req.method === "POST" && req.url === "/api/build-parts") {
    const body = await readJsonBody(req);
    const concept = String(body.concept || "").trim();
    if (!concept) {
      sendError(res, 400, "Concept is required");
      return;
    }

    try {
      sendJson(
        res,
        200,
        await buildPartsWithOpenAI({
          concept,
          parts: body.parts,
        }),
      );
    } catch (error) {
      sendError(res, 400, error.message);
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/generate") {
    const body = await readJsonBody(req);
    const prompt = String(body.prompt || "").trim();
    if (!prompt) {
      sendError(res, 400, "Prompt is required");
      return;
    }

    try {
      const payload = await submitFalRequest({
        prompt,
        imagePath: body.imagePath,
        imageUrl: body.imageUrl,
        settings: body.settings,
      });
      const generatedImageUrl = payload.result?.images?.[0]?.url;
      const galleryItem = generatedImageUrl
        ? await saveGalleryItem({
            imageUrl: generatedImageUrl,
            prompt,
            requestId: payload.requestId,
            meta: body.galleryMeta,
          })
        : null;
      payload.galleryItem = galleryItem;
      sendJson(res, 200, payload);
    } catch (error) {
      sendError(res, 400, error.message, error.details);
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/render-video") {
    const body = await readJsonBody(req);
    const headline = String(body.headline || "").trim();
    const rawImage = String(body.imageUrl || "").trim();
    if (!headline) {
      sendError(res, 400, "Headline is required");
      return;
    }
    if (!rawImage) {
      sendError(res, 400, "Image is required");
      return;
    }

    const preset = VIDEO_PRESETS.has(body.preset) ? body.preset : "slide-up";
    const format = VIDEO_FORMATS.has(body.format) ? body.format : "4:5";
    const subhead = String(body.subhead || "").trim();

    // Remotion's headless browser fetches the image over HTTP; give it an
    // absolute URL pointing back at this server (local files are served at /generated and /media).
    const base = `http://127.0.0.1:${PORT}`;
    const imageUrl = /^https?:\/\//.test(rawImage)
      ? rawImage
      : `${base}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;

    try {
      const run = renderChain.then(() =>
        renderMascotVideo({ imageUrl, headline, subhead, preset, format }),
      );
      renderChain = run.catch(() => {}); // keep the chain alive after a failure
      const { id, fileName } = await run;
      const galleryItem = await saveVideoGalleryItem({
        id,
        fileName,
        headline,
        preset,
        format,
        sourceImageUrl: rawImage,
      });
      sendJson(res, 200, { videoUrl: `/generated/${fileName}`, galleryItem });
    } catch (error) {
      sendError(res, 500, error.message || "Video render failed");
    }
    return;
  }

  sendError(res, 404, "API route not found");
}

async function serveStatic(req, res) {
  const filePath = publicPathToFile(req.url || "/");
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME_TYPES[extension] || "application/octet-stream",
      "cache-control": [".html", ".css", ".js"].includes(extension) ? "no-store" : "public, max-age=3600",
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  try {
    if ((req.url || "").startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    sendError(res, 500, error.message || "Internal server error");
  }
});

server.listen(PORT, () => {
  console.log(`Bots & Bones mascot generator: http://localhost:${PORT}`);
  console.log(`IPv4 fallback: http://127.0.0.1:${PORT}`);
  console.log(`FAL model: ${FAL_MODEL}`);
  if (!process.env.FAL_KEY) {
    console.log("FAL_KEY is not set. Prompt building works; generation will return a setup error.");
  }
});
