const API_URL = import.meta.env.VITE_API_URL || 'https://moviezone-api.nwebeduzion.workers.dev/api';

export const getImageUrl = (path, size = 'w342') => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `https://image.tmdb.org/t/p/${size}${path}`;
};

// Resolve any id to a MovieBox id (18-digit).
// - Already a MovieBox id (15+ digits) → return as-is
// - Has a titleHint → search MovieBox by title directly (fastest path)
// - Short numeric with no hint → try /api/tmdb-resolve/:id
// - Slug → search by slug-converted title
export const resolveMovieBoxId = async (id, titleHint = '') => {
    if (!id) return null;
    const s = String(id);

    // Already a MovieBox id (15+ digits)
    if (/^\d{15,}$/.test(s)) return s;

    // If we have a title hint, search MovieBox directly — fastest and most reliable
    if (titleHint && titleHint.trim()) {
        const res = await fetchSearch(titleHint.trim());
        if (res?.length) return String(res[0].id);
    }

    // Short numeric = TMDB id, no title hint — try tmdb-resolve endpoint
    if (/^\d+$/.test(s)) {
        try {
            const r = await fetch(`${API_URL}/tmdb-resolve/${s}`);
            const j = await r.json();
            if (j.data?.movieboxId) return String(j.data.movieboxId);
        } catch {}
        return null;
    }

    // Slug / title string
    const query = s.replace(/-/g, ' ');
    const res = await fetchSearch(query);
    if (res?.length) return String(res[0].id);
    return null;
};

export const fetchTrending = async () => {
    try {
        const response = await fetch(`${API_URL}/trending`);
        const json = await response.json();
        return json.data?.items || [];
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const fetchSearch = async (query) => {
    try {
        const response = await fetch(`${API_URL}/search/${encodeURIComponent(query)}`);
        const json = await response.json();
        return json.data?.items || [];
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const fetchHomepage = async () => {
    try {
        const response = await fetch(`${API_URL}/homepage`);
        const json = await response.json();
        return json.data || {};
    } catch (e) {
        console.error(e);
        return {};
    }
};

export const fetchGenre = async (genre) => {
    try {
        const response = await fetch(`${API_URL}/genre/${encodeURIComponent(genre)}`);
        const json = await response.json();
        return json.data?.items || [];
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const fetchSources = async (movieId, season = 0, episode = 0, titleHint = '', yearHint = '') => {
    try {
        const url = new URL(`${API_URL}/sources/${movieId}`);
        if (season) url.searchParams.append('season', season);
        if (episode) url.searchParams.append('episode', episode);
        if (titleHint) url.searchParams.append('t', titleHint);
        if (yearHint) url.searchParams.append('y', yearHint);

        const response = await fetch(url);
        const json = await response.json();
        return json.data?.processedSources || [];
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const fetchInfo = async (movieId, titleHint = '', yearHint = '') => {
    try {
        const url = new URL(`${API_URL}/info/${movieId}`);
        if (titleHint) url.searchParams.append('t', titleHint);
        if (yearHint) url.searchParams.append('y', yearHint);
        const response = await fetch(url);
        const json = await response.json();
        return json.data || null;
    } catch (e) {
        console.error(e);
        return null;
    }
};

export const slugify = (text) => {
    if (!text) return 'movie';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w-]+/g, '')  // Remove all non-word chars
        .replace(/--+/g, '-');    // Replace multiple - with single -
};

// --- AUTH & ADMIN ---
const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const loginUser = async (credentials) => {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });
    return res.json();
};

export const signupUser = async (data) => {
    const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok && !json.status) {
        json.status = 'error';
        json.message = json.message || 'Signup failed. Please try again.';
    }
    return json;
};

export const fetchAds = async () => {
    const res = await fetch(`${API_URL}/ads`);
    return res.json();
};

export const fetchAdminStats = async () => {
    const res = await fetch(`${API_URL}/admin/stats`, { headers: getHeaders() });
    return res.json();
};

export const fetchAdminUsers = async () => {
    const res = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
    return res.json();
};

export const saveAd = async (adData) => {
    const res = await fetch(`${API_URL}/admin/ads`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(adData)
    });
    return res.json();
};

export const deleteAd = async (adId) => {
    const res = await fetch(`${API_URL}/admin/ads/${adId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    return res.json();
};

export const updateUserStatus = async (userId, data) => {
    const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    return res.json();
};

export const fetchAdminContent = async () => {
    const res = await fetch(`${API_URL}/admin/content`, { headers: getHeaders() });
    return res.json();
};

export const fetchSettingsPublic = async () => {
    const res = await fetch(`${API_URL}/settings`);
    return res.json();
};

export const saveFeaturedContent = async (movie) => {
    const res = await fetch(`${API_URL}/admin/content/featured`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(movie)
    });
    return res.json();
};

export const deleteFeaturedContent = async (id) => {
    const res = await fetch(`${API_URL}/admin/content/featured/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    return res.json();
};

export const fetchSettings = async () => {
    const res = await fetch(`${API_URL}/admin/settings`, { headers: getHeaders() });
    return res.json();
};

export const saveSettings = async (settings) => {
    const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(settings)
    });
    return res.json();
};

export const tmdbApi = {
    getTrending: fetchTrending,
    getMovieDetails: async (id) => {
        const movies = await fetchTrending();
        return movies.find(m => m.id.toString() === id.toString());
    }
};
