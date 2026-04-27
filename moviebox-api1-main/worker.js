// MovieZone Cloudflare Worker — Full API with streaming, auth, and admin
// Deploy: wrangler deploy
// KV namespace required: MOVIEZONE_KV (bind in wrangler.toml)

const SELECTED_HOST = "h5.aoneroom.com";
const HOST_URL = `https://${SELECTED_HOST}`;

const DEFAULT_HEADERS = {
    'X-Client-Info': '{"timezone":"Africa/Nairobi"}',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept': 'application/json',
    'User-Agent': 'okhttp/4.12.0',
    'Referer': HOST_URL,
    'Host': SELECTED_HOST,
    'Connection': 'keep-alive',
    'X-Forwarded-For': '1.1.1.1',
    'CF-Connecting-IP': '1.1.1.1',
    'X-Real-IP': '1.1.1.1'
};

const JWT_SECRET = 'moviezone_secret_cf_2024';

// ─── CORS ────────────────────────────────────────────────────────────────────
function cors(headers = {}) {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
        ...headers,
    };
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: cors({ 'Content-Type': 'application/json' }),
    });
}

// ─── SIMPLE JWT (no external lib) ────────────────────────────────────────────
function b64url(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signJWT(payload) {
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 604800 }));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
    return `${header}.${body}.${b64url(String.fromCharCode(...new Uint8Array(sig)))}`;
}

async function verifyJWT(token) {
    try {
        const [header, body, sig] = token.split('.');
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
        const valid = await crypto.subtle.verify('HMAC', key, Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)), new TextEncoder().encode(`${header}.${body}`));
        if (!valid) return null;
        const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch { return null; }
}

async function hashPassword(password) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + JWT_SECRET));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── KV HELPERS ──────────────────────────────────────────────────────────────
async function kvGet(kv, key) {
    try { return JSON.parse(await kv.get(key)); } catch { return null; }
}
async function kvSet(kv, key, value) {
    await kv.put(key, JSON.stringify(value));
}

// ─── MOVIEBOX API ─────────────────────────────────────────────────────────────
let cookieCache = null;
let cookieCacheTime = 0;

async function getCookies() {
    if (cookieCache && Date.now() - cookieCacheTime < 3600000) return cookieCache;
    try {
        const r = await fetch(`${HOST_URL}/wefeed-h5-bff/app/get-latest-app-pkgs?app_name=moviebox`, { headers: DEFAULT_HEADERS });
        const setCookies = r.headers.getSetCookie?.() || [];
        if (setCookies.length) {
            cookieCache = setCookies.map(c => c.split(';')[0].trim()).join('; ');
            cookieCacheTime = Date.now();
        }
    } catch {}
    return cookieCache;
}

async function apiRequest(url, options = {}) {
    const cookies = await getCookies();
    const headers = { ...DEFAULT_HEADERS, ...options.headers };
    if (cookies) headers['Cookie'] = cookies;
    return fetch(url, { ...options, headers });
}

function processResponse(data) {
    const d = data?.data || data;
    // Normalize subjectList → items
    if (d?.subjectList && !d.items) d.items = d.subjectList;
    if (d?.items) {
        d.items = d.items.map(i => ({
            ...i,
            id: i.subjectId || i.id,
            thumbnail: i.thumbnail || i.cover?.url || i.stills?.url || '',
        }));
    }
    return d;
}

// ─── ROUTE HANDLERS ──────────────────────────────────────────────────────────

async function handleTrending(url) {
    const u = new URL(url);
    const params = new URLSearchParams({ page: u.searchParams.get('page') || 0, perPage: 18, uid: '5591179548772780352' });
    const r = await apiRequest(`${HOST_URL}/wefeed-h5-bff/web/subject/trending?${params}`);
    const data = processResponse(await r.json());
    if (data.items) data.items = data.items.map(i => ({ ...i, id: i.subjectId || i.id, thumbnail: i.thumbnail || i.cover?.url || '' }));
    return json({ status: 'success', data });
}

async function handleSearch(query, url) {
    const u = new URL(url);
    const subjectType = parseInt(u.searchParams.get('type')) || 0;
    const genre = u.searchParams.get('genre'); // genre filter

    const r = await apiRequest(`${HOST_URL}/wefeed-h5-bff/web/subject/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: genre ? '' : query, page: 1, perPage: 24, subjectType }),
    });
    const data = processResponse(await r.json());
    if (data.items) {
        // If genre filter, filter by genre field instead of searching by name
        if (genre) {
            data.items = data.items.filter(i =>
                i.genre && i.genre.toLowerCase().split(',').map(g => g.trim()).includes(genre.toLowerCase())
            );
        }
        data.items = data.items.map(i => ({ ...i, id: i.subjectId || i.id, thumbnail: i.thumbnail || i.cover?.url || '' }));
    }
    return json({ status: 'success', data });
}

async function handleInfo(movieId) {
    const r = await apiRequest(`${HOST_URL}/wefeed-h5-bff/web/subject/detail?subjectId=${movieId}`);
    const data = processResponse(await r.json());
    if (data.subject?.cover?.url) data.subject.thumbnail = data.subject.cover.url;
    return json({ status: 'success', data });
}

async function handleHomepage() {
    const r = await apiRequest(`${HOST_URL}/wefeed-h5-bff/web/home`);
    const data = processResponse(await r.json());
    return json({ status: 'success', data });
}

async function handleSources(movieId, url, request) {
    const u = new URL(url);
    const season = u.searchParams.get('season') || 0;
    const episode = u.searchParams.get('episode') || 0;

    const infoR = await apiRequest(`${HOST_URL}/wefeed-h5-bff/web/subject/detail?subjectId=${movieId}`);
    const info = processResponse(await infoR.json());
    const detailPath = info?.subject?.detailPath;
    if (!detailPath) return json({ status: 'success', data: { downloads: [], processedSources: [] } });

    const dlParams = `subjectId=${movieId}${season ? `&se=${season}&ep=${episode}` : ''}`;
    const dlR = await apiRequest(`${HOST_URL}/wefeed-h5-bff/web/subject/download?${dlParams}`, {
        headers: { 'Referer': `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${detailPath}`, 'Origin': 'https://fmoviesunblocked.net' }
    });
    const dlData = processResponse(await dlR.json());
    if (!dlData?.downloads?.length) return json({ status: 'success', data: { downloads: [], processedSources: [] } });

    const title = info?.subject?.title || 'video';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    const base = `${proto}://${host}`;

    const processedSources = dlData.downloads.map(f => ({
        id: f.id,
        quality: Number(f.resolution) || f.resolution,
        directUrl: f.url,
        streamUrl: `${base}/api/stream?url=${encodeURIComponent(f.url)}`,
        downloadUrl: `${base}/api/download?url=${encodeURIComponent(f.url)}&title=${encodeURIComponent(title)}&quality=${f.resolution}${season > 0 ? `&season=${season}&episode=${episode}` : ''}`,
        size: f.size,
        format: 'mp4',
    }));

    return json({ status: 'success', data: { ...dlData, processedSources } });
}

async function handleStream(url, request) {
    const u = new URL(url);
    const streamUrl = u.searchParams.get('url');
    if (!streamUrl) return json({ status: 'error', message: 'No url param' }, 400);

    const range = request.headers.get('range');
    const headers = { 'User-Agent': 'okhttp/4.12.0', 'Referer': 'https://fmoviesunblocked.net/', 'Origin': 'https://fmoviesunblocked.net' };
    if (range) headers['Range'] = range;

    const upstream = await fetch(streamUrl, { headers });
    const responseHeaders = cors({
        'Content-Type': upstream.headers.get('content-type') || 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
    });
    if (upstream.headers.get('content-length')) responseHeaders['Content-Length'] = upstream.headers.get('content-length');
    if (upstream.headers.get('content-range')) responseHeaders['Content-Range'] = upstream.headers.get('content-range');

    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

async function handleDownload(url, request) {
    const u = new URL(url);
    const downloadUrl = u.searchParams.get('url');
    const title = u.searchParams.get('title') || 'video';
    const quality = u.searchParams.get('quality') || '';
    const season = u.searchParams.get('season');
    const episode = u.searchParams.get('episode');
    if (!downloadUrl) return json({ status: 'error', message: 'No url param' }, 400);

    let filename = title.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_');
    if (season && episode) filename += `_S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}`;
    if (quality) filename += `_${quality}p`;
    filename += '.mp4';

    const range = request.headers.get('range');
    const headers = { 'User-Agent': 'okhttp/4.12.0', 'Referer': 'https://fmoviesunblocked.net/', 'Origin': 'https://fmoviesunblocked.net' };
    if (range) headers['Range'] = range;

    const upstream = await fetch(downloadUrl, { headers });
    const responseHeaders = cors({
        'Content-Type': upstream.headers.get('content-type') || 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Accept-Ranges': 'bytes',
    });
    if (upstream.headers.get('content-length')) responseHeaders['Content-Length'] = upstream.headers.get('content-length');
    if (upstream.headers.get('content-range')) responseHeaders['Content-Range'] = upstream.headers.get('content-range');

    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

// ─── AUTH HANDLERS ────────────────────────────────────────────────────────────

async function handleSignup(request, kv) {
    const { name, email, password } = await request.json();
    if (!name || !email || !password) return json({ status: 'error', message: 'All fields required' }, 400);

    const existing = await kvGet(kv, `user:${email.toLowerCase()}`);
    if (existing) return json({ status: 'error', message: 'User already exists' }, 400);

    const userCount = (await kvGet(kv, 'user:count')) || 0;
    const id = crypto.randomUUID();
    const user = { id, name, email: email.toLowerCase(), password: await hashPassword(password), role: userCount === 0 ? 'admin' : 'user', isPremium: false, createdAt: new Date().toISOString() };

    await kvSet(kv, `user:${email.toLowerCase()}`, user);
    await kvSet(kv, `userid:${id}`, email.toLowerCase());
    await kvSet(kv, 'user:count', userCount + 1);

    const token = await signJWT({ id, role: user.role });
    return json({ status: 'success', token, user: { id, name, email: user.email, role: user.role, isPremium: false } });
}

async function handleLogin(request, kv) {
    const { email, password } = await request.json();
    if (!email || !password) return json({ status: 'error', message: 'Email and password required' }, 400);

    const user = await kvGet(kv, `user:${email.toLowerCase()}`);
    if (!user || user.password !== await hashPassword(password)) return json({ status: 'error', message: 'Invalid credentials' }, 401);

    const token = await signJWT({ id: user.id, role: user.role });
    return json({ status: 'success', token, user: { id: user.id, name: user.name, email: user.email, role: user.role, isPremium: user.isPremium } });
}

async function getAuthUser(request, kv) {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return null;
    const payload = await verifyJWT(auth.slice(7));
    if (!payload) return null;
    const email = await kvGet(kv, `userid:${payload.id}`);
    if (!email) return null;
    return kvGet(kv, `user:${email}`);
}

// ─── ADMIN HANDLERS ───────────────────────────────────────────────────────────

async function handleAdminStats(kv) {
    const count = (await kvGet(kv, 'user:count')) || 0;
    const ads = (await kvGet(kv, 'ads')) || [];
    return json({ status: 'success', data: { totalUsers: count, premiumUsers: 0, revenue: 0, activeAds: ads.filter(a => a.active).length, recentSignups: [] } });
}

async function handleAdminUsers(kv) {
    const count = (await kvGet(kv, 'user:count')) || 0;
    // KV doesn't support listing easily — return count info
    return json({ status: 'success', data: [], meta: { total: count } });
}

async function handleAdminAds(request, kv, method, adId) {
    const ads = (await kvGet(kv, 'ads')) || [];
    if (method === 'GET') return json({ status: 'success', data: ads });
    if (method === 'POST') {
        const body = await request.json();
        const ad = { ...body, id: crypto.randomUUID(), active: true };
        ads.push(ad);
        await kvSet(kv, 'ads', ads);
        return json({ status: 'success', data: ad });
    }
    if (method === 'DELETE' && adId) {
        const updated = ads.filter(a => a.id !== adId);
        await kvSet(kv, 'ads', updated);
        return json({ status: 'success', message: 'Deleted' });
    }
    return json({ status: 'error', message: 'Not found' }, 404);
}

async function handleAdminContent(request, kv, method, action, itemId) {
    const content = (await kvGet(kv, 'content')) || { featured: [] };
    if (method === 'GET') return json({ status: 'success', data: content });
    if (method === 'POST' && action === 'featured') {
        const movie = await request.json();
        if (!content.featured.find(f => f.id === movie.id)) content.featured.push(movie);
        await kvSet(kv, 'content', content);
        return json({ status: 'success', data: movie });
    }
    if (method === 'DELETE' && itemId) {
        content.featured = content.featured.filter(f => f.id !== itemId);
        await kvSet(kv, 'content', content);
        return json({ status: 'success', message: 'Removed' });
    }
    return json({ status: 'error', message: 'Not found' }, 404);
}

async function handleAdminSettings(request, kv, method) {
    const settings = (await kvGet(kv, 'settings')) || { siteName: 'MovieZone', maintenanceMode: false, premiumPrice: 1000 };
    if (method === 'GET') return json({ status: 'success', data: settings });
    if (method === 'POST') {
        const body = await request.json();
        const updated = { ...settings, ...body };
        await kvSet(kv, 'settings', updated);
        return json({ status: 'success', data: updated });
    }
    return json({ status: 'error', message: 'Not found' }, 404);
}

// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;
        const kv = env.MOVIEZONE_KV;

        if (method === 'OPTIONS') return new Response(null, { headers: cors() });

        try {
            // Public movie endpoints
            if (path === '/api/trending') return handleTrending(request.url);
            if (path === '/api/homepage') return handleHomepage();
            if (path.startsWith('/api/search/')) return handleSearch(decodeURIComponent(path.split('/api/search/')[1]), request.url);
            // Genre browse: /api/genre/Action
            if (path.startsWith('/api/genre/')) {
                const genre = decodeURIComponent(path.split('/api/genre/')[1]);
                return handleSearch(genre, `${request.url}&genre=${encodeURIComponent(genre)}`);
            }
            if (path.startsWith('/api/info/')) return handleInfo(path.split('/api/info/')[1]);
            if (path.startsWith('/api/sources/')) return handleSources(path.split('/api/sources/')[1], request.url, request);
            if (path === '/api/stream') return handleStream(request.url, request);
            if (path === '/api/download') return handleDownload(request.url, request);

            // Public ads & settings
            if (path === '/api/ads') {
                const ads = ((await kvGet(kv, 'ads')) || []).filter(a => a.active);
                return json({ status: 'success', data: ads });
            }
            if (path === '/api/settings') {
                const s = (await kvGet(kv, 'settings')) || { siteName: 'MovieZone', maintenanceMode: false };
                return json({ status: 'success', data: { siteName: s.siteName, maintenanceMode: s.maintenanceMode } });
            }

            // Auth
            if (path === '/api/auth/signup' && method === 'POST') return handleSignup(request, kv);
            if (path === '/api/auth/login' && method === 'POST') return handleLogin(request, kv);
            if (path === '/api/auth/me') {
                const user = await getAuthUser(request, kv);
                if (!user) return json({ status: 'error', message: 'Unauthorized' }, 401);
                return json({ status: 'success', user: { id: user.id, name: user.name, email: user.email, role: user.role, isPremium: user.isPremium } });
            }

            // Admin (requires auth + admin role)
            if (path.startsWith('/api/admin/')) {
                const user = await getAuthUser(request, kv);
                if (!user) return json({ status: 'error', message: 'Unauthorized' }, 401);
                if (user.role !== 'admin') return json({ status: 'error', message: 'Forbidden' }, 403);

                if (path === '/api/admin/stats') return handleAdminStats(kv);
                if (path === '/api/admin/users') return handleAdminUsers(kv);
                if (path === '/api/admin/ads' || path.startsWith('/api/admin/ads/')) {
                    const adId = path.split('/api/admin/ads/')[1];
                    return handleAdminAds(request, kv, method, adId);
                }
                if (path === '/api/admin/content' || path.startsWith('/api/admin/content/')) {
                    const parts = path.split('/api/admin/content/');
                    const sub = parts[1] || '';
                    const action = sub.startsWith('featured') ? 'featured' : null;
                    const itemId = sub.startsWith('featured/') ? sub.split('featured/')[1] : null;
                    return handleAdminContent(request, kv, method, action, itemId);
                }
                if (path === '/api/admin/settings') return handleAdminSettings(request, kv, method);
            }

            return json({ status: 'error', message: 'Not found' }, 404);

        } catch (error) {
            console.error(error);
            return json({ status: 'error', message: error.message }, 500);
        }
    }
};
