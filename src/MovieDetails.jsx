import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Play, Plus, ArrowLeft, Star, Download, Check } from 'lucide-react';
import { useAppContext } from './AppContext';
import { getImageUrl, fetchSources, fetchInfo } from './api';

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addDownload, addToMyList, removeFromMyList, isInMyList } = useAppContext();
  const [movie, setMovie] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [seasonsData, setSeasonsData] = useState([]);
  const [movieboxId, setMovieboxId] = useState(null);
  const location = useLocation();

  // Step 1: get title + year hints from URL params
  const titleHint = new URLSearchParams(location.search).get('t') || '';
  const yearHint = new URLSearchParams(location.search).get('y') || '';

  // Step 2: fetch info — pass id + hints, worker resolves to MovieBox id server-side
  useEffect(() => {
    if (!id) return;
    setLoading(true); setError(null); setMovie(null); setMovieboxId(null);

    fetchInfo(id, titleHint, yearHint).then(infoRes => {
      if (infoRes?.subject) {
        // Worker returns the resolved movieboxId on the subject
        const mbId = infoRes.subject.movieboxId || id;
        setMovieboxId(mbId);
        setMovie(infoRes.subject);
        document.title = `${infoRes.subject.title || infoRes.subject.name} - MovieZone`;
        if (infoRes.resource?.seasons?.length) {
          setSeasonsData(infoRes.resource.seasons);
          setSelectedSeason(infoRes.resource.seasons[0].se);
          setSelectedEpisode(1);
        }
      } else {
        setError('Could not load movie details.');
      }
    }).catch(() => setError('Failed to load details.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Step 3: fetch sources whenever season/episode changes
  useEffect(() => {
    if (!movieboxId || !movie) return;
    const isSeries = movie.subjectType === 2;
    fetchSources(movieboxId, isSeries ? selectedSeason : 0, isSeries ? selectedEpisode : 0, titleHint, yearHint)
      .then(res => setSources(res || []))
      .catch(() => setSources([]));
  }, [movieboxId, movie, selectedSeason, selectedEpisode]);

  const isSeries = movie?.subjectType === 2;
  const inList = movie && isInMyList(movieboxId);

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const handlePlay = () => {
    const base = `/player/${movieboxId}`;
    const title = movie.title || movie.name || '';
    const year = movie.year || (movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '') || '';
    const params = new URLSearchParams();
    if (title) params.set('t', title);
    if (year) params.set('y', String(year));
    if (isSeries) { params.set('season', selectedSeason); params.set('episode', selectedEpisode); }
    navigate(`${base}?${params.toString()}`);
  };

  const handleDownload = (src) => {
    if (!src) return;
    addDownload({
      id: movieboxId,
      title: movie.title || movie.name,
      imgUrl: getImageUrl(movie.thumbnail || movie.cover?.url),
      size: src.size || '',
      quality: src.quality,
      season: isSeries ? selectedSeason : null,
      episode: isSeries ? selectedEpisode : null,
    });
    const a = document.createElement('a');
    a.href = src.downloadUrl || src.streamUrl; a.download = '';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setShowDownloadMenu(false);
  };

  const handleMyList = () => {
    if (!movieboxId) return;
    if (inList) removeFromMyList(movieboxId);
    else addToMyList({ id: movieboxId, title: movie.title || movie.name, imgUrl: getImageUrl(movie.thumbnail || movie.cover?.url) });
  };

  if (loading) return (
    <div style={{ color: 'white', padding: '40px', textAlign: 'center', background: '#0f0f0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: '#aaa' }}>Loading...</p>
      </div>
    </div>
  );

  if (error || !movie) return (
    <div style={{ color: 'white', padding: '40px', textAlign: 'center', background: '#0f0f0f', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ color: '#ff4444' }}>{error || 'Movie not found'}</p>
      <button onClick={() => navigate(-1)} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--primary-red)', border: 'none', color: '#fff', cursor: 'pointer' }}>Go Back</button>
    </div>
  );

  const backdropUrl = getImageUrl(movie.stills?.url || movie.thumbnail || movie.cover?.url);

  return (
    <div style={{ color: 'white', paddingBottom: '80px', minHeight: '100vh', background: '#0f0f0f' }}>
      {/* Backdrop */}
      <div style={{ height: '50vh', backgroundImage: `url(${backdropUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', backgroundColor: '#1a1a1a' }}>
        {movie.trailer?.url && (
          <video src={movie.trailer.url} autoPlay muted loop playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} />
        )}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
          <div onClick={() => navigate(-1)}
            style={{ background: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(5px)' }}>
            <ArrowLeft color="white" size={24} />
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', background: 'linear-gradient(to top, #0f0f0f 10%, transparent)' }} />
      </div>

      <div style={{ padding: '0 20px', marginTop: '-60px', position: 'relative', zIndex: 10 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 10, fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {movie.title || movie.name}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#aaa', marginBottom: 20, fontSize: '0.9rem', flexWrap: 'wrap' }}>
          {(movie.score > 0) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ffb400', fontWeight: 'bold' }}>
              <Star size={14} fill="#ffb400" /> {Number(movie.score).toFixed(1)}
            </span>
          )}
          {(movie.year || movie.releaseDate) && (
            <span>{movie.year || new Date(movie.releaseDate).getFullYear()}</span>
          )}
          {movie.duration && <span>{movie.duration}</span>}
          {isSeries && <span style={{ background: '#333', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>Series</span>}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <button onClick={handlePlay}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'white', color: 'black', padding: '13px', borderRadius: 30, border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
            <Play size={18} fill="black" />
            {isSeries ? `Play S${selectedSeason} E${selectedEpisode}` : 'Play'}
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => { if (!sources.length) { alert('No download links found'); return; } setShowDownloadMenu(v => !v); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222', color: 'white', width: 50, height: '100%', minHeight: 48, borderRadius: 15, border: 'none', cursor: 'pointer' }}>
              <Download size={20} />
            </button>
            {showDownloadMenu && sources.length > 0 && (
              <div style={{ position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', borderRadius: 12, padding: '8px 0', minWidth: 150, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', border: '1px solid #333', zIndex: 100 }}>
                <p style={{ padding: '4px 16px', fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Download Quality</p>
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
          <button onClick={handleMyList}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: inList ? '#1db954' : '#222', color: 'white', width: 50, borderRadius: 15, border: 'none', cursor: 'pointer' }}>
            {inList ? <Check size={20} /> : <Plus size={20} />}
          </button>
        </div>

        <p style={{ lineHeight: 1.6, color: '#ccc', fontSize: '0.95rem', marginBottom: 28 }}>
          {movie.introduction || movie.overview || movie.description}
        </p>

        {/* Series episodes */}
        {seasonsData.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ marginBottom: 14, fontSize: '1.1rem' }}>Episodes</h3>
            {seasonsData.length > 1 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 12, scrollbarWidth: 'none' }}>
                {seasonsData.map(s => (
                  <button key={s.se} onClick={() => { setSelectedSeason(s.se); setSelectedEpisode(1); }}
                    style={{ padding: '7px 18px', borderRadius: 20, border: 'none', backgroundColor: selectedSeason === s.se ? 'var(--primary-red)' : '#222', color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                    Season {s.se}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(58px, 1fr))', gap: 8 }}>
              {Array.from({ length: seasonsData.find(s => s.se === selectedSeason)?.maxEp || 0 }, (_, i) => i + 1).map(ep => (
                <button key={ep} onClick={() => setSelectedEpisode(ep)}
                  style={{ height: 58, borderRadius: 12, border: 'none', backgroundColor: selectedEpisode === ep ? 'var(--primary-red)' : '#222', color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ep}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cast */}
        {movie.starring && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 14, fontSize: '1.1rem' }}>Cast</h3>
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
              {movie.starring.split(',').map((name, idx) => (
                <div key={idx} style={{ textAlign: 'center', minWidth: 72 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#222', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary-red)', margin: '0 auto' }}>
                    {name.trim().charAt(0)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: 4 }}>{name.trim()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .spinner { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.15); border-top-color: var(--primary-red, #e50914); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MovieDetails;
