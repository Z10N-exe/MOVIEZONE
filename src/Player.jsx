import { useRef, useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, Pause, Maximize, Minimize, RotateCcw, RotateCw, Volume2, VolumeX, Download } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { fetchSources, fetchAds, fetchInfo } from './api';
import { useAppContext } from './AppContext';

const loadHls = () => new Promise((resolve) => {
  if (window.Hls) return resolve();
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js';
  s.onload = resolve;
  document.head.appendChild(s);
});

const fmt = (t) => {
  if (!t || isNaN(t)) return '0:00';
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
};

export default function Player() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isPremium, addDownload } = useAppContext();
  const location = useLocation();

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const seekDragRef = useRef(false);
  const seekBarRef = useRef(null);
  const doubleTapRef = useRef({ left: 0, right: 0 });
  const longPressRef = useRef(null);
  const swipeStartRef = useRef(null);

  const [videoReady, setVideoReady] = useState(false);
  const videoCallbackRef = useCallback((node) => {
    videoRef.current = node;
    if (node) {
      // Prevent iOS from hijacking into native fullscreen player
      node.setAttribute('playsinline', '');
      node.setAttribute('webkit-playsinline', '');
      node.setAttribute('x-webkit-airplay', 'deny');
    }
    setVideoReady(!!node);
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [sourceUrl, setSourceUrl] = useState(null);
  const [sources, setSources] = useState([]);
  const [quality, setQuality] = useState(480);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isForcedLandscape, setIsForcedLandscape] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeAd, setActiveAd] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const [fakeFull, setFakeFull] = useState(false); // CSS-based fullscreen for iOS
  const [skipFlash, setSkipFlash] = useState(null);
  const [title, setTitle] = useState('');
  const [swipeHint, setSwipeHint] = useState(null); // { type: 'volume'|'brightness', value }
  const [brightness, setBrightness] = useState(1);
  const [isSpeed2x, setIsSpeed2x] = useState(false);
  const [speedFlash, setSpeedFlash] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const effectiveSeason = parseInt(searchParams.get('season')) || 0;
  const effectiveEpisode = parseInt(searchParams.get('episode')) || 0;
  const titleHint = searchParams.get('t') || '';
  const yearHint = searchParams.get('y') || '';

  // Orientation tracking
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fullscreen → lock landscape on mobile
  useEffect(() => {
    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (fs) {
        screen.orientation?.lock?.('landscape').catch(() => {});
        setIsForcedLandscape(true);
      } else {
        screen.orientation?.unlock?.();
        setIsForcedLandscape(false);
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Load sources
  useEffect(() => {
    if (!id || id === 'fallback') return;
    setLoading(true); setError(null);
    const load = async () => {
      try {
        const sourcesRes = await fetchSources(id, effectiveSeason, effectiveEpisode, titleHint, yearHint);
        if (!sourcesRes?.length) {
          const info = await fetchInfo(id, titleHint, yearHint);
          const isSeries = info?.subject?.subjectType === 2 || info?.resource?.seasons?.length > 0;
          if (isSeries && effectiveSeason === 0) {
            const mbId = info?.subject?.movieboxId || id;
            navigate(`/movie/${mbId}?t=${encodeURIComponent(titleHint)}`, { replace: true }); return;
          }
          setError('No stream sources available for this title.');
          setLoading(false); return;
        }
        const info = await fetchInfo(id, titleHint, yearHint);
        // Use titleHint first (most reliable), then fall back to API response
        setTitle(titleHint || info?.subject?.title || info?.subject?.name || '');
        const built = sourcesRes.map(s => ({
          quality: Number(s.quality) || s.quality,
          streamUrl: s.streamUrl,
          directUrl: s.directUrl,
          downloadUrl: s.downloadUrl || s.streamUrl,
          size: s.size || '',
        }));
        setSources(built);
        const preferred = built.find(s => s.quality === 480) || built.find(s => s.quality === 720) || built[0];
        setQuality(preferred.quality);
        setSourceUrl(preferred.streamUrl);
        if (!isPremium) {
          const adsRes = await fetchAds();
          if (adsRes?.status === 'success') {
            const preRoll = adsRes.data?.find(a => a.placement === 'pre-roll');
            if (preRoll) setActiveAd(preRoll);
          }
        }
      } catch { setError('Failed to load stream. Please try again.'); }
      finally { setLoading(false); }
    };
    load();
  }, [id, effectiveSeason, effectiveEpisode, isPremium, retryCount]);

  // Setup HLS / direct video
  useEffect(() => {
    if (!sourceUrl || !videoReady || !videoRef.current) return;
    const video = videoRef.current;
    const cleanup = () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
    cleanup();
    const setup = async () => {
      if (sourceUrl.includes('.m3u8')) {
        await loadHls();
        if (window.Hls?.isSupported()) {
          const hls = new window.Hls({ maxBufferLength: 30, enableWorker: true, startLevel: -1 });
          hlsRef.current = hls;
          hls.loadSource(sourceUrl); hls.attachMedia(video);
          hls.on(window.Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
          hls.on(window.Hls.Events.ERROR, (_, d) => { if (d.fatal) setError('Stream error. Try a different quality.'); });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = sourceUrl; video.play().catch(() => {});
        }
      } else {
        video.src = sourceUrl; video.load();
        video.addEventListener('canplay', () => video.play().catch(() => {}), { once: true });
        video.addEventListener('error', () => setError('Stream failed. Try a different quality.'), { once: true });
      }
    };
    setup();
    return cleanup;
  }, [sourceUrl, videoReady]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 3500);
  }, []);

  const togglePlay = useCallback((e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) videoRef.current.play(); else videoRef.current.pause();
    resetControlsTimer();
  }, [resetControlsTimer]);

  const skip = useCallback((secs, side) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + secs));
    setSkipFlash(side);
    setTimeout(() => setSkipFlash(null), 700);
    resetControlsTimer();
  }, [duration, resetControlsTimer]);

  // Touch gesture handlers: double-tap skip, swipe for volume/brightness, long-press for 2x speed
  const onTouchStart = useCallback((e) => {
    if (seekDragRef.current) return;
    const touch = e.touches[0];
    let clientX = touch.clientX;
    let clientY = touch.clientY;

    if (isForcedLandscape && !isLandscape) {
      clientX = touch.clientY;
      clientY = window.innerWidth - touch.clientX;
    }

    swipeStartRef.current = { x: clientX, y: clientY, time: Date.now(), side: clientX < (isForcedLandscape && !isLandscape ? window.innerHeight : window.innerWidth) / 2 ? 'left' : 'right' };

    // Long press → 2x speed
    longPressRef.current = setTimeout(() => {
      if (videoRef.current) { videoRef.current.playbackRate = 2; setIsSpeed2x(true); setSpeedFlash(true); setTimeout(() => setSpeedFlash(false), 800); }
      longPressRef.current = null;
    }, 600);
  }, [isForcedLandscape, isLandscape]);

  const onTouchMove = useCallback((e) => {
    if (!swipeStartRef.current || seekDragRef.current) return;
    clearTimeout(longPressRef.current); longPressRef.current = null;
    const touch = e.touches[0];
    let clientX = touch.clientX;
    let clientY = touch.clientY;

    if (isForcedLandscape && !isLandscape) {
      clientX = touch.clientY;
      clientY = window.innerWidth - touch.clientX;
    }

    const dx = clientX - swipeStartRef.current.x;
    const dy = clientY - swipeStartRef.current.y;
    if (Math.abs(dy) < Math.abs(dx) + 10) return; // horizontal swipe — ignore (seek bar handles it)
    if (Math.abs(dy) < 15) return;

    const contentHeight = isForcedLandscape && !isLandscape ? window.innerWidth : window.innerHeight;
    const delta = -(dy / contentHeight) * 1.5;
    if (swipeStartRef.current.side === 'right') {
      // Right side → volume
      const newVol = Math.max(0, Math.min(1, (videoRef.current?.volume || volume) + delta));
      setVolume(newVol); setIsMuted(newVol === 0);
      if (videoRef.current) { videoRef.current.volume = newVol; videoRef.current.muted = newVol === 0; }
      setSwipeHint({ type: 'volume', value: Math.round(newVol * 100) });
      swipeStartRef.current = { ...swipeStartRef.current, y: clientY };
    } else {
      // Left side → brightness
      const newBright = Math.max(0.1, Math.min(1, brightness + delta));
      setBrightness(newBright);
      setSwipeHint({ type: 'brightness', value: Math.round(newBright * 100) });
      swipeStartRef.current = { ...swipeStartRef.current, y: clientY };
    }
  }, [volume, brightness, isForcedLandscape, isLandscape]);

  const onTouchEnd = useCallback((e) => {
    clearTimeout(longPressRef.current); longPressRef.current = null;
    // Restore speed
    if (isSpeed2x && videoRef.current) { videoRef.current.playbackRate = 1; setIsSpeed2x(false); }
    setSwipeHint(null);

    if (!swipeStartRef.current || seekDragRef.current) { swipeStartRef.current = null; return; }
    const touch = e.changedTouches[0];
    let clientX = touch.clientX;
    let clientY = touch.clientY;

    if (isForcedLandscape && !isLandscape) {
      clientX = touch.clientY;
      clientY = window.innerWidth - touch.clientX;
    }

    const dx = Math.abs(clientX - swipeStartRef.current.x);
    const dy = Math.abs(clientY - swipeStartRef.current.y);
    const elapsed = Date.now() - swipeStartRef.current.time;

    // Only fire tap if it was a short, small movement
    if (dx < 20 && dy < 20 && elapsed < 400) {
      const contentWidth = isForcedLandscape && !isLandscape ? window.innerHeight : window.innerWidth;
      const isLeft = clientX < contentWidth / 2;
      const side = isLeft ? 'left' : 'right';
      const now = Date.now();
      if (now - doubleTapRef.current[side] < 300) {
        skip(isLeft ? -10 : 10, side);
        doubleTapRef.current[side] = 0;
      } else {
        doubleTapRef.current[side] = now;
        resetControlsTimer();
      }
    }
    swipeStartRef.current = null;
  }, [isSpeed2x, skip, resetControlsTimer, isForcedLandscape, isLandscape]);

  const toggleFullscreen = useCallback(() => {
    if (isIOS) {
      // iOS doesn't support requestFullscreen — use CSS fake fullscreen instead
      const newFake = !fakeFull;
      setFakeFull(newFake);
      if (newFake) {
        setIsForcedLandscape(true);
        screen.orientation?.lock?.('landscape').catch(() => {});
      } else {
        setIsForcedLandscape(false);
        screen.orientation?.unlock?.();
      }
      return;
    }
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }, [isIOS, fakeFull]);

  // Rotate to landscape (non-fullscreen, mobile)
  const toggleLandscape = useCallback(() => {
    const next = !isForcedLandscape;
    setIsForcedLandscape(next);
    if (next) {
      screen.orientation?.lock?.('landscape').catch(() => {});
    } else {
      screen.orientation?.unlock?.();
    }
  }, [isForcedLandscape]);

  const changeQuality = (src) => {
    const time = videoRef.current?.currentTime || 0;
    setQuality(src.quality); setSourceUrl(src.streamUrl); setShowQualityMenu(false);
    setTimeout(() => { if (videoRef.current) videoRef.current.currentTime = time; }, 800);
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v); setIsMuted(v === 0);
    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; }
  };

  const toggleMute = () => {
    const m = !isMuted; setIsMuted(m);
    if (videoRef.current) { videoRef.current.muted = m; if (!m && volume === 0) { setVolume(0.5); videoRef.current.volume = 0.5; } }
  };

  const doSeek = useCallback((clientX, clientY) => {
    if (!seekBarRef.current || !duration) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    
    let x = clientX;
    if (isForcedLandscape && !isLandscape) {
      // In forced landscape, the seek bar is rotated.
      // The progress goes from top to bottom of the screen (which is left to right in rotated space)
      x = clientY;
    }

    const pct = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    if (videoRef.current) videoRef.current.currentTime = pct * duration;
  }, [duration, isForcedLandscape, isLandscape]);

  const onSeekMouseDown = (e) => {
    seekDragRef.current = true; doSeek(e.clientX, e.clientY);
    const onMove = (ev) => doSeek(ev.clientX, ev.clientY);
    const onUp = () => { seekDragRef.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); resetControlsTimer(); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };

  const onSeekTouchStart = (e) => {
    e.stopPropagation();
    seekDragRef.current = true; 
    const touch = e.touches[0];
    doSeek(touch.clientX, touch.clientY);
    const onMove = (ev) => {
      const t = ev.touches[0];
      doSeek(t.clientX, t.clientY);
    };
    const onEnd = () => { seekDragRef.current = false; window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); resetControlsTimer(); };
    window.addEventListener('touchmove', onMove, { passive: true }); window.addEventListener('touchend', onEnd);
  };

  const handleDownload = (src) => {
    addDownload({ id, title, imgUrl: '', quality: src.quality, size: src.size || '' });
    const a = document.createElement('a');
    a.href = src.downloadUrl || src.streamUrl; a.download = '';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setShowDownloadMenu(false);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div ref={containerRef}
      onMouseMove={resetControlsTimer}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        width: isForcedLandscape && !isLandscape ? '100dvh' : '100%',
        height: isForcedLandscape && !isLandscape ? '100dvw' : '100dvh',
        backgroundColor: '#000',
        position: (fakeFull || isForcedLandscape) ? 'fixed' : 'relative',
        inset: (fakeFull || isForcedLandscape) ? 0 : undefined,
        zIndex: (fakeFull || isForcedLandscape) ? 9999 : undefined,
        overflow: 'hidden', color: '#fff', userSelect: 'none', touchAction: 'none',
        transform: isForcedLandscape && !isLandscape ? 'rotate(90deg) translateY(-100%)' : 'none',
        transformOrigin: 'top left'
      }}>

      {/* Brightness overlay */}
      {brightness < 1 && (
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${1 - brightness})`, pointerEvents: 'none', zIndex: 5 }} />
      )}

      {/* Loading */}
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 50 }}>
          <div className="spinner" />
          <p style={{ color: '#aaa', fontSize: 14 }}>Loading stream...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20, textAlign: 'center', zIndex: 50 }}>
          <p style={{ color: '#ff4444', fontSize: 18 }}>{error}</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setRetryCount(c => c + 1)} style={{ padding: '10px 24px', borderRadius: 8, background: '#333', border: 'none', color: '#fff', cursor: 'pointer' }}>Retry</button>
            <button onClick={() => navigate(-1)} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--primary-red)', border: 'none', color: '#fff', cursor: 'pointer' }}>Go Back</button>
          </div>
        </div>
      )}

      {/* Video */}
      {!loading && !error && (
        <>
          <video ref={videoCallbackRef}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onTimeUpdate={() => {
              if (!videoRef.current) return;
              setCurrentTime(videoRef.current.currentTime);
              const buf = videoRef.current.buffered;
              if (buf.length) setBuffered(buf.end(buf.length - 1));
            }}
            onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
            onPlay={() => { setIsPlaying(true); resetControlsTimer(); }}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setBuffering(true)}
            onPlaying={() => setBuffering(false)}
            onClick={togglePlay}
            playsInline
            webkit-playsinline="true"
            x-webkit-airplay="deny"
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
          />

          {buffering && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 20 }}>
              <div className="spinner" />
            </div>
          )}

          {/* Speed flash */}
          {speedFlash && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: '10px 20px', zIndex: 30, pointerEvents: 'none', fontSize: 16, fontWeight: 700 }}>
              2× Speed
            </div>
          )}

          {/* Swipe hint overlay */}
          {swipeHint && (
            <div style={{ position: 'absolute', top: '50%', left: swipeHint.type === 'brightness' ? '15%' : '75%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: '10px 16px', zIndex: 30, pointerEvents: 'none', textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>{swipeHint.type === 'volume' ? '🔊 Volume' : '☀️ Brightness'}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{swipeHint.value}%</div>
              <div style={{ marginTop: 6, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${swipeHint.value}%`, background: swipeHint.type === 'volume' ? 'var(--primary-red)' : '#ffb400', borderRadius: 4 }} />
              </div>
            </div>
          )}

          {skipFlash === 'left' && (
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: '0 50% 50% 0', pointerEvents: 'none', zIndex: 25, animation: 'fadeOut 0.7s forwards' }}>
              <div style={{ textAlign: 'center' }}><RotateCcw size={36} color="#fff" /><p style={{ fontSize: 13, marginTop: 4, fontWeight: 700 }}>-10s</p></div>
            </div>
          )}
          {skipFlash === 'right' && (
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: '50% 0 0 50%', pointerEvents: 'none', zIndex: 25, animation: 'fadeOut 0.7s forwards' }}>
              <div style={{ textAlign: 'center' }}><RotateCw size={36} color="#fff" /><p style={{ fontSize: 13, marginTop: 4, fontWeight: 700 }}>+10s</p></div>
            </div>
          )}

          {showControls && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 30 }}>
              {/* Top bar */}
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}>
                  <ArrowLeft size={24} />
                </button>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || 'Now Playing'}</p>
                  {effectiveSeason > 0 && <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>S{effectiveSeason} · E{effectiveEpisode}</p>}
                </div>

                {/* Download button */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => { setShowDownloadMenu(v => !v); setShowQualityMenu(false); }}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', padding: '5px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
                    <Download size={16} />
                  </button>
                  {showDownloadMenu && sources.length > 0 && (
                    <div style={{ position: 'absolute', top: 38, right: 0, background: '#1a1a1a', borderRadius: 10, padding: '8px 0', minWidth: 150, boxShadow: '0 8px 32px rgba(0,0,0,0.7)', border: '1px solid #333', zIndex: 60 }}>
                      <p style={{ padding: '4px 16px', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Download</p>
                      {[...sources].sort((a, b) => Number(b.quality) - Number(a.quality)).map(s => (
                        <div key={s.quality} onClick={() => handleDownload(s)}
                          style={{ padding: '11px 16px', cursor: 'pointer', fontSize: 14, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                          <span>{s.quality}p</span>
                          {s.size && <span style={{ fontSize: 11, color: '#888' }}>{s.size}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quality button */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => { setShowQualityMenu(v => !v); setShowDownloadMenu(false); }}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, backdropFilter: 'blur(4px)', whiteSpace: 'nowrap' }}>
                    {quality}p
                  </button>
                  {showQualityMenu && (
                    <div style={{ position: 'absolute', top: 38, right: 0, background: '#1a1a1a', borderRadius: 10, padding: '8px 0', minWidth: 130, boxShadow: '0 8px 32px rgba(0,0,0,0.7)', border: '1px solid #333', zIndex: 60 }}>
                      <p style={{ padding: '4px 16px', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Quality</p>
                      {sources.map(s => (
                        <div key={s.quality} onClick={() => changeQuality(s)}
                          style={{ padding: '11px 16px', cursor: 'pointer', fontSize: 14, color: quality === s.quality ? 'var(--primary-red)' : '#fff', fontWeight: quality === s.quality ? 700 : 400, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {s.quality}p {quality === s.quality && <span style={{ fontSize: 10 }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Center controls */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, pointerEvents: 'none' }}>
                <button onClick={(e) => { e.stopPropagation(); skip(-10, 'left'); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', pointerEvents: 'auto', opacity: 0.9, padding: 8 }}>
                  <RotateCcw size={36} />
                </button>
                <button onClick={togglePlay} style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(229,9,20,0.92)', border: 'none', color: '#fff', cursor: 'pointer', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 28px rgba(229,9,20,0.5)', flexShrink: 0 }}>
                  {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" style={{ marginLeft: 3 }} />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); skip(10, 'right'); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', pointerEvents: 'auto', opacity: 0.9, padding: 8 }}>
                  <RotateCw size={36} />
                </button>
              </div>

              {/* Bottom bar */}
              <div style={{ padding: '0 14px 16px', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
                <div ref={seekBarRef} onMouseDown={onSeekMouseDown} onTouchStart={onSeekTouchStart}
                  style={{ height: 24, width: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 6, touchAction: 'none' }}>
                  <div style={{ position: 'relative', width: '100%', height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${bufferedPct}%`, background: 'rgba(255,255,255,0.3)', borderRadius: 4 }} />
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, background: 'var(--primary-red)', borderRadius: 4 }} />
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', left: `${progress}%`, top: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 0 6px rgba(0,0,0,0.6)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, minWidth: 36, color: '#ddd', fontVariantNumeric: 'tabular-nums' }}>{fmt(currentTime)}</span>
                  <span style={{ fontSize: 11, color: '#555' }}>/</span>
                  <span style={{ fontSize: 11, color: '#888', fontVariantNumeric: 'tabular-nums' }}>{fmt(duration)}</span>
                  <div style={{ flex: 1 }} />
                  <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: 4 }}>
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange} className="volume-slider"
                    style={{ width: 70, accentColor: 'var(--primary-red)', cursor: 'pointer' }} />
                  {/* Landscape toggle (mobile only) */}
                  <button onClick={toggleLandscape} className="landscape-btn"
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: 4, transform: isForcedLandscape ? 'rotate(-90deg)' : 'none', transition: 'transform 0.3s' }}>
                    <RotateCw size={20} />
                  </button>
                  <button onClick={toggleFullscreen} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: 4 }}>
                    {(isFullscreen || fakeFull) ? <Minimize size={20} /> : <Maximize size={20} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showControls && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} onClick={resetControlsTimer} />
          )}
        </>
      )}

      {/* Pre-roll ad */}
      {activeAd && (
        <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '90%', maxWidth: 600, position: 'relative' }}>
            {activeAd.imageUrl?.includes('.mp4')
              ? <video src={activeAd.imageUrl} autoPlay onEnded={() => setActiveAd(null)} style={{ width: '100%', borderRadius: 10 }} />
              : <img src={activeAd.imageUrl} style={{ width: '100%', borderRadius: 10 }} alt="ad" />}
            <button onClick={() => setActiveAd(null)}
              style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.75)', border: 'none', color: '#fff', padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12 }}>
              Skip ✕
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }
        .spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.15); border-top-color: var(--primary-red, #e50914); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 480px) { .volume-slider { display: none; } }
        @media (min-width: 481px) { .landscape-btn { display: none !important; } }
        @media (max-width: 900px) and (orientation: landscape) { body { overflow: hidden; } }
      `}</style>
    </div>
  );
}
