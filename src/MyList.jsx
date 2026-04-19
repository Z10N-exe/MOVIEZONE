import React from 'react';
import { Search, Play, Trash2, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './AppContext';

export default function MyList() {
  const { myList, removeFromMyList } = useAppContext();
  const navigate = useNavigate();

  return (
    <div className="page-container" style={{ padding: '24px 20px', paddingBottom: 100 }}>
      {/* Header */}
      <div className="header">
        <div className="header-title">
          <img src="/logo.png" style={{ height: 28, width: 28, objectFit: 'contain', marginRight: 8 }} alt="M" /> My List
        </div>
        <Search className="icon" />
      </div>

      {myList.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 100 }}>
          {/* Mock empty state icon */}
          <div style={{ width: 120, height: 120, backgroundColor: 'var(--surface-color-light)', borderRadius: '50%', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <List size={60} color="var(--primary-red)" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-red)', marginBottom: 12 }}>Your List is Empty</h2>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '0 20px' }}>
            It seems that you haven't added any movies to the list
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          {myList.map(movie => (
            <div key={movie.id} style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'center' }}>
              <div style={{ width: 140, height: 100, borderRadius: 12, backgroundImage: `url(${movie.imgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                <div onClick={() => navigate(`/movie/${slugify(movie.title || movie.name)}`)} style={{ cursor: 'pointer', position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12 }}>
                  <Play fill="#fff" size={32} />
                </div>
              </div>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/movie/${slugify(movie.title || movie.name)}`)}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.2 }}>{movie.title}</h3>
              </div>
              <Trash2 onClick={() => removeFromMyList(movie.id)} style={{ cursor: 'pointer' }} color="var(--primary-red)" size={24} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
