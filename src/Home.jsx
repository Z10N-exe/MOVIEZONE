import React, { useState, useEffect, useMemo } from 'react';
import { Play, Search, Plus, Check, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './AppContext';
import { fetchTrending, fetchAds, getImageUrl, fetchGenre, fetchSearch } from './api';

const GENRE_ROWS = [
  'Action', 'Comedy', 'Drama', 'Thriller', 'Horror',
  'Sci-Fi', 'Romance', 'Adventure', 'Animation', 'Crime',
  'Documentary', 'Fantasy', 'Mystery', 'Biography', 'Anime',
  'History', 'Music', 'Sport', 'War', 'Western',
];

const Row = ({ title, movies, onMovieClick }) => {
  if (!movies?.length) return null;
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ padding: '0 20px', marginBottom: 12, fontSize: 17, fontWeight: 700, color: '#e5e5e5' }}>{title}</h3>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px 4px', scrollbarWidth: 'none' }}>
        {movies.map(movie => (
          <div key={movie.id} onClick={() => onMovieClick(movie)}
            style={{ flexShrink: 0, width: 110, cursor: 'pointer', position: 'relative', borderRadius: 6, overflow: 'hidden' }}>
            <img
              src={getImageUrl(movie.thumbnail || movie.cover?.url)}
              loading="lazy"
              alt={movie.title}
              style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block', background: '#1a1a1a' }}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 5px 5px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.95), transparent)' }}>
              <p style={{ fontSize: 9, color: '#ccc', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
  const [genreData, setGenreData] = useState({});
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularSeries, setPopularSeries] = useState([]);
  const [ads, setAds] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [listAdded, setListAdded] = useState(false);

  // Well-known recent titles to search for
  const POPULAR_MOVIE_TITLES = [
    'Deadpool Wolverine', 'Inside Out 2', 'Dune Part Two', 'Oppenheimer',
    'Aquaman', 'The Marvels', 'Fast X', 'Mission Impossible',
    'John Wick 4', 'Guardians Galaxy', 'Ant-Man', 'Black Panther',
    'Avatar Way of Water', 'Top Gun Maverick', 'Spider-Man No Way Home',
  ];
  const POPULAR_SERIES_TITLES = [
    'The Last of Us', 'House of Dragon', 'Wednesday', 'Stranger Things',
    'The Bear', 'Succession', 'Squid Game', 'Euphoria',
    'Yellowstone', 'Andor', 'Loki', 'The Witcher',
  ];

  useEffect(() => {
    fetchTrending().then(data => { if (data?.length) setTrending(data); });
    if (!isPremium) {
      fetchAds().then(res => {
        if (res?.status === 'success') setAds(res.data.filter(a => a.type === 'banner' && a.placement === 'homepage'));
      });
    }

    // Fetch popular movies by searching known titles
    const fetchPopular = async (titles, setter) => {
      const results = [];
      const seen = new Set();
      for (const title of titles) {
        try {
          const items = await fetchSearch(title);
          if (items?.length) {
            const first = items[0];
            if (!seen.has(first.id)) { seen.add(first.id); results.push(first); }
          }
        } catch {}
        if (results.length >= 12) break;
      }
      if (results.length) setter(results);
    };

    fetchPopular(POPULAR_MOVIE_TITLES, setPopularMovies);
    setTimeout(() => fetchPopular(POPULAR_SERIES_TITLES, setPopularSeries), 1000);

    // Fetch first 8 genre rows immediately
    GENRE_ROWS.slice(0, 8).forEach(genre => {
      fetchGenre(genre).then(movies => {
        if (movies?.length) setGenreData(prev => ({ ...prev, [genre]: movies }));
      });
    });
  }, [isPremium]);

  // Lazy load remaining genres
  useEffect(() => {
    if (!trending.length) return;
    GENRE_ROWS.slice(8).forEach((genre, i) => {
      setTimeout(() => {
        fetchGenre(genre).then(movies => {
          if (movies?.length) setGenreData(prev => ({ ...prev, [genre]: movies }));
        });
      }, (i + 1) * 600);
    });
  }, [trending.length]);

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

const goToMovie = (movie) => {
    // Series go to details page to pick episode, movies go straight to player
    if (movie.subjectType === 2) navigate(`/movie/${movie.id}`);
    else navigate(`/movie/${movie.id}`);
  };
  const tvShows = useMemo(() => trending.filter(m => m.subjectType === 2), [trending]);
  const films = useMemo(() => trending.filter(m => m.subjectType === 1), [trending]);
  const newReleases = useMemo(() => [...trending].sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)).slice(0, 15), [trending]);

  return (
    <div style={{ backgroundColor: '#141414', minHeight: '100vh', paddingBottom: 100, color: '#fff' }}>

      {/* ── Hero ── */}
      <div style={{ height: '70vh', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${getImageUrl(featured.thumbnail, 'original')})`,
          backgroundSize: 'cover', backgroundPosition: 'center top',
          transition: 'background-image 0.8s ease'
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #141414 0%, rgba(20,20,20,0.3) 55%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(20,20,20,0.85) 0%, transparent 55%)' }} />

        {/* Nav */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
          <img src="/logo.png" style={{ height: 34, objectFit: 'contain' }} alt="MovieZone" />
          <Search color="white" size={22} style={{ cursor: 'pointer' }} onClick={() => navigate('/explore')} />
        </div>

        {/* Hero text */}
        <div style={{ position: 'absolute', bottom: 80, left: 24, right: '40%' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', fontWeight: 900, marginBottom: 8, textShadow: '2px 2px 8px rgba(0,0,0,0.9)', lineHeight: 1.1 }}>
            {featured.title || featured.name}
          </h1>
          <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#ccc', marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            {featured.score > 0 && <span style={{ color: '#46d369', fontWeight: 700 }}>{featured.score?.toFixed(1)} ★</span>}
            {featured.releaseDate && <span>{new Date(featured.releaseDate).getFullYear()}</span>}
            {featured.genre && <span style={{ border: '1px solid rgba(255,255,255,0.5)', padding: '1px 8px', borderRadius: 3, fontSize: 10 }}>{featured.genre?.split(',')[0]?.trim()}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => navigate(`/player/${featured.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', color: '#000', border: 'none', padding: '9px 22px', borderRadius: 5, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              <Play size={18} fill="black" /> {featured.subjectType === 2 ? 'Watch' : 'Play'}
            </button>
            <button onClick={() => navigate(`/movie/${featured.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(109,109,110,0.7)', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 5, fontWeight: 600, fontSize: 14, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
              <Info size={18} /> More Info
            </button>
            <button onClick={handleAddToMyList}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: listAdded ? '#1db954' : 'rgba(109,109,110,0.7)', color: '#fff', border: 'none', padding: '9px 14px', borderRadius: 5, fontWeight: 600, fontSize: 13, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
              {listAdded ? <><Check size={16} /> Added</> : <><Plus size={16} /> My List</>}
            </button>
          </div>
        </div>

        {/* Dots */}
        <div style={{ position: 'absolute', bottom: 18, left: 24, display: 'flex', gap: 5 }}>
          {trending.slice(0, 5).map((_, i) => (
            <div key={i} onClick={() => setHeroIndex(i)} style={{ width: i === heroIndex ? 18 : 5, height: 5, borderRadius: 3, background: i === heroIndex ? '#fff' : 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'all 0.3s' }} />
          ))}
        </div>
      </div>

      {/* ── Rows ── */}
      <div style={{ marginTop: -36, position: 'relative', zIndex: 10 }}>
        <Row title="Trending Now" movies={trending.slice(0, 15)} onMovieClick={goToMovie} />

        {!isPremium && ads[0] && (
          <div onClick={() => window.open(ads[0].targetLink, '_blank')}
            style={{ margin: '0 20px 28px', borderRadius: 8, height: 65, backgroundImage: `url(${ads[0].imageUrl})`, backgroundSize: 'cover', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', padding: '0 18px' }}>
              <span style={{ fontWeight: 'bold', fontSize: 13 }}>{ads[0].title}</span>
            </div>
          </div>
        )}

        <Row title="Popular Movies" movies={popularMovies} onMovieClick={goToMovie} />
        <Row title="Popular Series" movies={popularSeries} onMovieClick={goToMovie} />
        <Row title="TV Shows" movies={tvShows.slice(0, 15)} onMovieClick={goToMovie} />
        <Row title="Movies" movies={films.slice(0, 15)} onMovieClick={goToMovie} />
        <Row title="New Releases" movies={newReleases} onMovieClick={goToMovie} />

        {GENRE_ROWS.map(genre =>
          genreData[genre]?.length > 0 ? (
            <Row key={genre} title={genre} movies={genreData[genre]} onMovieClick={goToMovie} />
          ) : null
        )}
      </div>
    </div>
  );
}
