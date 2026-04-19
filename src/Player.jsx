import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Play, Pause, Maximize, Settings, RotateCcw, MonitorUp, Volume2, VolumeX } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { fetchSources, fetchAds, fetchSearch } from './api';
import { useAppContext } from './AppContext';

// Hls.js load helper
const loadHls = () => {
  return new Promise((resolve) => {
    if (window.Hls) return resolve();
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

export default function Player() {
  const navigate = useNavigate();
  const { id } = useParams();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const { isPremium } = useAppContext();
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [sourceUrl, setSourceUrl] = useState(null);
  const [sources, setSources] = useState([]);
  const [quality, setQuality] = useState('Auto');
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState([]);
  const [activeAd, setActiveAd] = useState(null);
  const [adShown, setAdShown] = useState({});

  useEffect(() => {
    let hls;
    const setupPlayer = async () => {
      if (!sourceUrl || !videoRef.current) return;
      
      const isHls = sourceUrl.includes('.m3u8');
      
      if (isHls) {
        await loadHls();
        if (window.Hls.isSupported()) {
          if (hls) hls.destroy();
          hls = new window.Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            enableWorker: true,
            startLevel: -1,
            manifestLoadingMaxRetry: 3,
            xhrSetup: (xhr) => {
              xhr.withCredentials = true;
            }
          });
          hls.loadSource(sourceUrl);
          hls.attachMedia(videoRef.current);
          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
             videoRef.current.play().catch(e => console.error("AutoPlay failed:", e));
          });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = sourceUrl;
        }
      } else {
        videoRef.current.src = sourceUrl;
      }
    };
    setupPlayer();
    return () => {
      if (hls) hls.destroy();
    };
  }, [sourceUrl]);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const seasonParam = parseInt(searchParams.get('season')) || 0;
  const episodeParam = parseInt(searchParams.get('episode')) || 0;

  useEffect(() => {
    if (id && id !== 'fallback') {
      setLoading(true);
      
      const resolveAndFetch = async () => {
         let targetId = id;
         if (!/^\d+$/.test(id)) {
            const searchRes = await fetchSearch(id.replace(/-/g, ' '));
            if (searchRes && searchRes.length > 0) {
               targetId = searchRes[0].id;
            }
         }

         const [sourcesRes, adsRes] = await Promise.all([
            fetchSources(targetId, seasonParam, episodeParam), 
            fetchAds()
         ]);
         if (sourcesRes && sourcesRes.length > 0) {
            setSources(sourcesRes);
            setSourceUrl(sourcesRes[0].streamUrl);
            setQuality(sourcesRes[0].quality);
         }
         if (adsRes.status === 'success' && !isPremium) {
            setAds(adsRes.data);
            const preRoll = adsRes.data.find(a => a.placement === 'pre-roll');
            if (preRoll) setActiveAd(preRoll);
         }
         setLoading(false);
      };

      resolveAndFetch();
    }
  }, [id, isPremium, seasonParam, episodeParam]);

  // Controls Timer
  useEffect(() => {
    let timeout;
    if (isPlaying && showControls) {
      timeout = setTimeout(() => setShowControls(false), 3500);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, showControls]);

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const skip = (e, amount) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
    }
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setIsMuted(v === 0);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
  };

  const toggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    if (videoRef.current) {
      videoRef.current.muted = newMute;
      if (!newMute && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    }
  };

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        alert("Fullscreen not supported in this browser");
      });
    } else {
      document.exitFullscreen();
    }
  };

  const changeQuality = (source) => {
    const time = videoRef.current ? videoRef.current.currentTime : currentTime;
    setSourceUrl(source.streamUrl);
    setQuality(source.quality);
    setShowQualityMenu(false);
    // Note: useEffect(sourceUrl) handles the reload
    setTimeout(() => {
        if (videoRef.current) videoRef.current.currentTime = time;
    }, 500);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div 
       ref={containerRef}
       className="player-container"
       style={{ width: '100%', height: '100vh', backgroundColor: '#000', position: 'relative', overflow: 'hidden', color: '#fff' }}
       onMouseMove={() => setShowControls(true)}
    >
      {loading ? (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner"></div>
            <p style={{ marginLeft: 15 }}>Optimizing Stream...</p>
        </div>
      ) : (
      <>
        <video 
          ref={videoRef}
          crossOrigin="anonymous"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
          autoPlay
          playsInline
        />

        {/* Global Transparent Overlay for Clicks */}
        {!showControls && <div style={{ position: 'absolute', inset: 0, zIndex: 5 }} onClick={() => setShowControls(true)} />}

        {showControls && (
          <div className="controls-overlay" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 10, background: 'rgba(0,0,0,0.2)' }}>
            
            {/* Top Bar */}
            <div style={{ padding: '30px 20px', display: 'flex', alignItems: 'center', gap: 20, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
               <ArrowLeft size={28} style={{ cursor: 'pointer' }} onClick={() => navigate(-1)} />
               <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600 }}>Now Playing</h2>
                  <p style={{ fontSize: 12, color: '#aaa' }}>Live Production Stream</p>
               </div>
               
               <div style={{ position: 'relative' }}>
                  <Settings size={24} style={{ cursor: 'pointer' }} onClick={() => setShowQualityMenu(!showQualityMenu)} />
                  {showQualityMenu && (
                    <div style={{ position: 'absolute', top: 35, right: 0, background: '#181818', borderRadius: 12, padding: '10px 0', minWidth: 160, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', border: '1px solid #333' }}>
                        <p style={{ padding: '8px 20px', fontSize: 11, color: '#666', textTransform: 'uppercase' }}>Resolution Scale</p>
                        {sources.map(s => (
                          <div 
                            key={s.quality} 
                            onClick={() => changeQuality(s)}
                            style={{ padding: '12px 20px', cursor: 'pointer', color: quality === s.quality ? 'var(--primary-red)' : '#fff', fontSize: 14, background: quality === s.quality ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                            {s.quality}
                          </div>
                        ))}
                    </div>
                  )}
               </div>
               <MonitorUp size={24} style={{ cursor: 'pointer' }} onClick={() => alert("Mirroring is coming soon!")} />
            </div>

            <div style={{ flex: 1 }} onClick={togglePlay} />

            {/* Center HUD */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 50, pointerEvents: 'none' }}>
               <RotateCcw size={40} style={{ cursor: 'pointer', pointerEvents: 'auto' }} onClick={(e) => skip(e, -10)} />
               <div 
                 onClick={togglePlay} 
                 style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(229,9,20,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'auto', boxShadow: '0 0 30px rgba(229,9,20,0.4)' }}>
                 {isPlaying ? <Pause size={40} fill="white" /> : <Play size={40} fill="white" style={{marginLeft: 5}} />}
               </div>
               <RotateCcw size={40} style={{ cursor: 'pointer', pointerEvents: 'auto', transform: 'scaleX(-1)' }} onClick={(e) => skip(e, 10)} />
            </div>

            {/* Bottom Bar */}
            <div style={{ padding: '40px 20px 20px', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
               {/* Progress Slider */}
               <div 
                 className="progress-container"
                 style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.2)', borderRadius: 3, position: 'relative', cursor: 'pointer', marginBottom: 20, pointerEvents: 'auto' }}
                 onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const per = (e.clientX - rect.left) / rect.width;
                    if (videoRef.current) videoRef.current.currentTime = per * duration;
                 }}
               >
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, background: 'var(--primary-red)', borderRadius: 3 }} />
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--primary-red)', position: 'absolute', left: `${progress}%`, top: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }} />
               </div>

               <div style={{ display: 'flex', alignItems: 'center', gap: 20, pointerEvents: 'auto' }}>
                  <span style={{ fontSize: 13, minWidth: 45 }}>{formatTime(currentTime)}</span>
                  <div style={{ flex: 1 }} />
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                     <div onClick={toggleMute} style={{ cursor: 'pointer' }}>
                        {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                     </div>
                     <input 
                       type="range" min="0" max="1" step="0.01" 
                       value={isMuted ? 0 : volume} 
                       onChange={handleVolumeChange}
                       style={{ width: 80, accentColor: 'var(--primary-red)', cursor: 'pointer' }}
                     />
                  </div>

                  <span style={{ fontSize: 13, color: '#888' }}>{formatTime(duration)}</span>
                  <Maximize size={22} style={{ cursor: 'pointer' }} onClick={toggleFullScreen} />
               </div>
            </div>
          </div>
        )}
      </>
      )}

      {/* Ad Layer */}
      {activeAd && (
        <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '90%', maxWidth: 600, textAlign: 'center' }}>
               <h3 style={{ color: 'var(--primary-red)', marginBottom: 20 }}>Sponsor Message</h3>
               <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                  {activeAd.imageUrl.includes('.mp4') ? (
                    <video src={activeAd.imageUrl} autoPlay onEnded={() => setActiveAd(null)} style={{ width: '100%' }} />
                  ) : (
                    <img src={activeAd.imageUrl} style={{ width: '100%' }} />
                  )}
                  <button 
                    onClick={() => setActiveAd(null)}
                    style={{ position: 'absolute', top: 15, right: 15, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 20, cursor: 'pointer' }}>
                    Skip ad in 5s
                  </button>
               </div>
            </div>
        </div>
      )}
    </div>
  );
}
