import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont as loadDisplayFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBodyFont } from "@remotion/google-fonts/Inter";

// Limit weights/subsets so the headless render only fetches what we use.
const { fontFamily: displayFont } = loadDisplayFont("normal", {
  weights: ["500", "600"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});
const { fontFamily: bodyFont } = loadBodyFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
});

// Brand palette (subset from DESIGN.md).
const COLORS = {
  canvas: "#f4f2ec",
  ink: "#111111",
  accent: "#ff3b30",
};

export const FPS = 30;
export const DEFAULT_DURATION_IN_FRAMES = 150; // 5s @ 30fps

// format -> [width, height]
export const VIDEO_FORMATS = {
  "4:5": [1080, 1350],
  "1:1": [1080, 1080],
  "9:16": [1080, 1920],
  "16:9": [1920, 1080],
};

// Returns the animated style for the headline given the current frame.
function headlineAnimation({ preset, frame, fps, headline }) {
  const entry = spring({ frame: frame - 8, fps, config: { damping: 200 } });

  if (preset === "fade") {
    return { style: { opacity: entry }, text: headline };
  }

  if (preset === "typewriter") {
    const total = Math.max(headline.length, 1);
    const chars = Math.floor(
      interpolate(frame, [8, 8 + total * 1.8], [0, total], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );
    return { style: { opacity: 1 }, text: headline.slice(0, chars) };
  }

  if (preset === "mask-reveal") {
    const hidden = interpolate(entry, [0, 1], [100, 0]);
    return { style: { opacity: 1, clipPath: `inset(0 ${hidden}% 0 0)` }, text: headline };
  }

  // default: slide-up
  const y = interpolate(entry, [0, 1], [60, 0]);
  return { style: { opacity: entry, transform: `translateY(${y}px)` }, text: headline };
}

export const MascotCard = ({ imageUrl, headline, subhead, preset }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  const { style, text } = headlineAnimation({ preset, frame, fps, headline: headline || "" });
  const subOpacity = interpolate(frame, [20, 40], [0, 0.72], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pad = Math.round(height * 0.07);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.canvas }}>
      {imageUrl ? (
        <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}

      {/* light scrim so dark brand text stays readable over any image */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${COLORS.canvas} 0%, ${COLORS.canvas}cc 16%, transparent 42%)`,
        }}
      />

      <AbsoluteFill style={{ justifyContent: "flex-end", padding: pad }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: displayFont,
              fontWeight: 600,
              fontSize: Math.round(height * 0.078),
              lineHeight: 0.9,
              letterSpacing: "-0.03em",
              color: COLORS.ink,
              ...style,
            }}
          >
            {text}
          </h1>
          {subhead ? (
            <p
              style={{
                margin: `${Math.round(height * 0.018)}px 0 0`,
                fontFamily: bodyFont,
                fontSize: Math.round(height * 0.026),
                lineHeight: 1.3,
                letterSpacing: "-0.01em",
                color: COLORS.ink,
                opacity: subOpacity,
              }}
            >
              {subhead}
            </p>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
