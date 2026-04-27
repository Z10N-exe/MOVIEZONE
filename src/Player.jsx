import { useRef, useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, Pause, Maximize, Settings, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { fetchSources, fetchAds, fetchSearch, fetchInfo } from './api';
import { useAppContext } from './AppContext';

const loadHls = () => new Promise((resolve) => {
  if (window.Hls) return resolve();
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js';
  s.onload = resolve;
  document.head.appendChild(s);
});

export default function Player() {
  const navigate = useNavigate();
  const { id } = useParams();
  const containerRef = useRef(null);
  const { isPremium } = useAppContext();

  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoCallbackRef = useCallback((node) => {
    videoRef.current = node;
    setVideoReady(!!node);
  }, []);

  const hlsRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [sourceUrl, setSourceUrl] = useState(null);
  const [sources, setSources] = useState([]);
  const [quality, setQuality] = useState(480);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeAd, setActiveAd] = useState(null);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const seasonParam = parseInt(searchParams.get('season')) || 0;
  const episodeParam = parseInt(searchParams.get('episode')) || 0;
  // if season is 0 but episode > 0, it's likely a series with missing season — default to 1
  const effectiveSeason = (seasonParam === 0 && episodeParam > 0) ? 1 : seasonParam;
  const effectiveEpisode = episodeParam;

  // Fetch sources — validate they exist, then build quality options
  useEffect(() => {
    if (!id || id === 'fallback') return;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        // Resolve slug to numeric ID if needed
        let targetId = id;
        if (!/^\d+$/.test(id)) {
          const res = await fetchSearch(id.replace(/-/g, ' '));
          if (res?.length > 0) targetId = String(res[0].id);
          else { setError('Title not found.'); setLoading(false); return; }
        }

        // Fetch sources — validate they exist
        const sourcesRes = await fetchSources(targetId, effectiveSeason, effectiveEpisode);
        if (!sourcesRes?.length) {
          // No sources — check if it's a series that needs episode selection
          const info = await fetchInfo(targetId);
          const isSeries = info?.subject?.subjectType === 2 || info?.resource?.seasons?.length > 0;
          if (isSeries && effectiveSeason === 0 && effectiveEpisode === 0) {
            // Series with no episode selected — go back to info to pick one
            navigate(`/movie/${targetId}`, { replace: true });
            return;
          }
          setError('No stream sources available for this title.');
          setLoading(false);
          return;
        }

        const builtSources = sourcesRes.map(s => ({
          quality: Number(s.quality) || s.quality,
          streamUrl: s.streamUrl,   // /api/stream/:id → 302 → CDN URL
          directUrl: s.directUrl,   // raw CDN URL fallback
          downloadUrl: s.downloadUrl,
        }));
        setSources(builtSources);

        const preferred = builtSources.find(s => s.quality === 480) || builtSources[0];
        setQuality(preferred.quality);
        setSourceUrl(preferred.streamUrl);

        // Ads
        const adsRes = await fetchAds();
        if (adsRes?.status === 'success' && !isPremium) {
          const preRoll = adsRes.data?.find(a => a.placement === 'pre-roll');
          if (preRoll) setActiveAd(preRoll);
        }
      } catch (e) {
        console.error('Player load error:', e);
        setError('Failed to load stream. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, effectiveSeason, effectiveEpisode, isPremium]);

  // Setup video — only when both sourceUrl and video element are ready
  useEffect(() => {
    if (!sourceUrl || !videoReady || !videoRef.current) return;
    const video = videoRef.current;

    const cleanup = () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };

    cleanup(); // destroy any previous instance

    const setup = async () => {
      if (sourceUrl.includes('.m3u8')) {
        await loadHls();
        if (window.Hls?.isSupported()) {
          const hls = new window.Hls({ maxBufferLength: 30, enableWorker: true, startLevel: -1 });
          hlsRef.current = hls;
          hls.loadSource(sourceUrl);
          hls.attachMedia(video);
          hls.on(window.Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
          hls.on(window.Hls.Events.ERROR, (_, data) => {
            if (data.fatal) setError('Stream error. Try a different quality.');
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = sourceUrl;
          video.play().catch(() => {});
        }
      } else {
        video.src = sourceUrl;
        video.load();
        const onCanPlay = () => {
          video.removeEventListener('canplay', onCanPlay);
          video.play().catch(() => {});
        };
        const onError = () => {
          video.removeEventListener('error', onError);
          setError('Stream failed to load. Try a different quality.');
        };
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('error', onError);
      }
    };

    setup();
    return cleanup;
  }, [sourceUrl, videoReady]);

  // Controls auto-hide
  useEffect(() => {
    if (!isPlaying || !showControls) return;
    const t = setTimeout(() => setShowControls(false), 3500);
    return () => clearTimeout(t);
  }, [isPlaying, showControls]);

  const togglePlay = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
  };

  const skip = (e, secs) => {
    e?.stopPropagation();
    if (videoRef.current) videoRef.current.currentTime += secs;
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v); setIsMuted(v === 0);
    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; }
  };

  const toggleMute = () => {
    const m = !isMuted; setIsMuted(m);
    if (videoRef.current) {
      videoRef.current.muted = m;
      if (!m && volume === 0) { setVolume(0.5); videoRef.current.volume = 0.5; }
    }
  };

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  const changeQuality = (source) => {
    const time = videoRef.current?.currentTime || 0;
    setQuality(source.quality);
    setSourceUrl(source.streamUrl);
    setShowQualityMenu(false);
    setTimeout(() => { if (videoRef.current) videoRef.current.currentTime = time; }, 1000);
  };

  const fmt = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100vh', backgroundColor: '#000', position: 'relative', overflow: 'hidden', color: '#fff' }}
      onMouseMove={() => setShowControls(true)} onTouchStart={() => setShowControls(true)}>

      {loading ? (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div className="spinner" />
          <p style={{ color: '#aaa' }}>Loading stream...</p>
        </div>
      ) : error ? (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 20, textAlign: 'center' }}>
          <p style={{ color: '#ff4444', fontSize: 18 }}>{error}</p>
          <button onClick={() => navigate(-1)} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--primary-red)', border: 'none', color: '#fff', cursor: 'pointer' }}>Go Back</button>
        </div>
      ) : (
        <>
          <video ref={videoCallbackRef}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
            onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={togglePlay}
            playsInline
          />

          {!showControls && <div style={{ position: 'absolute', inset: 0, zIndex: 5 }} onClick={() => setShowControls(true)} />}

          {showControls && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 10, background: 'rgba(0,0,0,0.15)' }}>
              {/* Top */}
              <div style={{ padding: '30px 20px', display: 'flex', alignItems: 'center', gap: 20, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
                <ArrowLeft size={28} style={{ cursor: 'pointer' }} onClick={() => navigate(-1)} />
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600 }}>Now Playing</h2>
                  <p style={{ fontSize: 12, color: '#aaa' }}>{quality}p</p>
                </div>
                <div style={{ position: 'relative' }}>
                  <Settings size={24} style={{ cursor: 'pointer' }} onClick={() => setShowQualityMenu(v => !v)} />
                  {showQualityMenu && (
                    <div style={{ position: 'absolute', top: 35, right: 0, background: '#181818', borderRadius: 12, padding: '10px 0', minWidth: 150, boxShadow: '0 10px 40px rgba(0,0,0,0.6)', border: '1px solid #333' }}>
                      <p style={{ padding: '8px 20px', fontSize: 11, color: '#666', textTransform: 'uppercase' }}>Quality</p>
                      {sources.map(s => (
                        <div key={s.quality} onClick={() => changeQuality(s)}
                          style={{ padding: '12px 20px', cursor: 'pointer', fontSize: 14, color: quality === s.quality ? 'var(--primary-red)' : '#fff', fontWeight: quality === s.quality ? 'bold' : 'normal' }}>
                          {s.quality}p {quality === s.quality ? '✓' : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ flex: 1 }} onClick={togglePlay} />

              {/* Center */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 50, pointerEvents: 'none' }}>
                <RotateCcw size={40} style={{ cursor: 'pointer', pointerEvents: 'auto' }} onClick={(e) => skip(e, -10)} />
                <div onClick={togglePlay} style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(229,9,20,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'auto', boxShadow: '0 0 30px rgba(229,9,20,0.4)' }}>
                  {isPlaying ? <Pause size={40} fill="white" /> : <Play size={40} fill="white" style={{ marginLeft: 5 }} />}
                </div>
                <RotateCcw size={40} style={{ cursor: 'pointer', pointerEvents: 'auto', transform: 'scaleX(-1)' }} onClick={(e) => skip(e, 10)} />
              </div>

              {/* Bottom */}
              <div style={{ padding: '40px 20px 20px', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
                <div style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.2)', borderRadius: 3, position: 'relative', cursor: 'pointer', marginBottom: 20 }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (videoRef.current) videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
                  }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, background: 'var(--primary-red)', borderRadius: 3 }} />
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--primary-red)', position: 'absolute', left: `${progress}%`, top: '50%', transform: 'translate(-50%, -50%)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 13, minWidth: 45 }}>{fmt(currentTime)}</span>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div onClick={toggleMute} style={{ cursor: 'pointer' }}>
                      {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange} style={{ width: 80, accentColor: 'var(--primary-red)', cursor: 'pointer' }} />
                  </div>
                  <span style={{ fontSize: 13, color: '#888' }}>{fmt(duration)}</span>
                  <Maximize size={22} style={{ cursor: 'pointer' }} onClick={toggleFullScreen} />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeAd && (
        <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '90%', maxWidth: 600, textAlign: 'center', position: 'relative' }}>
            {activeAd.imageUrl?.includes('.mp4')
              ? <video src={activeAd.imageUrl} autoPlay onEnded={() => setActiveAd(null)} style={{ width: '100%', borderRadius: 12 }} />
              : <img src={activeAd.imageUrl} style={{ width: '100%', borderRadius: 12 }} alt="ad" />}
            <button onClick={() => setActiveAd(null)}
              style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13 }}>
              Skip ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
