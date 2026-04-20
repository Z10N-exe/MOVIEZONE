import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Search, Plus, Star, Check, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './AppContext';
import { fetchTrending, fetchHomepage, fetchAds, getImageUrl, fetchSources } from './api';

const Row = ({ title, movies, onMovieClick }) => {
  if (!movies?.length) return null;
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ padding: '0 20px', marginBottom: 12, fontSize: 18, fontWeight: 700, color: '#fff' }}>{title}</h3>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 20px 8px', scrollbarWidth: 'none' }}>
        {movies.map(movie => (
          <div key={movie.id} onClick={() => onMovieClick(movie)}
            style={{ flexShrink: 0, width: 120, cursor: 'pointer', position: 'relative' }}>
            <img src={getImageUrl(movie.thumbnail || movie.cover?.url)}
              loading="lazy"
              style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: 8, display: 'block' }}
              onError={e => { e.target.style.background = '#222'; }}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 6px 6px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', borderRadius: '0 0 8px 8px' }}>
              <p style={{ fontSize: 10, color: '#ddd', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {movie.title || movie.name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const { addToMyList, removeFromMyList, isInMyList, isPremium } = useAppContext();
  const [trending, setTrending] = useState([]);
  const [homepage, setHomepage] = useState({});
  const [ads, setAds] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [listAdded, setListAdded] = useState(false);
  const prefetchCache = useRef(new Set());

  useEffect(() => {
    fetchTrending().then(data => { if (data?.length) setTrending(data); });
    fetchHomepage().then(data => { if (data) setHomepage(data); });
    if (!isPremium) {
      fetchAds().then(res => {
        if (res.status === 'success') setAds(res.data.filter(a => a.type === 'banner' && a.placement === 'homepage'));
      });
    }
  }, [isPremium]);

  useEffect(() => {
    if (!trending.length) return;
    const t = setInterval(() => setHeroIndex(p => (p + 1) % Math.min(trending.length, 5)), 6000);
    return () => clearInterval(t);
  }, [trending]);

  const featured = trending[heroIndex] || {};

  useEffect(() => {
    setListAdded(featured.id ? isInMyList(featured.id) : false);
  }, [featured.id]);

  const handleAddToMyList = () => {
    if (!featured.id) return;
    if (isInMyList(featured.id)) { removeFromMyList(featured.id); setListAdded(false); }
    else { addToMyList({ id: featured.id, title: featured.title, imgUrl: getImageUrl(featured.thumbnail) }); setListAdded(true); }
  };

  const goToMovie = (movie) => navigate(`/movie/${movie.id}`);

  // Build genre rows from trending data
  const genreRows = useMemo(() => {
    const map = {};
    trending.forEach(m => {
      if (!m.genre) return;
      m.genre.split(',').forEach(g => {
        const genre = g.trim();
        if (!map[genre]) map[genre] = [];
        if (map[genre].length < 15) map[genre].push(m);
      });
    });
    return Object.entries(map)
      .filter(([, movies]) => movies.length >= 3)
      .slice(0, 6);
  }, [trending]);

  // Homepage sections
  const homeSections = useMemo(() => {
    if (!homepage) return [];
    return Object.entries(homepage)
      .filter(([, val]) => Array.isArray(val) && val.length > 0)
      .slice(0, 4)
      .map(([key, items]) => ({
        title: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
        movies: items.map(i => ({ ...i, id: i.subjectId || i.id, thumbnail: i.thumbnail || i.cover?.url || '' }))
      }));
  }, [homepage]);

  const movies = trending;
  const tvShows = trending.filter(m => m.subjectType === 2);
  const films = trending.filter(m => m.subjectType === 1);

  return (
    <div style={{ backgroundColor: '#141414', minHeight: '100vh', paddingBottom: 100, color: '#fff' }}>

      {/* Hero */}
      <div style={{ height: '70vh', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${getImageUrl(featured.thumbnail, 'original')})`,
          backgroundSize: 'cover', backgroundPosition: 'center top',
          transition: 'background-image 0.8s ease'
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #141414 0%, rgba(20,20,20,0.4) 60%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(20,20,20,0.8) 0%, transparent 60%)' }} />

        {/* Top nav */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
          <img src="/logo.png" style={{ height: 36, objectFit: 'contain' }} alt="MovieZone" />
          <Search color="white" size={22} style={{ cursor: 'pointer' }} onClick={() => navigate('/explore')} />
        </div>

        {/* Hero info */}
        <div style={{ position: 'absolute', bottom: 80, left: 24, right: 24, maxWidth: 500 }}>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 900, marginBottom: 8, textShadow: '2px 2px 8px rgba(0,0,0,0.8)', lineHeight: 1.1 }}>
            {featured.title || featured.name}
          </h1>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#ccc', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#46d369', fontWeight: 700 }}>
              {(featured.score || 0).toFixed(1)} ★
            </span>
            {featured.releaseDate && <span>{new Date(featured.releaseDate).getFullYear()}</span>}
            {featured.genre && <span style={{ border: '1px solid rgba(255,255,255,0.4)', padding: '1px 8px', borderRadius: 3, fontSize: 11 }}>{featured.genre?.split(',')[0]}</span>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate(`/player/${featured.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', color: '#000', border: 'none', padding: '10px 24px', borderRadius: 6, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
              <Play size={20} fill="black" /> Play
            </button>
            <button onClick={() => navigate(`/movie/${featured.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(109,109,110,0.7)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 700, fontSize: 16, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
              <Info size={20} /> More Info
            </button>
            <button onClick={handleAddToMyList}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: listAdded ? '#1db954' : 'rgba(109,109,110,0.7)', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
              {listAdded ? <><Check size={18} /> Added</> : <><Plus size={18} /> List</>}
            </button>
          </div>
        </div>

        {/* Hero dots */}
        <div style={{ position: 'absolute', bottom: 20, left: 24, display: 'flex', gap: 6 }}>
          {trending.slice(0, 5).map((_, i) => (
            <div key={i} onClick={() => setHeroIndex(i)} style={{ width: i === heroIndex ? 20 : 6, height: 6, borderRadius: 3, background: i === heroIndex ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.3s' }} />
          ))}
        </div>
      </div>

      {/* Content rows */}
      <div style={{ marginTop: -40, position: 'relative', zIndex: 10 }}>

        <Row title="Trending Now" movies={trending.slice(0, 15)} onMovieClick={goToMovie} />

        {!isPremium && ads[0] && (
          <div onClick={() => window.open(ads[0].targetLink, '_blank')}
            style={{ margin: '0 20px 32px', borderRadius: 10, height: 70, backgroundImage: `url(${ads[0].imageUrl})`, backgroundSize: 'cover', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
              <span style={{ fontWeight: 'bold', fontSize: 14 }}>{ads[0].title}</span>
            </div>
          </div>
        )}

        <Row title="TV Shows" movies={tvShows.slice(0, 15)} onMovieClick={goToMovie} />
        <Row title="Movies" movies={films.slice(0, 15)} onMovieClick={goToMovie} />

        {homeSections.map(({ title, movies }) => (
          <Row key={title} title={title} movies={movies} onMovieClick={goToMovie} />
        ))}

        {genreRows.map(([genre, movies]) => (
          <Row key={genre} title={genre} movies={movies} onMovieClick={goToMovie} />
        ))}

        <Row title="New Releases" movies={[...trending].sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)).slice(0, 15)} onMovieClick={goToMovie} />
      </div>
    </div>
  );
}
