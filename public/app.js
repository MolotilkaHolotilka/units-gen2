const state = {
  config: null,
  selectedImagePath: null,
  externalImageUrl: null,
  mode: "auto",
  intensity: "normal",
  wear: "light wear",
  parts: {},
  generatedConcept: null,
  promptDirty: false,
  lastResultUrl: null,
  galleryItems: [],
  settings: {
    aspectRatio: "auto",
    resolution: "1K",
    outputFormat: "png",
    thinkingLevel: "minimal",
    safetyTolerance: "4",
  },
};

const PREFERRED_SOURCE_IMAGE = "media/Mascot/Basic/3.png";
const VIEWS = new Set(["generator", "generator-v2", "info", "gallery"]);

const els = {
  navTabs: document.querySelectorAll(".nav-tab"),
  generatorView: document.querySelector("#generatorView"),
  infoView: document.querySelector("#infoView"),
  galleryView: document.querySelector("#galleryView"),
  infoChecks: document.querySelector("#infoChecks"),
  imageSelect: document.querySelector("#imageSelect"),
  sourceImage: document.querySelector("#sourceImage"),
  partsGrid: document.querySelector("#partsGrid"),
  enableAllPartsButton: document.querySelector("#enableAllPartsButton"),
  resetPartsButton: document.querySelector("#resetPartsButton"),
  conceptInput: document.querySelector("#conceptInput"),
  conceptPass: document.querySelector("#conceptPass"),
  autoPanel: document.querySelector("#autoPanel"),
  buildPartsButton: document.querySelector("#buildPartsButton"),
  contextInput: document.querySelector("#contextInput"),
  aspectRatioInput: document.querySelector("#aspectRatioInput"),
  resolutionInput: document.querySelector("#resolutionInput"),
  outputFormatInput: document.querySelector("#outputFormatInput"),
  thinkingLevelInput: document.querySelector("#thinkingLevelInput"),
  safetyToleranceInput: document.querySelector("#safetyToleranceInput"),
  imageModelValue: document.querySelector("#imageModelValue"),
  textModelValue: document.querySelector("#textModelValue"),
  rebuildPromptButton: document.querySelector("#rebuildPromptButton"),
  copyPromptButton: document.querySelector("#copyPromptButton"),
  promptEditor: document.querySelector("#promptEditor"),
  promptState: document.querySelector("#promptState"),
  qaState: document.querySelector("#qaState"),
  qaBox: document.querySelector("#qaBox"),
  generateButton: document.querySelector("#generateButton"),
  runStatus: document.querySelector("#runStatus"),
  resultImage: document.querySelector("#resultImage"),
  emptyResult: document.querySelector("#emptyResult"),
  resultStage: document.querySelector(".result-stage"),
  useResultButton: document.querySelector("#useResultButton"),
  downloadLink: document.querySelector("#downloadLink"),
  videoHeadline: document.querySelector("#videoHeadline"),
  videoSubhead: document.querySelector("#videoSubhead"),
  videoPreset: document.querySelector("#videoPreset"),
  videoFormat: document.querySelector("#videoFormat"),
  makeVideoButton: document.querySelector("#makeVideoButton"),
  videoStage: document.querySelector("#videoStage"),
  resultVideo: document.querySelector("#resultVideo"),
  videoDownloadLink: document.querySelector("#videoDownloadLink"),
  refreshGalleryButton: document.querySelector("#refreshGalleryButton"),
  galleryGrid: document.querySelector("#galleryGrid"),
};

const BRAND_RULES = `# BRAND COLOR RULES

Use only the Bots & Bones brand palette from DESIGN.md for all new materials, labels, lights, stickers, clothing, props, and accessories:
- canvas: #f4f2ec
- canvas-warm: #ebe8df
- ink: #111111
- inverse-canvas: #0b0b0b
- surface-1: #e8e5dc
- surface-2: #dedacf
- surface-dark: #171717
- technical-gray: #c8c4ba
- accent-red: #ff3b30
- accent-green: #49f7a5

Do NOT introduce any non-brand colorway.

Differentiate unit variants through materials, modules, labels, markings, status-light patterns, transparency, wear, and accessories rather than arbitrary colors.`;

const PRESERVATION_RULES = `# PRESERVATION RULES

Take the input robot image as a pose, lighting, material-quality, and character-structure reference. Modify ONLY the requested mascot attributes while fully preserving:
- robot shape,
- proportions,
- camera angle,
- framing,
- lighting,
- contrast,
- rendering quality,
- material style,
- pose,
- overall composition.

The robot must remain clearly recognizable as the exact same character.

Use the exact same visual style, rendering language, pixel-face style, transparency treatment, reflections, and material realism as the original image.

Preserve the core mascot identity, not incidental source props.

The source image is NOT a checklist of accessories to preserve.

Template artifacts are editable and must not survive by default: eyeglasses, sunglasses, round frames, lenses, glasses arms, decorative flowers or daisies, ties, collars, shirts, plaid cloth, backpacks, novelty marks, snack packs, phones, smoking-related packs, visible third-party logos, and other random source accessories.

If a template artifact is not explicitly requested by the generated concept, cleanly remove it, neutralize it into a brand-safe blank surface, or convert it into a concept-relevant module while preserving the robot pose, hand position, silhouette, camera, and rendering style.

Do not let eyewear or lenses cover the display/face unless the generated concept explicitly asks for eyewear.

Do NOT redesign the robot.`;

const RESTRICTIONS = `# IMPORTANT RESTRICTIONS

STRICTLY FORBIDDEN:
- changing robot proportions,
- changing robot silhouette,
- changing camera angle,
- zooming in,
- changing focal length,
- changing lighting,
- changing contrast,
- changing rendering style,
- changing composition,
- changing background,
- introducing colors outside the Bots & Bones brand palette.

Preserve the original image composition as closely as possible.

Do not carry unrequested eyewear, glasses, lenses, botanical props, flowers, ties, collars, shirts, novelty props, snack packs, phones, smoking-related packs, backpacks, or third-party branded props from the source into every result. They are not part of mascot identity.

If any new accessories risk being cropped, slightly zoom OUT only enough to fully fit the character into frame.

The robot must still look like the same collectible mascot variant from the same product universe.`;

const modifierCopy = {
  subtle: "Keep changes restrained, premium, and close to the original mascot.",
  normal: "Apply a clear unit transformation while preserving the original mascot identity.",
  strong: "Make the unit identity highly readable through modules, markings, and accessories, without redesigning the mascot.",
};

const PART_RULES = [
  {
    id: "display-face",
    number: "01",
    title: "Display / Face",
    autoText:
      "Translate the concept into the pixel face only: expression, eyes, diagnostic symbols, and display state. Keep the original display shape and pixel rendering. Remove unrequested eyewear from the display area.",
    defaultText:
      "Control the pixel expression, display state, eye language, loading symbols, diagnostic symbols, and emotional tone. Keep the same display shape and pixel-face rendering style. Do not replace the face with a human face. Expressions must stay minimal, readable, and mascot-like. If the source has glasses, lenses, or frames over the display and the concept does not ask for eyewear, remove them so the pixel face is unobstructed.",
  },
  {
    id: "head-attachments",
    number: "02",
    title: "Head Attachments",
    autoText:
      "Translate the concept into compact head-mounted details only: antenna, sensor, headphones, cap, or top module. Keep all attachments proportional and uncropped. Do not preserve template glasses unless requested.",
    defaultText:
      "Control headphones, antennas, sensors, caps, helmets, top modules, and small head-mounted devices. Attachments must fit the original head proportions. Do not crop attachments. Keep silhouettes compact unless the selected unit needs a technical module. Eyeglasses and sunglass frames are removable source artifacts unless the concept explicitly asks for eyewear.",
  },
  {
    id: "body-shell",
    number: "03",
    title: "Body Shell / Material",
    autoText:
      "Translate the concept into shell material, transparency, panels, and finish. Use only the brand palette and preserve the original body volume. Remove unrequested clothing-template artifacts.",
    defaultText:
      "Control shell material, transparency, internal visibility, surface finish, panels, and material swaps. Preserve the original body proportions and volume. Use only the Bots & Bones brand palette. Prefer translucent plastics, smoked acrylic, matte ABS, technical-gray panels, and premium electronics finishes. If the source has a tie, collar, shirt, plaid cloth, or similar costume layer and the concept does not ask for it, cleanly convert it into shell panels, labels, or blank brand-safe material.",
  },
  {
    id: "front-controls",
    number: "04",
    title: "Front Controls / Buttons",
    autoText:
      "Translate the concept into button icons, small embedded controls, status indicators, or labels. Keep icons minimal and physically embedded.",
    defaultText:
      "Control button icons, button labels, small display indicators, controls, knobs, and embedded symbols. Icons must look physically embedded into the existing controls. Keep icons minimal and readable. Do not add large UI panels over the body.",
  },
  {
    id: "storage-slots",
    number: "05",
    title: "Storage Slots / Cavities",
    autoText:
      "Translate the concept into cartridge slots, connector bays, stored tools, or memory objects. Keep objects inside compartments and avoid overcrowding.",
    defaultText:
      "Control visible compartments, cartridge slots, memory slots, connector bays, and stored objects. Objects must sit inside the compartment and not protrude too far. Keep compartments clean and believable. Avoid overcrowding tiny cavities.",
  },
  {
    id: "arms-hands",
    number: "06",
    title: "Arms / Hands",
    autoText:
      "Translate the concept into arm markings, wrist modules, grippers, or a small handheld prop. Preserve arm shape and pose. Neutralize any unrequested source prop held by the mascot, including flowers.",
    defaultText:
      "Control arm markings, hand pose details, grippers, wrist modules, handheld tools, and small interaction props. Preserve the original arm shape and pose. Props must match mascot scale. Do not hide the hands with oversized objects. If the source has an unrequested handheld prop such as a flower, snack, phone, or novelty item, convert it into a concept-relevant tool or neutral brand-safe module.",
  },
  {
    id: "modules-accessories",
    number: "07",
    title: "Modules / Accessories",
    autoText:
      "Translate the concept into detachable modules, sensors, cables, badges, tools, or unit-specific accessories. Keep the result modular and collectible. Do not preserve random source props, glasses, flowers, or costume artifacts unless the concept needs them.",
    defaultText:
      "Control detachable modules, cartridges, sensors, cameras, cables, probes, badges, tools, and unit-specific accessories. Accessories should clarify the selected unit type. Keep accessories modular and collectible. Do not turn the mascot into a different character. Random source props, eyewear, flowers, ties, shirts, backpacks, and novelty costume pieces should be removed, neutralized, or converted into concept-specific modules.",
  },
  {
    id: "stickers-labels",
    number: "08",
    title: "Stickers / Labels / Markings",
    autoText:
      "Translate the concept into sparse operational labels, serial marks, tape labels, arrows, status ticks, and product-like microtypography.",
    defaultText:
      "Control operational labels, serial numbers, status ticks, arrows, QR-like marks, tape labels, and microtypography. Markings must be sparse and intentional. Use brand colors only. Keep text and labels small, technical, and product-like.",
  },
  {
    id: "wear-finish",
    number: "09",
    title: "Wear / Finish / Status Lights",
    autoText:
      "Translate the concept into subtle wear, smudges, reflections, and status lights. Keep the finish premium and use only accent-red #ff3b30 and accent-green #49f7a5 for lights.",
    defaultText:
      "Control dust, scratches, smudges, operational wear, reflections, glow, ready/error indicators, and final surface polish. Wear must stay subtle and premium. Status lights must use accent-red #ff3b30 and accent-green #49f7a5 only. Do not make the robot look destroyed, dirty beyond use, or post-apocalyptic.",
  },
];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function selectedImage() {
  return (state.config?.images || []).find((image) => image.imagePath === state.selectedImagePath);
}

function buildPrompt() {
  const concept = els.conceptInput.value.trim();
  const context = els.contextInput.value.trim();
  const conceptPass = state.generatedConcept
    ? [
        `Title: ${state.generatedConcept.title}`,
        `Archetype: ${state.generatedConcept.archetype}`,
        `Story: ${state.generatedConcept.story}`,
        `Visual principle: ${state.generatedConcept.visualPrinciple}`,
        `Signature details: ${state.generatedConcept.signatureDetails.join("; ")}`,
        `Avoid: ${state.generatedConcept.avoid.join("; ")}`,
      ].join("\n")
    : "";
  const activeParts = PART_RULES.filter((part) => state.parts[part.id]?.enabled)
    .map((part) => `## ${part.number} — ${part.title}\n${state.parts[part.id].text.trim()}`)
    .join("\n\n");

  return [
    PRESERVATION_RULES,
    BRAND_RULES,
    concept ? `# AUTO BRIEF\n\nUse this idea as the creative brief: ${concept}` : "",
    conceptPass ? `# GENERATED CREATIVE CONCEPT\n\n${conceptPass}` : "",
    activeParts ? `# CUSTOMIZABLE MASCOT PARTS\n\n${activeParts}` : "",
    `# CONTROLLED MODIFIERS\n\nIntensity: ${state.intensity}\n${modifierCopy[state.intensity]}\n\nWear level: ${state.wear}.\nUse wear only as subtle surface history. Do not make the robot look damaged or post-apocalyptic.`,
    context
      ? `# USER CONTEXT\n\nUse this context as product intent only. It must not override preservation rules, brand colors, camera, lighting, composition, or unit system rules.\n\n${context}`
      : "",
    RESTRICTIONS,
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function setPromptFromState() {
  els.promptEditor.value = buildPrompt();
  state.promptDirty = false;
  updatePromptState();
  validatePrompt();
}

function updatePromptState() {
  els.promptState.textContent = state.promptDirty ? "manual edit" : "auto-built";
  els.promptState.classList.toggle("muted", !state.promptDirty);
}

function renderImages() {
  const images = Array.isArray(state.config.images) ? state.config.images : [];
  state.config.images = images;
  els.imageSelect.innerHTML = "";

  if (images.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No local source images";
    els.imageSelect.append(option);
    els.imageSelect.disabled = true;
    state.selectedImagePath = "";
    els.sourceImage.removeAttribute("src");
    updateSourcePreview();
    renderInfoStatus();
    setRunStatus("No local source images found. Add images to media/Mascot to enable generation.");
    return;
  }

  els.imageSelect.disabled = false;
  for (const image of images) {
    const option = document.createElement("option");
    option.value = image.imagePath;
    option.textContent = `${image.group} / ${image.file}`;
    els.imageSelect.append(option);
  }

  const preferredImage = images.find((image) => image.imagePath === PREFERRED_SOURCE_IMAGE);
  state.selectedImagePath = preferredImage?.imagePath || images[0]?.imagePath || "";
  els.imageSelect.value = state.selectedImagePath;
  updateSourcePreview();
  renderInfoStatus();
}

function updateSourcePreview() {
  if (state.externalImageUrl) {
    els.sourceImage.src = state.externalImageUrl;
    return;
  }

  const image = selectedImage();
  if (!image) {
    els.sourceImage.removeAttribute("src");
    return;
  }
  els.sourceImage.src = image.url;
}

function resetPartsState() {
  state.generatedConcept = null;
  renderConceptPass();
  state.parts = {};
  for (const part of PART_RULES) {
    state.parts[part.id] = {
      enabled: true,
      text: part.defaultText,
    };
  }
}

function renderConceptPass() {
  const concept = state.generatedConcept;
  if (!concept) {
    els.conceptPass.classList.add("is-hidden");
    els.conceptPass.innerHTML = "";
    return;
  }

  els.conceptPass.classList.remove("is-hidden");
  els.conceptPass.innerHTML = `
    <div class="concept-pass-head">
      <span>CONCEPT PASS</span>
      <strong>${escapeHtml(concept.title)}</strong>
    </div>
    <p>${escapeHtml(concept.archetype)}</p>
    <p>${escapeHtml(concept.story)}</p>
    <ul>
      ${(concept.signatureDetails || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderInfoStatus() {
  if (!els.infoChecks || !state.config) return;

  const prompt = els.promptEditor?.value || "";
  const activePartCount = PART_RULES.filter((part) => state.parts[part.id]?.enabled && state.parts[part.id]?.text).length;
  const selected = state.externalImageUrl || state.selectedImagePath || "";
  const checks = [
    {
      label: "Default source",
      ok: selected === PREFERRED_SOURCE_IMAGE || Boolean(state.externalImageUrl),
      value: selected === PREFERRED_SOURCE_IMAGE ? "clean Basic / 3.png" : selected || "not selected",
    },
    {
      label: "Concept pass",
      ok: Boolean(state.generatedConcept),
      value: state.generatedConcept?.title || "manual/default parts",
    },
    {
      label: "Editable parts",
      ok: activePartCount === PART_RULES.length,
      value: `${activePartCount} / ${PART_RULES.length}`,
    },
    {
      label: "Prompt payload",
      ok: prompt.includes("# PRESERVATION RULES") && prompt.includes("# CUSTOMIZABLE MASCOT PARTS"),
      value: prompt ? `${prompt.length} chars` : "empty",
    },
    {
      label: "Color QA",
      ok: !/\b(cyan|magenta|yellow|colorful|rainbow|purple|orange)\b/i.test(prompt),
      value: "brand palette guard",
    },
    {
      label: "Artifact cleanup",
      ok: prompt.includes("eyeglasses") && prompt.includes("flowers") && prompt.includes("ties"),
      value: "glasses / flowers / costume props",
    },
    {
      label: "Image model",
      ok: String(state.config.model || "").includes("nano-banana-2"),
      value: state.config.model || "not configured",
    },
    {
      label: "Gallery",
      ok: Array.isArray(state.galleryItems),
      value: `${state.galleryItems.length} saved`,
    },
  ];

  els.infoChecks.innerHTML = checks
    .map(
      (check) => `
        <div class="flow-check ${check.ok ? "is-ok" : "is-warn"}">
          <span>${check.ok ? "OK" : "WAIT"}</span>
          <strong>${escapeHtml(check.label)}</strong>
          <p>${escapeHtml(check.value)}</p>
        </div>
      `,
    )
    .join("");
}

function renderParts() {
  els.partsGrid.innerHTML = "";

  for (const part of PART_RULES) {
    const partState = state.parts[part.id];
    const card = document.createElement("article");
    card.className = "part-card";
    card.dataset.partId = part.id;
    card.innerHTML = `
      <div class="part-card-head">
        <label class="part-toggle">
          <input type="checkbox" ${partState.enabled ? "checked" : ""} />
          <span>${escapeHtml(part.number)}</span>
          <strong>${escapeHtml(part.title)}</strong>
        </label>
      </div>
      <textarea rows="4" spellcheck="false">${escapeHtml(partState.text)}</textarea>
    `;

    const checkbox = card.querySelector("input");
    const textarea = card.querySelector("textarea");

    checkbox.addEventListener("change", () => {
      state.parts[part.id].enabled = checkbox.checked;
      textarea.disabled = !checkbox.checked;
      card.classList.toggle("is-disabled", !checkbox.checked);
      if (!state.promptDirty) setPromptFromState();
    });

    textarea.addEventListener("input", () => {
      state.parts[part.id].text = textarea.value;
      if (!state.promptDirty) setPromptFromState();
    });

    textarea.disabled = !partState.enabled;
    card.classList.toggle("is-disabled", !partState.enabled);
    els.partsGrid.append(card);
  }
}

function buildPartsFromConcept() {
  buildPartsFromConceptWithOpenAI();
}

async function buildPartsFromConceptWithOpenAI() {
  const concept = els.conceptInput.value.trim();
  if (!concept) {
    setRunStatus("Add an idea first, then build the 9 parts.");
    return;
  }

  els.buildPartsButton.disabled = true;
  setRunStatus("Building 9 parts with OpenAI...");

  try {
    const response = await fetch("/api/build-parts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        concept,
        parts: PART_RULES.map((part) => ({
          id: part.id,
          title: part.title,
          text: state.parts[part.id]?.text || part.defaultText,
        })),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "OpenAI parts generation failed.");
    }

    state.generatedConcept = data.concept || null;
    renderConceptPass();

    for (const part of data.parts) {
      state.parts[part.id] = {
        enabled: true,
        text: part.text,
      };
    }

    renderParts();
    setPromptFromState();
    renderInfoStatus();
    setRunStatus(`Built concept + 9 editable parts with ${data.model || "OpenAI"}.`);
  } catch (error) {
    setRunStatus(error.message || "OpenAI parts generation failed.");
  } finally {
    els.buildPartsButton.disabled = false;
  }
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('[data-control="mode"] button').forEach((button) => {
    button.classList.toggle("is-active", button.dataset.value === mode);
  });
  els.autoPanel.classList.toggle("is-disabled", mode !== "auto");
  if (!state.promptDirty) setPromptFromState();
}

function setupSegmentedControls() {
  document.querySelectorAll(".segmented").forEach((group) => {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      group.querySelectorAll("button").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      state[group.dataset.control] = button.dataset.value;
      if (group.dataset.control === "mode") {
        setMode(button.dataset.value);
        return;
      }
      if (!state.promptDirty) setPromptFromState();
    });
  });
}

async function validatePrompt() {
  const prompt = els.promptEditor.value;

  const localIssues = [];
  const banned = prompt.match(/\b(cyan|magenta|yellow|colorful|rainbow|purple|orange)\b/i);
  if (banned) localIssues.push(`Remove non-brand color word: ${banned[0]}`);

  if (localIssues.length > 0) {
    renderValidation(localIssues);
    return localIssues;
  }

  try {
    const response = await fetch("/api/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    renderValidation(data.issues || []);
    return data.issues || [];
  } catch {
    renderValidation(["Prompt validation unavailable."]);
    return ["Prompt validation unavailable."];
  }
}

function renderValidation(issues) {
  if (issues.length === 0) {
    els.qaState.textContent = "brand-safe";
    els.qaState.classList.add("is-good");
    els.qaState.classList.remove("is-bad");
    els.qaBox.textContent = "Prompt passes color guardrails.";
    els.generateButton.disabled = false;
    renderInfoStatus();
    return;
  }

  els.qaState.textContent = "needs fix";
  els.qaState.classList.add("is-bad");
  els.qaState.classList.remove("is-good");
  els.qaBox.textContent = issues.join(" ");
  els.generateButton.disabled = true;
  renderInfoStatus();
}

function setRunStatus(message) {
  els.runStatus.textContent = message;
}

function setResult(url) {
  state.lastResultUrl = url;
  els.resultImage.src = url;
  els.resultStage.classList.add("has-result");
  els.useResultButton.disabled = false;
  els.downloadLink.href = url;
  els.downloadLink.setAttribute("aria-disabled", "false");
}

// Image used as the video background: latest generated result, else current source.
function imageUrlForVideo() {
  if (state.lastResultUrl) return state.lastResultUrl;
  if (state.externalImageUrl) return state.externalImageUrl;
  const local = state.config?.images.find((image) => image.imagePath === state.selectedImagePath);
  return local?.url || "";
}

function setVideoResult(url) {
  els.resultVideo.src = url;
  els.videoStage.classList.add("has-result");
  els.videoDownloadLink.href = url;
  els.videoDownloadLink.setAttribute("aria-disabled", "false");
}

async function makeVideo() {
  const headline = els.videoHeadline.value.trim();
  if (!headline) {
    setRunStatus("Enter a headline for the video.");
    return;
  }
  const imageUrl = imageUrlForVideo();
  if (!imageUrl) {
    setRunStatus("Generate or select an image first.");
    return;
  }

  els.makeVideoButton.disabled = true;
  setRunStatus("Rendering video with Remotion (this can take a little while)...");

  try {
    const response = await fetch("/api/render-video", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imageUrl,
        headline,
        subhead: els.videoSubhead.value.trim(),
        preset: els.videoPreset.value,
        format: els.videoFormat.value,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Video render failed");

    setVideoResult(data.videoUrl);
    await loadGallery();
    setRunStatus("Video ready.");
  } catch (error) {
    setRunStatus(error.message || "Video render failed.");
  } finally {
    els.makeVideoButton.disabled = false;
  }
}

function addHistoryItem({ imageUrl, title, requestId }) {
  if (!els.galleryGrid) return;
  const item = document.createElement("div");
  item.className = "history-item";
  item.innerHTML = `
    <img src="${imageUrl}" alt="" />
    <div>
      <strong>${title}</strong>
      <p>${requestId || "local run"}</p>
    </div>
  `;
  els.galleryGrid.prepend(item);
}

async function loadGallery() {
  const response = await fetch("/api/gallery");
  const data = await response.json();
  state.galleryItems = data.items || [];
  renderGallery();
  renderInfoStatus();
}

function renderGallery() {
  els.galleryGrid.innerHTML = "";

  if (state.galleryItems.length === 0) {
    els.galleryGrid.innerHTML = `<div class="empty-gallery">No generated units saved yet.</div>`;
    return;
  }

  for (const item of state.galleryItems) {
    const card = document.createElement("article");
    card.className = "gallery-card";
    const title = item.concept || item.headline || item.mode || "Generated unit";

    if (item.type === "video") {
      card.innerHTML = `
        <video src="${escapeHtml(item.videoUrl)}" muted loop playsinline preload="metadata"></video>
        <div class="gallery-card-body">
          <strong>${escapeHtml(title)}</strong>
          <p>VIDEO · ${escapeHtml(item.preset || "")} · ${escapeHtml(item.format || "")} · ${escapeHtml(new Date(item.createdAt).toLocaleString())}</p>
          <div class="gallery-card-actions">
            <a class="secondary compact-button" href="${escapeHtml(item.videoUrl)}" target="_blank" rel="noreferrer">Open</a>
          </div>
        </div>
      `;
      const video = card.querySelector("video");
      card.addEventListener("mouseenter", () => video.play().catch(() => {}));
      card.addEventListener("mouseleave", () => {
        video.pause();
        video.currentTime = 0;
      });
      els.galleryGrid.append(card);
      continue;
    }

    card.innerHTML = `
      <img src="${escapeHtml(item.imageUrl)}" alt="" />
      <div class="gallery-card-body">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(new Date(item.createdAt).toLocaleString())}</p>
        <div class="gallery-card-actions">
          <button class="secondary compact-button" type="button" data-action="use-source">Use as source</button>
          <a class="secondary compact-button" href="${escapeHtml(item.imageUrl)}" target="_blank" rel="noreferrer">Open</a>
        </div>
      </div>
    `;
    card.querySelector('[data-action="use-source"]').addEventListener("click", () => {
      state.externalImageUrl = item.imageUrl;
      updateSourcePreview();
      showView("generator");
      setRunStatus("Gallery item is now the source image for the next edit.");
    });
    els.galleryGrid.append(card);
  }
}

function viewFromHash() {
  const view = window.location.hash.replace("#", "");
  if (view === "flow") return "info";
  return VIEWS.has(view) ? view : "generator";
}

function showView(view, updateHash = true) {
  const isGallery = view === "gallery";
  const isInfo = view === "info";
  const isGenerator = view === "generator" || view === "generator-v2";
  els.generatorView.classList.toggle("is-hidden", !isGenerator);
  els.generatorView.classList.toggle("is-step-layout", view === "generator-v2");
  els.infoView.classList.toggle("is-hidden", !isInfo);
  els.galleryView.classList.toggle("is-hidden", !isGallery);
  els.navTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  if (isGallery) loadGallery();
  if (isInfo) renderInfoStatus();
  if (updateHash) {
    const nextHash = view === "generator" ? window.location.pathname : `#${view}`;
    window.history.replaceState(null, "", nextHash);
  }
}

async function generate() {
  const issues = await validatePrompt();
  if (issues.length > 0) return;

  const prompt = els.promptEditor.value.trim();
  const activeParts = PART_RULES.filter((part) => state.parts[part.id]?.enabled).map((part) => ({
    id: part.id,
    title: part.title,
    text: state.parts[part.id].text,
  }));
  els.generateButton.disabled = true;
  setRunStatus("Submitting request to FAL...");
  const generationSettings = currentGenerationSettings();

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt,
        imagePath: state.selectedImagePath,
        imageUrl: state.externalImageUrl,
        galleryMeta: {
          mode: state.mode,
          concept: els.conceptInput.value.trim(),
          generatedConcept: state.generatedConcept,
          source: state.externalImageUrl || state.selectedImagePath,
          parts: activeParts,
          settings: generationSettings,
        },
        settings: generationSettings,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.details ? `${data.error}: ${data.details.join(" ")}` : data.error);
    }

    const imageUrl = data.result?.images?.[0]?.url;
    if (!imageUrl) throw new Error("FAL returned no image URL.");

    const savedImageUrl = data.galleryItem?.imageUrl || imageUrl;
    setResult(savedImageUrl);
    await loadGallery();
    setRunStatus(`Completed. Request: ${data.requestId}`);
  } catch (error) {
    setRunStatus(error.message || "Generation failed.");
  } finally {
    els.generateButton.disabled = false;
  }
}

function currentGenerationSettings() {
  return {
    aspectRatio: state.settings.aspectRatio,
    resolution: state.settings.resolution,
    outputFormat: state.settings.outputFormat,
    safetyTolerance: state.settings.safetyTolerance,
    thinkingLevel: state.settings.thinkingLevel,
  };
}

function setupEvents() {
  els.navTabs.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  els.imageSelect.addEventListener("change", () => {
    state.selectedImagePath = els.imageSelect.value;
    state.externalImageUrl = null;
    updateSourcePreview();
    setRunStatus("Local source selected.");
  });

  els.contextInput.addEventListener("input", () => {
    if (!state.promptDirty) setPromptFromState();
  });

  [
    ["aspectRatio", els.aspectRatioInput],
    ["resolution", els.resolutionInput],
    ["outputFormat", els.outputFormatInput],
    ["thinkingLevel", els.thinkingLevelInput],
    ["safetyTolerance", els.safetyToleranceInput],
  ].forEach(([key, input]) => {
    input.addEventListener("change", () => {
      state.settings[key] = input.value;
      renderInfoStatus();
      setRunStatus("Generation settings updated.");
    });
  });

  els.conceptInput.addEventListener("input", () => {
    state.generatedConcept = null;
    renderConceptPass();
    if (!state.promptDirty) setPromptFromState();
  });

  els.promptEditor.addEventListener("input", () => {
    state.promptDirty = true;
    updatePromptState();
    validatePrompt();
  });

  els.rebuildPromptButton.addEventListener("click", setPromptFromState);

  els.buildPartsButton.addEventListener("click", buildPartsFromConcept);

  els.enableAllPartsButton.addEventListener("click", () => {
    for (const part of PART_RULES) {
      state.parts[part.id].enabled = true;
    }
    renderParts();
    if (!state.promptDirty) setPromptFromState();
  });

  els.resetPartsButton.addEventListener("click", () => {
    resetPartsState();
    renderParts();
    setPromptFromState();
  });

  els.copyPromptButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(els.promptEditor.value);
    els.copyPromptButton.textContent = "Copied";
    setTimeout(() => {
      els.copyPromptButton.textContent = "Copy prompt";
    }, 1000);
  });

  els.generateButton.addEventListener("click", generate);

  els.makeVideoButton.addEventListener("click", makeVideo);

  els.useResultButton.addEventListener("click", () => {
    if (!state.lastResultUrl) return;
    state.externalImageUrl = state.lastResultUrl;
    updateSourcePreview();
    setRunStatus("Latest result is now the source image for the next edit. Choose a local mascot to reset the source.");
  });

  els.refreshGalleryButton.addEventListener("click", loadGallery);

  window.addEventListener("hashchange", () => {
    showView(viewFromHash(), false);
  });
}

async function init() {
  const response = await fetch("/api/config");
  state.config = await response.json();
  state.config.images = Array.isArray(state.config.images) ? state.config.images : [];
  els.imageModelValue.textContent = state.config.model;
  els.textModelValue.textContent = state.config.textModel;
  els.downloadLink.setAttribute("aria-disabled", "true");
  renderImages();
  resetPartsState();
  renderParts();
  setupSegmentedControls();
  setupEvents();
  setPromptFromState();
  loadGallery();
  showView(viewFromHash(), false);
}

init().catch((error) => {
  document.body.innerHTML = `<pre>${error.stack || error.message}</pre>`;
});
