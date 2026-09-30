import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

let apiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return apiPromise;
}

/** YouTube IFrame API wrapper. ref exposes seekTo(seconds) and getCurrentTime(). */
const YouTubePlayer = forwardRef(function YouTubePlayer({ videoId, onTime }, ref) {
  const host = useRef(null);
  const player = useRef(null);

  useImperativeHandle(ref, () => ({
    seekTo: (s) => { player.current?.seekTo?.(s, true); player.current?.playVideo?.(); },
    getCurrentTime: () => player.current?.getCurrentTime?.() || 0,
  }));

  useEffect(() => {
    let cancelled = false;
    let timer;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !host.current) return;
      player.current = new YT.Player(host.current, { videoId, width: "100%", height: "100%", playerVars: { rel: 0 } });
      timer = setInterval(() => onTime?.(player.current?.getCurrentTime?.() || 0), 500);
    });
    return () => { cancelled = true; clearInterval(timer); player.current?.destroy?.(); };
  }, [videoId, onTime]);

  return <div className="aspect-video w-full overflow-hidden rounded-xl bg-black"><div ref={host} className="h-full w-full" /></div>;
});

export default YouTubePlayer;
