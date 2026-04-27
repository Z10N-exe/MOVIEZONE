import React, { useState, useEffect } from 'react';
import { Search, Play, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchSearch, fetchGenre, fetchTrending, getImageUrl } from './api';

const CATEGORIES = ['Action', 'Comedy', 'Drama', 'Anime', 'Sci-Fi', 'Horror', 'Romance', 'Thriller', 'Adventure', 'Mystery'];

const MasonryCard = ({ movie, index }) => {
  const navigate = useNavigate();
  const aspectRatios = ['3/4', '4/5', '2/3', '1/1', '3/4', '4/3'];
  const ratio = aspectRatios[index % aspectRatios.length];

  return (
    <div
      onClick={() => navigate(`/movie/${movie.id}?t=${encodeURIComponent(movie.title || movie.name || '')}&y=${movie.year || ''}`)}
      className="masonry-card"
      style={{ cursor: 'pointer' }}
    >
      <div style={{ position: 'relative', paddingBottom: 0 }}>
        <img
          src={getImageUrl(movie.thumbnail)}
          alt={movie.title || movie.name}
          loading="lazy"
          style={{
            width: '100%',
            aspectRatio: ratio,
            objectFit: 'cover',
            display: 'block',
            borderRadius: 12,
          }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '20px 8px 8px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
          borderRadius: '0 0 12px 12px'
        }}>
          <h3 style={{
            fontSize: 12, fontWeight: 600, color: 'white',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            margin: 0
          }}>
            {movie.title || movie.name}
          </h3>
          {movie.year && (
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>{movie.year}</p>
          )}
        </div>
        {/* Play button hover effect */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'rgba(229,9,20,0.8)',
          borderRadius: '50%',
          width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.2s'
        }} className="card-play-icon">
          <Play size={16} color="#fff" fill="#fff" />
        </div>
      </div>
    </div>
  );
};

const Explore = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeGenre, setActiveGenre] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(true);

  // Fetch trending for recommendations on mount
  useEffect(() => {
    fetchTrending().then(data => {
      // Shuffle a bit for variety
      const shuffled = [...data].sort(() => Math.random() - 0.45);
      setRecommendations(shuffled.slice(0, 20));
      setRecsLoading(false);
    });
  }, []);

  // Search debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        setActiveGenre(null);
        setLoading(true);
        fetchSearch(query).then(data => { setResults(data); setLoading(false); });
      } else if (!activeGenre) {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Genre filter — uses /api/genre/:genre not text search
  const handleGenreClick = (genre) => {
    setQuery('');
    setActiveGenre(genre);
    setLoading(true);
    fetchGenre(genre).then(data => { setResults(data); setLoading(false); });
  };

  const showDefault = results.length === 0 && !loading && !activeGenre;

  return (
    <div className="page-container" style={{ paddingBottom: '80px', color: 'white' }}>
      {/* Header & Search */}
      <div style={{ padding: '20px 20px 0' }}>
        <h1 style={{ marginBottom: 12, fontSize: 28, fontWeight: 700 }}>Explore</h1>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: '#1a1a1a', padding: '12px 15px',
          borderRadius: 14, border: '1px solid #333'
        }}>
          <Search size={20} color="#888" />
          <input
            type="text"
            placeholder="Search movies, series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: 'transparent', border: 'none', color: '#fff',
              marginLeft: 10, width: '100%', outline: 'none', fontSize: '1rem'
            }}
          />
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {/* Loading indicator */}
        {loading && <p style={{ textAlign: 'center', color: '#aaa' }}>Searching...</p>}

        {/* SEARCH RESULTS */}
        {results.length > 0 && (
          <div className="masonry-grid">
            {results.map((movie, index) => (
              <MasonryCard key={`${movie.id}-${index}`} movie={movie} index={index} />
            ))}
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <p style={{ textAlign: 'center', color: '#aaa' }}>No results found for "{query}"</p>
        )}

        {/* DEFAULT STATE: Categories + Recommendations */}
        {showDefault && (
          <>
            {/* Categories */}
            <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600, color: '#eee' }}>Categories</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 28 }}>
              {CATEGORIES.map(cat => (
                <div key={cat} onClick={() => handleGenreClick(cat)}
                  className="category-chip"
                  style={{ backgroundColor: activeGenre === cat ? 'var(--primary-red)' : undefined }}>
                  {cat}
                </div>
              ))}
            </div>

            {/* Recommendations */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <TrendingUp size={18} color="#E50914" />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#eee', margin: 0 }}>Trending Now</h3>
            </div>

            {recsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #1a1a1a, #222)',
                    aspectRatio: i % 3 === 0 ? '3/4' : '4/5',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                ))}
              </div>
            ) : (
              <div className="masonry-grid">
                {recommendations.map((movie, index) => (
                  <MasonryCard key={`rec-${movie.id}-${index}`} movie={movie} index={index} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Explore;
