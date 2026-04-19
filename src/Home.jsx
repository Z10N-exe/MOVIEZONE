import React from 'react';
import { Play, Search, Plus, Star, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './AppContext';
import { fetchTrending, fetchAds, getImageUrl, fetchSources, slugify } from './api';

const MovieCard = ({ id, imgUrl, isNew }) => {
  const navigate = useNavigate();
  return (
    <div 
      onClick={() => navigate(`/movie/${id || 'fallback'}`)}
      style={{ 
        cursor: 'pointer',
        position: 'relative', 
        width: 120, 
        height: 180, 
        borderRadius: 8, 
        flexShrink: 0, 
        backgroundImage: `url(${imgUrl})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center' 
      }}>
      {isNew && <span style={{ position: 'absolute', top: 6, left: 6, backgroundColor: 'var(--primary-red)', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 'bold' }}>NEW</span>}
    </div>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const { addToMyList, removeFromMyList, isInMyList, isPremium } = useAppContext();
  const [listAdded, setListAdded] = React.useState(false);
  const [trending, setTrending] = React.useState([]);
  const [ads, setAds] = React.useState([]);
  const [heroIndex, setHeroIndex] = React.useState(0);

  // Background cache for pre-fetched sources
  const prefetchCache = React.useRef(new Set());
  
  const handlePrefetch = (id) => {
    if (!id || prefetchCache.current.has(id) || id === 'fallback') return;
    console.log("Pre-fetching sources for:", id);
    fetchSources(id); // Backend will cache the result
    prefetchCache.current.add(id);
  };

  React.useEffect(() => {
    fetchTrending().then(data => {
      if (data && data.length > 0) setTrending(data);
    });
    if (!isPremium) {
      fetchAds().then(res => {
        if (res.status === 'success') setAds(res.data.filter(a => a.type === 'banner' && a.placement === 'homepage'));
      });
    }
  }, [isPremium]);

  React.useEffect(() => {
    if (trending.length > 0) {
      const timer = setInterval(() => {
        setHeroIndex(prev => (prev + 1) % Math.min(trending.length, 5));
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [trending]);

  const featured = trending[heroIndex] || { title: '', thumbnail: '' };

  const handleAddToMyList = () => {
    if (!featured.id) return;
    const inList = isInMyList(featured.id);
    if (inList) {
      removeFromMyList(featured.id);
      setListAdded(false);
    } else {
      addToMyList({ id: featured.id, title: featured.title, imgUrl: getImageUrl(featured.thumbnail) });
      setListAdded(true);
    }
  };

  // sync button state when hero changes
  React.useEffect(() => {
    setListAdded(featured.id ? isInMyList(featured.id) : false);
  }, [featured.id]);

  const categories = React.useMemo(() => {
    const genreMap = {};
    trending.forEach(m => {
      if (m.genre) {
        m.genre.split(',').forEach(g => {
          const trimmed = g.trim();
          if (!genreMap[trimmed]) {
            genreMap[trimmed] = getImageUrl(m.thumbnail);
          }
        });
      }
    });
    return Object.entries(genreMap).slice(0, 6).map(([name, img]) => ({ name, img }));
  }, [trending]);

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Hero Movie Carousel */}
      <div style={{ height: '55vh', position: 'relative', overflow: 'hidden' }}>
        <div className="hero-pulse" style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundImage: `url(${getImageUrl(featured.thumbnail, 'original')})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          transition: 'background-image 1s ease-in-out'
        }} />
        <div className="hero-gradient" style={{ position: 'absolute', inset: 0 }} />
        
        {/* Top Header */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '40px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <img src="/logo.png" style={{ height: 40, width: 40, objectFit: 'contain' }} alt="MovieZone" />
          <Search color="white" size={24} style={{ cursor: 'pointer' }} onClick={() => navigate('/explore')} />
        </div>

        {/* Hero Content */}
        <div className="hero-content" style={{ position: 'absolute', bottom: 120, left: 20, right: 20, zIndex: 10 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{featured.title || featured.name}</h1>
          <div style={{ display: 'flex', gap: 15, fontSize: 14, color: '#ccc', marginBottom: 20, alignItems: 'center' }}>
            <span style={{ color: '#ffb400', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={16} fill="#ffb400" /> {(featured.score || featured.vote_average || 0).toFixed(1)}
            </span>
            <span>{featured.year || featured.release_date?.split('-')[0] || (featured.releaseDate ? new Date(featured.releaseDate).getFullYear() : '')}</span>
            <span style={{ border: '1px solid rgba(255,255,255,0.4)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>HD</span>
            <span>{featured.duration || (featured.runtime ? `${Math.floor(featured.runtime / 60)}h ${featured.runtime % 60}m` : '')}</span>
          </div>
        </div>

        {/* Hero Actions */}
        <div style={{ position: 'absolute', bottom: 40, left: 20, right: 20, display: 'flex', gap: 15 }}>
          <button 
             onClick={() => navigate(`/player/${featured.id || slugify(featured.title || featured.name)}`)}
             className="hero-button button-primary"
             style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 8px 25px rgba(229, 9, 20, 0.4)' }}
          >
            <Play size={22} fill="white" /> Play
          </button>
          <button 
             onClick={() => handleAddToMyList()}
             className="hero-button btn-my-list"
             style={{ 
               flex: 1, 
               boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)',
               backgroundColor: listAdded ? '#1db954' : undefined,
               borderColor: listAdded ? '#1db954' : undefined,
               transition: 'background-color 0.3s, border-color 0.3s',
               display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
             }}
          >
            {listAdded 
              ? <><Check size={22} strokeWidth={3} /> Added</>
              : <><Plus size={22} /> My List</>
            }
          </button>
        </div>
      </div>

      {/* Trending */}
      <div style={{ padding: '20px 0 0 20px' }}>
        <div className="section-header" style={{ paddingRight: 20 }}>
          <h3>Trending</h3>
          <span className="see-all" onClick={() => navigate('/explore')}>See All</span>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
          {trending.slice(0, 10).map(movie => (
            <div 
              key={movie.id} 
              onClick={() => navigate(`/movie/${slugify(movie.title || movie.name)}`)} 
              onMouseEnter={() => handlePrefetch(movie.id)}
              style={{ flexShrink: 0, width: 110, cursor: 'pointer' }}
            >
              <img src={getImageUrl(movie.thumbnail)} loading="lazy" style={{ width: '100%', borderRadius: 12, aspectRatio: '2/3', objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Banner Ad */}
      {!isPremium && ads[0] && (
        <div 
          onClick={() => window.open(ads[0].targetLink, '_blank')}
          style={{ 
            margin: '20px', 
            borderRadius: 12, 
            height: 80, 
            backgroundImage: `url(${ads[0].imageUrl})`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center',
            position: 'relative',
            cursor: 'pointer',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}>
           <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>{ads[0].title}</div>
           </div>
        </div>
      )}

      {/* Top Picks (Wide Selection) */}
      <div style={{ padding: '20px 0 0 20px' }}>
        <div className="section-header" style={{ paddingRight: 20 }}>
          <h3>Top Picks</h3>
          <span className="see-all" onClick={() => navigate('/explore')}>See All</span>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
          {trending.slice(10, 20).map(movie => (
            <div 
              key={movie.id} 
              onClick={() => navigate(`/movie/${slugify(movie.title || movie.name)}`)} 
              onMouseEnter={() => handlePrefetch(movie.id)}
              className="wide-card"
            >
              <img src={getImageUrl(movie.thumbnail)} loading="lazy" />
              <div className="card-overlay">
                <span style={{ fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' }}>{movie.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div style={{ padding: '20px' }}>
        <div className="section-header">
           <h3>Categories</h3>
           <span className="see-all" onClick={() => navigate('/explore')}>See All</span>
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
          {categories.length > 0 ? categories.map(cat => (
            <div key={cat.name} onClick={() => navigate('/explore')} className="category-chip">
              {cat.name}
            </div>
          )) : (
            ['Action', 'Comedy', 'Drama', 'Anime', 'Horror', 'Sci-Fi'].map(name => (
              <div key={name} onClick={() => navigate('/explore')} className="category-chip">
                {name}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
