import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Play, Plus, ArrowLeft, Star, Download } from 'lucide-react';
import { useAppContext } from './AppContext';
import { tmdbApi, getImageUrl, fetchSources, fetchInfo, slugify, fetchSearch } from './api';

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, addDownload } = useAppContext();
  const [movie, setMovie] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [seasonsData, setSeasonsData] = useState([]);
  const [targetId, setTargetId] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const resolveId = async () => {
      let resolvedId = id;
      if (!/^\d+$/.test(id)) {
         const searchRes = await fetchSearch(id.replace(/-/g, ' '));
         if (searchRes && searchRes.length > 0) resolvedId = searchRes[0].id;
      }
      setTargetId(resolvedId);
    };
    resolveId();
  }, [id]);

  useEffect(() => {
    if (!targetId) return;

    const fetchMovieData = async () => {
      try {
        setLoading(true);
        const infoRes = await fetchInfo(targetId);
        
        if (infoRes && infoRes.subject) {
          setMovie(infoRes.subject);
          document.title = `${infoRes.subject.title || infoRes.subject.name} - MovieZone`;
          
          if (infoRes.resource?.seasons) {
            setSeasonsData(infoRes.resource.seasons);
            setSelectedSeason(infoRes.resource.seasons[0].se);
            setSelectedEpisode(1);
            
            // Branding: Append ?series if not present
            if (!location.search.toLowerCase().includes('series')) {
               navigate(`${location.pathname}?series`, { replace: true });
            }
          }
        } else {
          const trendRes = await tmdbApi.getTrending();
          const found = trendRes.find(m => m.id.toString() === targetId) || trendRes[0];
          setMovie(found);
          if (found) document.title = `${found.title || found.name} - MovieZone`;
        }
      } catch(err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovieData();
  }, [targetId]);

  useEffect(() => {
    if (!targetId || !movie) return;
    
    const fetchEpisodeSources = async () => {
       const isSeries = movie.subjectType === 2;
       const sourcesRes = await fetchSources(targetId, isSeries ? selectedSeason : 0, isSeries ? selectedEpisode : 0);
       setSources(sourcesRes || []);
    };
    fetchEpisodeSources();
  }, [targetId, movie, selectedSeason, selectedEpisode]);

  if (loading) return <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>Loading...</div>;
  if (!movie) return <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>Movie not found</div>;

  return (
    <div className="movie-details-page" style={{ color: 'white', paddingBottom: '80px', minHeight: '100vh', background: '#0f0f0f' }}>
      <div 
        className="backdrop" 
        style={{ 
          height: '50vh', 
          backgroundImage: `url(${getImageUrl(movie.stills?.url || movie.thumbnail || movie.cover?.url || movie.backdrop_path)})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          position: 'relative',
          backgroundColor: '#1a1a1a'
        }}
      >
        {movie.trailer?.url && (
          <video 
            src={movie.trailer.url} 
            autoPlay 
            muted 
            loop 
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
          />
        )}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
            <div 
              style={{ background: 'rgba(0,0,0,0.5)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(5px)' }}
              onClick={() => navigate(-1)}
            >
              <ArrowLeft color="white" size={24} />
            </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', background: 'linear-gradient(to top, #0f0f0f 10%, transparent)' }}></div>
      </div>
      
      <div className="details-content" style={{ padding: '0 20px', marginTop: '-60px', position: 'relative', zIndex: 10 }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '10px', fontWeight: '800', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{movie.title || movie.name}</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#aaa', marginBottom: '20px', fontSize: '0.9rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ffb400', fontWeight: 'bold' }}>
            <Star size={16} fill="#ffb400" /> {(movie.score || movie.vote_average || 0).toFixed(1)}
          </span>
          <span>{movie.year || movie.release_date?.split('-')[0] || (movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '')}</span>
          {(movie.high_quality || movie.quality === '4k') && (
            <span style={{ background: 'var(--primary-red)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', color: 'white', fontWeight: 'bold' }}>4K HDR</span>
          )}
          <span>{movie.duration || (movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : '')}</span>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
          <button 
            onClick={() => {
              const base = `/player/${targetId}`;
              const isSeries = movie.subjectType === 2;
              if (isSeries) {
                navigate(`${base}?season=${selectedSeason}&episode=${selectedEpisode}`);
              } else {
                navigate(base);
              }
            }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'white', color: 'black', padding: '14px', borderRadius: '30px', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(255,255,255,0.2)' }}
          >
            <Play size={20} fill="black" /> {movie.subjectType === 2 ? `Play S${selectedSeason} E${selectedEpisode}` : 'Play'}
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => {
                if (sources.length > 0) {
                  const isSeries = movie.subjectType === 2;
                  // Pick best quality available (highest resolution)
                  const best = sources.reduce((a, b) => (Number(b.quality) > Number(a.quality) ? b : a), sources[0]);
                  addDownload({ 
                    id: targetId, 
                    title: movie.title || movie.name, 
                    imgUrl: getImageUrl(movie.poster_path || movie.thumbnail),
                    size: best.size || '',
                    season: isSeries ? selectedSeason : null,
                    episode: isSeries ? selectedEpisode : null
                  });
                  const a = document.createElement('a');
                  a.href = best.downloadUrl;
                  a.download = '';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                } else {
                  alert('No download links found for this title');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#222', color: 'white', width: '50px', borderRadius: '15px', border: 'none', cursor: 'pointer' }}>
              <Download size={20} />
            </button>
            <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#222', color: 'white', width: '50px', borderRadius: '15px', border: 'none', cursor: 'pointer' }}>
              <Plus size={20} />
            </button>
          </div>
        </div>

        <p style={{ lineHeight: '1.6', color: '#ccc', fontSize: '0.95rem', marginBottom: '30px' }}>{movie.introduction || movie.overview || movie.description}</p>
        
        {/* Series Section */}
        {seasonsData.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
             <h3 style={{ marginBottom: '15px', fontSize: '1.2rem' }}>Episodes</h3>
             
             {/* Season Selector */}
             {seasonsData.length > 1 && (
               <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '15px', marginBottom: '15px', scrollbarWidth: 'none' }}>
                 {seasonsData.map(s => (
                   <button 
                    key={s.se}
                    onClick={() => {
                      setSelectedSeason(s.se);
                      setSelectedEpisode(1);
                    }}
                    style={{ 
                      padding: '8px 20px', 
                      borderRadius: '20px', 
                      border: 'none', 
                      backgroundColor: selectedSeason === s.se ? 'var(--primary-red)' : '#222',
                      color: 'white',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                   >
                     Season {s.se}
                   </button>
                 ))}
               </div>
             )}

             {/* Episode Grid */}
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '10px' }}>
                {Array.from({ length: (seasonsData.find(s => s.se === selectedSeason)?.maxEp || 0) }, (_, i) => i + 1).map(ep => (
                  <button 
                    key={ep}
                    onClick={() => setSelectedEpisode(ep)}
                    style={{ 
                      height: '60px', 
                      borderRadius: '12px', 
                      border: 'none', 
                      backgroundColor: selectedEpisode === ep ? 'var(--primary-red)' : '#222',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    {ep}
                  </button>
                ))}
             </div>
          </div>
        )}
        
        <div style={{ marginTop: '30px' }}>
           <h3 style={{ marginBottom: '15px', fontSize: '1.2rem' }}>Cast</h3>
           <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' }}>
             {movie.starring ? movie.starring.split(',').map((name, idx) => (
                <div key={idx} style={{ textAlign: 'center', minWidth: '80px' }}>
                  <div style={{ 
                    width: '70px', 
                    height: '70px', 
                    borderRadius: '50%', 
                    background: 'var(--surface-color-light)', 
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: 'var(--primary-red)',
                    margin: '0 auto'
                  }}>
                    {name.trim().charAt(0)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: 4 }}>{name.trim()}</div>
                </div>
             )) : (
               <p style={{ color: '#666', fontSize: '0.9rem' }}>Cast information unavailable</p>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;
