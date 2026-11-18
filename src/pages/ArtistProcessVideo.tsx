import { useEffect, useRef, useState } from 'react';

const motionQuery = '(prefers-reduced-motion: reduce)';
const description = 'Vudi shaping flowing sculptural ridges across a mixed-media painting in the studio';

/** Poster first: no video source is mounted for reduced motion or without JS. */
export function ArtistProcessVideo() {
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const query = window.matchMedia?.(motionQuery);
    if (!query) return;
    const update = () => {
      if (query.matches) video.current?.pause();
      setMotionAllowed(!query.matches);
    };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const poster = '/artist/artist-process-poster.webp';
  const toggle = () => {
    const player = video.current;
    if (!player) return;
    if (player.paused) void player.play().catch(() => setPaused(true));
    else player.pause();
  };
  return <div className="artist-process-media">
    {motionAllowed && !failed ? <video ref={video} width="718" height="1198" poster={poster}
      autoPlay muted loop playsInline controls={false} preload="metadata"
      role="button" tabIndex={0} aria-label={`${paused ? 'Play' : 'Pause'} process video: ${description}. Activate with Enter or Space.`}
      onClick={toggle} onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); toggle(); } }}
      onPlay={() => setPaused(false)} onPause={() => setPaused(true)} onError={() => setFailed(true)}>
      <source src="/artist/artist-process.mp4" type="video/mp4"/>
    </video> : <img src={poster} width="718" height="1198" alt={description} loading="lazy" decoding="async"/>}
  </div>;
}
