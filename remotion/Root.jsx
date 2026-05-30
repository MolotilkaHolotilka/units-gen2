import { Composition } from "remotion";
import { MascotCard, VIDEO_FORMATS, DEFAULT_DURATION_IN_FRAMES, FPS } from "./MascotCard.jsx";

// Computes width/height/duration from the `format` input prop so the same
// composition renders square / portrait / vertical / wide without separate ids.
function metadataForFormat({ props }) {
  const [width, height] = VIDEO_FORMATS[props.format] || VIDEO_FORMATS["4:5"];
  return {
    width,
    height,
    durationInFrames: props.durationInFrames || DEFAULT_DURATION_IN_FRAMES,
    fps: FPS,
  };
}

export const RemotionRoot = () => {
  return (
    <Composition
      id="mascot-card"
      component={MascotCard}
      durationInFrames={DEFAULT_DURATION_IN_FRAMES}
      fps={FPS}
      width={1080}
      height={1350}
      defaultProps={{
        imageUrl: "",
        headline: "MASCOT",
        subhead: "",
        preset: "slide-up",
        format: "4:5",
      }}
      calculateMetadata={metadataForFormat}
    />
  );
};
