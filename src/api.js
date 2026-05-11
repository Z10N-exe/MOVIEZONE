const API = 'https://moviezone-end.scorezone.workers.dev';

const normalizeMovie = (m) => ({
  id: String(m.subjectId || m.id || ''),
  title: m.title || m.name || '',
  name: m.title || m.name || '',
  thumbnail: m.thumbnail || m.cover?.url || m.poster_url || '',
  slug: m.slug || '',
  badge: m.badge || '',
  subjectType: m.subjectType || 1,
  score: parseFloat(m.imdbRatingValue || m.score) || 0,
  releaseDate: m.releaseDate || m.release_date || '',
  year: m.year || (m.releaseDate ? new Date(m.releaseDate).getFullYear() : '') || (m.release_date ? new Date(m.release_date).getFullYear() : ''),
  genre: m.genre || '',
});

export const getImageUrl = (path, size = 'w342') => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const slugify = (text) => {
  if (!text) return 'movie';
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
};

export const fetchSearch = async (query) => {
  try {
    const res = await fetch(`${API}/api/search/${encodeURIComponent(query)}`);
    const json = await res.json();
    return (json.data?.items || []).map(normalizeMovie);
  } catch (e) { console.error(e); return []; }
};

// Returns { sections: [{title, movies}], trending: [movie] }
export const fetchHomepage = async () => {
  try {
    const res = await fetch(`${API}/api/homepage`);
    const json = await res.json();
    const ops = json.data?.operatingList || [];

    const sectionSubjects = (s) => {
      const items = s.subjects?.length ? s.subjects
        : s.banner?.items?.length ? s.banner.items
        : [];
      return items.map(normalizeMovie).filter(m => m.id && m.thumbnail);
    };

    const sections = ops
      .map(s => ({ title: s.title, movies: sectionSubjects(s) }))
      .filter(s => s.movies.length > 0 && !s.title.startsWith('Banner') && s.title !== 'Categories');

    const seen = new Set();
    const trending = sections
      .flatMap(s => s.movies)
      .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
      .slice(0, 40);

    return { sections, trending };
  } catch (e) { console.error(e); return { sections: [], trending: [] }; }
};

export const fetchTrending = async () => {
  const { trending } = await fetchHomepage();
  return trending;
};

export const fetchGenre = async (genre) => {
  try {
    const res = await fetch(`${API}/api/search/${encodeURIComponent(genre)}`);
    const json = await res.json();
    return (json.data?.items || []).map(normalizeMovie);
  } catch (e) { console.error(e); return []; }
};

// fetchInfo expects: { subject: { movieboxId, title, subjectType, ... }, resource: { seasons } }
// /api/info/{subjectId} returns exactly that under json.data
export const fetchInfo = async (movieId, titleHint = '', yearHint = '') => {
  try {
    // Try direct info fetch first
    const res = await fetch(`${API}/api/info/${movieId}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data?.subject) return json.data;
    }

    // Fall back to searching by title hint, then fetch info by subjectId
    const query = titleHint || movieId;
    const results = await fetchSearch(query);
    if (results.length) {
      const match = results.find(r => r.title?.toLowerCase().includes((titleHint || '').toLowerCase())) || results[0];
      const res2 = await fetch(`${API}/api/info/${match.id}`);
      if (res2.ok) {
        const json2 = await res2.json();
        if (json2.data?.subject) return json2.data;
      }
    }
    return null;
  } catch (e) { console.error(e); return null; }
};

// fetchSources expects array of: { quality, streamUrl, directUrl, downloadUrl, size, format }
// /api/sources/{subjectId}?season=X&episode=Y returns processedSources with that exact shape
export const fetchSources = async (movieId, season = 0, episode = 0, titleHint = '', yearHint = '') => {
  try {
    let subjectId = movieId;

    // If movieId doesn't look numeric, search for it first
    if (isNaN(Number(subjectId)) && titleHint) {
      const results = await fetchSearch(titleHint);
      if (results.length) subjectId = results[0].id;
    }

    const params = new URLSearchParams();
    if (season > 0) params.set('season', season);
    if (episode > 0) params.set('episode', episode);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${API}/api/sources/${subjectId}${qs}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.processedSources || [];
  } catch (e) { console.error(e); return []; }
};

export const resolveMovieBoxId = async (id, titleHint = '') => {
  if (!id) return null;
  if (titleHint?.trim()) {
    const res = await fetchSearch(titleHint.trim());
    if (res?.length) return res[0].id;
  }
  return String(id);
};

// --- AUTH stubs ---
export const loginUser = async () => ({ status: 'error', message: 'Login not available' });
export const signupUser = async () => ({ status: 'error', message: 'Signup not available' });

// --- Stubs for admin/ads/settings ---
export const fetchAds = async () => ({ status: 'success', data: [] });
export const fetchAdminStats = async () => ({ status: 'error', data: null });
export const fetchAdminUsers = async () => ({ status: 'error', data: [] });
export const saveAd = async () => ({ status: 'error' });
export const deleteAd = async () => ({ status: 'error' });
export const updateUserStatus = async () => ({ status: 'error' });
export const fetchAdminContent = async () => ({ status: 'error', data: [] });
export const fetchSettingsPublic = async () => ({ status: 'success', data: { maintenanceMode: false, siteName: 'MovieZone' } });
export const saveFeaturedContent = async () => ({ status: 'error' });
export const deleteFeaturedContent = async () => ({ status: 'error' });
export const fetchSettings = async () => ({ status: 'error', data: {} });
export const saveSettings = async () => ({ status: 'error' });

export const tmdbApi = {
  getTrending: fetchTrending,
  getMovieDetails: async (id) => {
    const movies = await fetchTrending();
    return movies.find(m => m.id?.toString() === id?.toString());
  },
};
