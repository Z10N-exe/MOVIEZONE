import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Film, 
  Settings, 
  TrendingUp, 
  Bell, 
  Plus, 
  Trash2, 
  ChevronRight,
  DollarSign,
  Monitor,
  Video,
  ExternalLink,
  Search,
  XCircle,
  Menu,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  fetchAdminStats, 
  fetchAdminUsers, 
  saveAd, 
  deleteAd, 
  fetchAds, 
  updateUserStatus, 
  fetchAdminContent, 
  saveFeaturedContent, 
  deleteFeaturedContent, 
  fetchSettings, 
  saveSettings,
  fetchSearch
} from './api';
import { useAppContext } from './AppContext';

const Admin = () => {
  const { user, logout } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [ads, setAds] = useState([]);
  const [content, setContent] = useState({ featured: [], categories: [] });
  const [settings, setSettings] = useState({ siteName: 'MovieZone', maintenanceMode: false, premiumPrice: 1000 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [newAd, setNewAd] = useState({ title: '', imageUrl: '', targetLink: '', displayTime: 0, type: 'banner', placement: 'homepage' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [statsRes, usersRes, adsRes, contentRes, settingsRes] = await Promise.allSettled([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAds(),
        fetchAdminContent(),
        fetchSettings(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.status === 'success') setStats(statsRes.value.data);
      if (usersRes.status === 'fulfilled' && usersRes.value?.status === 'success') setUsers(usersRes.value.data);
      if (adsRes.status === 'fulfilled' && adsRes.value?.status === 'success') setAds(adsRes.value.data);
      if (contentRes.status === 'fulfilled' && contentRes.value?.status === 'success') setContent(contentRes.value.data);
      if (settingsRes.status === 'fulfilled' && settingsRes.value?.status === 'success') setSettings(settingsRes.value.data);

      // Check if all failed — likely DB not connected
      const allFailed = [statsRes, usersRes].every(r => r.status === 'rejected' || r.value?.status === 'error');
      if (allFailed) setLoadError('Could not connect to database. Make sure MONGO_URI is set on Render.');
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAd = async (e) => {
    e.preventDefault();
    const res = await saveAd(newAd);
    if (res.status === 'success') {
      setAds([...ads, res.data]);
      setNewAd({ title: '', imageUrl: '', targetLink: '', displayTime: 0, type: 'banner', placement: 'homepage' });
    }
  };

  const handleDeleteAd = async (id) => {
    const res = await deleteAd(id);
    if (res.status === 'success') {
      setAds(ads.filter(a => (a._id || a.id) !== id));
    }
  };

  const handleTogglePremium = async (userId, currentStatus) => {
    const res = await updateUserStatus(userId, { isPremium: !currentStatus });
    if (res.status === 'success') {
      setUsers(users.map(u => (u._id || u.id) === userId ? { ...u, isPremium: !currentStatus } : u));
    }
  };

  if (!user || user.role !== 'admin') return null;
  if (loading) return <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Admin...</div>;
  if (loadError) return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20, textAlign: 'center' }}>
      <p style={{ color: '#ff4444', fontSize: 18 }}>⚠️ {loadError}</p>
      <button onClick={loadAllData} style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--primary-red)', border: 'none', color: '#fff', cursor: 'pointer' }}>Retry</button>
    </div>
  );

  return (
    <div className="admin-layout">
      {/* Mobile Header */}
      <div className="admin-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           <Menu size={24} color="white" onClick={() => setIsSidebarOpen(true)} style={{ cursor: 'pointer' }} />
           <span style={{ fontSize: '18px', fontWeight: 'bold' }}>MOVIEZONE ADM</span>
        </div>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(45deg, #FF3366, #FF9933)' }}></div>
      </div>

      {/* Overlay */}
      <div className={`admin-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      {/* Sidebar */}
      <div className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '0 24px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          <div style={{ backgroundColor: 'var(--primary-red)', padding: '8px', borderRadius: '8px' }}>
            <LayoutDashboard size={24} color="white" />
          </div>
          <img src="/logo.png" style={{ height: 32, width: 32, objectFit: 'contain', marginRight: 12 }} alt="Logo" />
          <span style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '1px' }}>MOVIEZONE ADM</span>
          
          <X 
            size={24} 
            color="#888" 
            style={{ position: 'absolute', right: '20px', cursor: 'pointer', display: 'block' }} 
            className="mobile-only-close"
            onClick={() => setIsSidebarOpen(false)}
          />
        </div>

        <nav style={{ flex: 1 }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'content', label: 'Content', icon: Film },
            { id: 'ads', label: 'Ads Manager', icon: Monitor },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(item => (
            <div 
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              style={{ 
                padding: '16px 24px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                cursor: 'pointer',
                backgroundColor: activeTab === item.id ? '#333' : 'transparent',
                borderLeft: activeTab === item.id ? '4px solid var(--primary-red)' : '4px solid transparent',
                color: activeTab === item.id ? 'white' : '#888',
                transition: '0.3s'
              }}
            >
              <item.icon size={20} />
              <span style={{ fontWeight: activeTab === item.id ? '600' : '400' }}>{item.label}</span>
            </div>
          ))}
        </nav>

        <div style={{ padding: '24px' }}>
           <button 
             onClick={logout}
             style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #444', background: 'transparent', color: '#888', cursor: 'pointer' }}
           >
             Exit Admin
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }} className="desktop-only-header">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', textTransform: 'capitalize' }}>{activeTab}</h1>
            <p style={{ color: '#888', marginTop: '4px' }}>Manage your streaming business effortlessly.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold' }}>{user.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--primary-red)' }}>Super Admin</div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(45deg, #FF3366, #FF9933)' }}></div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="dashboard-view">
            <div className="admin-grid-cols-2" style={{ marginBottom: '40px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px' }}>
                <StatCard label="Total Users" value={stats?.totalUsers || 0} delta="+12%" icon={Users} color="#6366f1" />
                <StatCard label="Premium Subs" value={stats?.premiumUsers || 0} delta="+5%" icon={DollarSign} color="#22c55e" />
                <StatCard label="Revenue" value={`₦${stats?.revenue || 0}`} delta="+18%" icon={TrendingUp} color="#f59e0b" />
                <StatCard label="Active Ads" value={stats?.activeAds || 0} delta="Stable" icon={Monitor} color="#ef4444" />
              </div>
            </div>

            <div className="admin-grid-dashboard">
              <div style={{ backgroundColor: '#141414', padding: '24px', borderRadius: '16px', border: '1px solid #333' }}>
                <h3 style={{ marginBottom: '20px' }}>Recent Signups</h3>
                <div className="admin-table-wrapper">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#888', borderBottom: '1px solid #333' }}>
                        <th style={{ padding: '12px 0' }}>User</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.recentSignups?.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ padding: '16px 0' }}>{u.name}</td>
                          <td style={{ color: '#888' }}>{u.email}</td>
                          <td><span style={{ fontSize: '10px', backgroundColor: u.isPremium ? '#065f46' : '#222', color: u.isPremium ? '#34d399' : '#888', padding: '4px 8px', borderRadius: '20px' }}>{u.isPremium ? 'Premium' : 'Free'}</span></td>
                          <td style={{ color: '#888' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ backgroundColor: '#141414', padding: '24px', borderRadius: '16px', border: '1px solid #333' }}>
                <h3 style={{ marginBottom: '20px' }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <ActionButton label="Send Global Push" icon={Bell} color="var(--primary-red)" />
                  <ActionButton label="Feature New Content" icon={Film} color="#2563eb" />
                  <ActionButton label="View Revenue Report" icon={TrendingUp} color="#16a34a" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-view">
             <div style={{ backgroundColor: '#141414', padding: '20px', borderRadius: '16px', border: '1px solid #333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexDirection: 'column', gap: '16px' }}>
                   <div style={{ display: 'flex', background: '#222', padding: '8px 16px', borderRadius: '8px', width: '100%', alignItems: 'center', gap: '10px' }}>
                     <Search size={18} color="#888" />
                     <input placeholder="Search users by email or name..." style={{ border: 'none', background: 'transparent', color: 'white', width: '100%', outline: 'none' }} />
                   </div>
                   <button className="button-primary" style={{ width: '100%', padding: '10px 20px' }}>+ Add User</button>
                </div>
                <div className="admin-table-wrapper">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ color: '#888', textAlign: 'left' }}>
                      <tr style={{ borderBottom: '1px solid #333' }}>
                        <th style={{ padding: '12px 10px' }}>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Subscription</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u._id || u.id} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ padding: '16px 10px' }}>{u.name}</td>
                          <td>{u.email}</td>
                          <td><span style={{ color: u.role === 'admin' ? 'var(--primary-red)' : '#fff' }}>{u.role}</span></td>
                          <td>{u.isPremium ? 'Premium (Active)' : 'Free Plan'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                               <button 
                                  onClick={() => handleTogglePremium(u._id || u.id, u.isPremium)}
                                  style={{ 
                                    color: u.isPremium ? '#f59e0b' : '#34d399', 
                                    background: 'none', 
                                    border: `1px solid ${u.isPremium ? '#f59e0b' : '#34d399'}`, 
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    cursor: 'pointer' 
                                  }}
                               >
                                 {u.isPremium ? 'Revoke' : 'PRO'}
                               </button>
                               <button style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="ads-view">
            <div className="admin-grid-cols-2">
              <div style={{ backgroundColor: '#141414', padding: '24px', borderRadius: '16px', border: '1px solid #333' }}>
                <h3 style={{ marginBottom: '24px' }}>Current Ads</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   {ads.map(ad => (
                      <div key={ad._id || ad.id} style={{ background: '#222', borderRadius: '12px', padding: '16px', display: 'flex', gap: '16px', position: 'relative' }}>
                         <div style={{ width: '60px', height: '60px', borderRadius: '4px', background: `url(${ad.imageUrl}) center/cover #333` }}></div>
                         <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold' }}>{ad.title}</div>
                            <div style={{ fontSize: '12px', color: '#888' }}>Type: {ad.type}</div>
                            <div style={{ fontSize: '12px', color: '#888' }}>{ad.placement} @ {ad.displayTime}s</div>
                         </div>
                         <Trash2 
                           size={18} 
                           color="#ef4444" 
                           style={{ cursor: 'pointer', position: 'absolute', top: '16px', right: '16px' }} 
                           onClick={() => handleDeleteAd(ad._id || ad.id)}
                         />
                      </div>
                   ))}
                </div>
              </div>

              <div style={{ backgroundColor: '#141414', padding: '24px', borderRadius: '16px', border: '1px solid #333' }}>
                <h3 style={{ marginBottom: '24px' }}>Create New Ad</h3>
                <form onSubmit={handleCreateAd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   <div>
                     <label style={{ display: 'block', fontSize: '14px', color: '#888', marginBottom: '8px' }}>Ad Title</label>
                     <input value={newAd.title} onChange={e => setNewAd({...newAd, title: e.target.value})} style={inputStyle} placeholder="Summer Sale" required />
                   </div>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '14px', color: '#888', marginBottom: '8px' }}>Type</label>
                        <select value={newAd.type} onChange={e => setNewAd({...newAd, type: e.target.value})} style={inputStyle}>
                          <option value="banner">Banner</option>
                          <option value="video">Video</option>
                          <option value="popup">Popup</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '14px', color: '#888', marginBottom: '8px' }}>Place</label>
                        <select value={newAd.placement} onChange={e => setNewAd({...newAd, placement: e.target.value})} style={inputStyle}>
                          <option value="homepage">Home</option>
                          <option value="player">Mid</option>
                          <option value="pre-roll">Pre</option>
                        </select>
                      </div>
                   </div>
                   <div>
                     <label style={{ display: 'block', fontSize: '14px', color: '#888', marginBottom: '8px' }}>Media URL</label>
                     <input value={newAd.imageUrl} onChange={e => setNewAd({...newAd, imageUrl: e.target.value})} style={inputStyle} placeholder="https://..." required />
                   </div>
                   <div>
                     <label style={{ display: 'block', fontSize: '14px', color: '#888', marginBottom: '8px' }}>Time (s)</label>
                     <input type="number" value={newAd.displayTime} onChange={e => setNewAd({...newAd, displayTime: parseInt(e.target.value)})} style={inputStyle} />
                   </div>
                   <button type="submit" className="button-primary" style={{ marginTop: '10px' }}>Deploy Ad</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="content-view">
            <div className="admin-grid-cols-2">
              <div style={{ backgroundColor: '#141414', padding: '24px', borderRadius: '16px', border: '1px solid #333' }}>
                <h3 style={{ marginBottom: '20px' }}>Current Featured</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                  {content.featured.map(movie => (
                    <div key={movie.id} style={{ position: 'relative' }}>
                       <img src={movie.thumbnail} style={{ width: '100%', borderRadius: '8px', aspectRatio: '2/3', objectFit: 'cover' }} alt={movie.title} />
                       <button 
                         onClick={async () => {
                           await deleteFeaturedContent(movie.id);
                           setContent({...content, featured: content.featured.filter(f => f.id !== movie.id)});
                         }}
                         style={{ position: 'absolute', top: '5px', right: '5px', backgroundColor: 'rgba(229, 9, 20, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}
                       >
                         ×
                       </button>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ backgroundColor: '#141414', padding: '24px', borderRadius: '16px', border: '1px solid #333' }}>
                <h3 style={{ marginBottom: '20px' }}>Add Content</h3>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <input 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={inputStyle} 
                  />
                  <button onClick={async () => {
                    const results = await fetchSearch(searchQuery);
                    setSearchResults(results);
                  }} className="button-primary" style={{ width: 'auto' }}>Go</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                  {searchResults.map(movie => (
                    <div key={movie.id} style={{ display: 'flex', gap: '12px', background: '#222', padding: '10px', borderRadius: '8px', alignItems: 'center' }}>
                      <img src={movie.thumbnail} style={{ width: '30px', height: '45px', borderRadius: '4px', objectFit: 'cover' }} alt="" />
                      <div style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.title || movie.name}</div>
                      <button 
                        onClick={async () => {
                          const res = await saveFeaturedContent(movie);
                          if (res.status === 'success') setContent({...content, featured: [...content.featured, movie]});
                        }}
                        style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--primary-red)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '10px' }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-view">
             <div style={{ maxWidth: '600px', backgroundColor: '#141414', padding: '40px', borderRadius: '16px', border: '1px solid #333' }}>
                <h3 style={{ marginBottom: '32px' }}>Platform Settings</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                   <div>
                     <label style={{ display: 'block', color: '#888', marginBottom: '8px' }}>Site Name</label>
                     <input value={settings.siteName} onChange={e => setSettings({...settings, siteName: e.target.value})} style={inputStyle} />
                   </div>
                   <div>
                     <label style={{ display: 'block', color: '#888', marginBottom: '8px' }}>Premium Monthly Price (₦)</label>
                     <input type="number" value={settings.premiumPrice} onChange={e => setSettings({...settings, premiumPrice: parseInt(e.target.value)})} style={inputStyle} />
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <input type="checkbox" checked={settings.maintenanceMode} onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})} />
                     <label>Maintenance Mode (Lock all access)</label>
                   </div>
                   <button 
                     onClick={async () => {
                       await saveSettings(settings);
                       alert('Settings saved successfully');
                     }} 
                     className="button-primary"
                   >
                     Update Settings
                   </button>
                </div>
             </div>
          </div>
        )}

        {(activeTab === 'notifications') && (
           <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.5 }}>
              <Settings size={64} style={{ marginBottom: '20px' }} />
              <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} module is coming soon in the next update.</h3>
           </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, delta, icon: Icon, color }) => (
  <div style={{ backgroundColor: '#141414', padding: '24px', borderRadius: '16px', border: '1px solid #333', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', backgroundColor: color, opacity: 0.1, borderRadius: '50%' }}></div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
      <div style={{ backgroundColor: '#222', padding: '10px', borderRadius: '10px' }}>
        <Icon size={24} color={color} />
      </div>
      <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 'bold' }}>{delta}</span>
    </div>
    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{value}</div>
    <div style={{ color: '#888', fontSize: '14px', marginTop: '4px' }}>{label}</div>
  </div>
);

const ActionButton = ({ label, icon: Icon, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', background: '#222', cursor: 'pointer', transition: '0.3s' }}>
    <Icon size={20} color={color} />
    <span style={{ fontWeight: '500' }}>{label}</span>
    <div style={{ flex: 1 }} />
    <ChevronRight size={16} color="#444" />
  </div>
);

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '8px',
  border: '1px solid #333',
  backgroundColor: '#222',
  color: 'white',
  outline: 'none',
  fontSize: '14px'
};

export default Admin;
