import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "parksthlm-intro-seen-v1";

// Visas första gången appen öppnas (eller med ?intro i adressen för att se den igen).
function shouldShowIntro() {
  try {
    if (new URLSearchParams(window.location.search).has("intro")) return true;
    return localStorage.getItem(SEEN_KEY) !== "true";
  } catch {
    return false;
  }
}

export function IntroVideo() {
  const [visible, setVisible] = useState(shouldShowIntro);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const finish = () => {
    try {
      localStorage.setItem(SEEN_KEY, "true");
    } catch {
      // Utan lagring visas videon igen nästa gång – det är ofarligt.
    }
    setVisible(false);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!visible || !video) return;
    // Webbläsare tillåter bara autoplay med ljud efter ett tryck; annars startar vi utan ljud.
    video.play().catch(() => {
      video.muted = true;
      setMuted(true);
      video.play().catch(finish);
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="intro-video" role="dialog" aria-label="Introduktion">
      <video
        ref={videoRef}
        className="intro-video-player"
        src={`${import.meta.env.BASE_URL}intro.mp4`}
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
      />
      <div className="intro-video-actions">
        {muted ? (
          <button
            type="button"
            className="intro-video-sound"
            onClick={() => {
              if (videoRef.current) videoRef.current.muted = false;
              setMuted(false);
            }}
          >
            Slå på ljud
          </button>
        ) : null}
        <button type="button" className="intro-video-skip" onClick={finish}>
          Hoppa över
        </button>
      </div>
    </div>
  );
}
