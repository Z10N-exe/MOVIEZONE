import React from 'react';
import { Search, Play, Trash2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './AppContext';
import { slugify } from './api';

export default function Downloads() {
  const { downloads, removeDownload } = useAppContext();
  const navigate = useNavigate();

  return (
    <div className="page-container" style={{ padding: '24px 20px', paddingBottom: 100 }}>
      {/* Header */}
      <div className="header">
        <div className="header-title">
          <img src="/logo.png" style={{ height: 28, width: 28, objectFit: 'contain', marginRight: 8 }} alt="M" /> Download
        </div>
        <Search className="icon" />
      </div>

      <div style={{ marginTop: 24 }}>
        {downloads.length === 0 ? (
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 100 }}>
             <div style={{ width: 120, height: 120, backgroundColor: 'var(--surface-color-light)', borderRadius: '50%', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={60} color="var(--primary-red)" />
             </div>
             <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-red)', marginBottom: 12 }}>No Downloads</h2>
             <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '0 20px' }}>
                Movies and series you download will appear here.
             </p>
           </div>
        ) : (
          downloads.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'center' }}>
              <div style={{ width: 140, height: 100, borderRadius: 12, backgroundImage: `url(${item.imgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                <div onClick={() => navigate(`/player/${slugify(item.title)}`)} style={{ cursor: 'pointer', position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12 }}>
                  <Play fill="#fff" size={32} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.2 }}>{item.title}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {item.season && item.episode && `${String(item.season).padStart(2, '0')}x${String(item.episode).padStart(2, '0')} • `}
                  {item.duration} • {item.size}
                </p>
              </div>
              <Trash2 onClick={() => removeDownload(item.id)} style={{ cursor: 'pointer' }} color="var(--primary-red)" size={24} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
