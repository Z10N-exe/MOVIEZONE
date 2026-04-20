// Stream integration test
// Run: node test_stream.js
// Tests the full pipeline: sources -> stream -> download

const API = 'https://moviezone-api.onrender.com/api';
const TEST_MOVIE = '8906247916759695608'; // Avatar
const TEST_SERIES = '9028867555875774472'; // Wednesday
const TIMEOUT = 30000;

import https from 'https';
import http from 'http';

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000,
    };
    const req = lib.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: { get: (h) => res.headers[h.toLowerCase()] },
          json: () => JSON.parse(body.toString()),
          arrayBuffer: () => body.buffer,
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
    req.end();
  });
}

async function test(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    const result = await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT))
    ]);
    console.log(`✅ PASS${result ? ` — ${result}` : ''}`);
    return true;
  } catch (e) {
    console.log(`❌ FAIL — ${e.message}`);
    return false;
  }
}

async function run() {
  console.log(`\n🎬 MovieZone Stream Integration Test`);
  console.log(`API: ${API}\n`);

  let passed = 0, failed = 0;

  // 1. Trending
  const t1 = await test('GET /api/trending', async () => {
    const r = await fetch(`${API}/trending`);
    const j = await r.json();
    if (!j.data?.items?.length) throw new Error('No items');
    return `${j.data.items.length} items`;
  });
  t1 ? passed++ : failed++;

  // 2. Search
  const t2 = await test('GET /api/search/avatar', async () => {
    const r = await fetch(`${API}/search/avatar`);
    const j = await r.json();
    if (!j.data?.items?.length) throw new Error('No results');
    return `"${j.data.items[0].title}"`;
  });
  t2 ? passed++ : failed++;

  // 3. Movie info
  const t3 = await test(`GET /api/info/${TEST_MOVIE}`, async () => {
    const r = await fetch(`${API}/info/${TEST_MOVIE}`);
    const j = await r.json();
    if (!j.data?.subject?.title) throw new Error('No title');
    return j.data.subject.title;
  });
  t3 ? passed++ : failed++;

  // 4. Movie sources
  let movieSources = [];
  const t4 = await test(`GET /api/sources/${TEST_MOVIE}`, async () => {
    const r = await fetch(`${API}/sources/${TEST_MOVIE}`);
    const j = await r.json();
    if (!j.data?.processedSources?.length) throw new Error('No sources');
    movieSources = j.data.processedSources;
    return `${movieSources.length} qualities: ${movieSources.map(s => s.quality + 'p').join(', ')}`;
  });
  t4 ? passed++ : failed++;

  // 5. Series sources
  const t5 = await test(`GET /api/sources/${TEST_SERIES}?season=1&episode=1`, async () => {
    const r = await fetch(`${API}/sources/${TEST_SERIES}?season=1&episode=1`);
    const j = await r.json();
    if (!j.data?.processedSources?.length) throw new Error('No sources');
    return `${j.data.processedSources.length} qualities`;
  });
  t5 ? passed++ : failed++;

  // 6. Stream URL — should redirect to CDN (302) or return video directly
  if (movieSources.length > 0) {
    const streamUrl = movieSources[0].streamUrl;
    const t6 = await test(`Stream URL (${movieSources[0].quality}p) — expect 200/206/302`, async () => {
      if (!streamUrl) throw new Error('No streamUrl');
      const r = await fetch(streamUrl, { method: 'HEAD' });
      if (![200, 206, 302, 301].includes(r.status)) throw new Error(`HTTP ${r.status}`);
      return `HTTP ${r.status} ${r.headers.get('content-type') || r.headers.get('location')?.substring(0,60) || ''}`;
    });
    t6 ? passed++ : failed++;

    // 7. Follow redirect and get video bytes
    const t7 = await test(`Stream bytes (follow redirect, range 0-1023)`, async () => {
      if (!streamUrl) throw new Error('No streamUrl');
      // First get the redirect location
      const r1 = await fetch(streamUrl, { method: 'HEAD' });
      const location = r1.headers.get('location');
      if (!location && r1.status !== 200) throw new Error(`No redirect, HTTP ${r1.status}`);
      const targetUrl = location || streamUrl;
      // Now fetch bytes from the CDN URL directly
      const r2 = await fetch(targetUrl, { headers: { 'Range': 'bytes=0-1023', 'User-Agent': 'okhttp/4.12.0', 'Referer': 'https://fmoviesunblocked.net/' } });
      if (![200, 206].includes(r2.status)) throw new Error(`CDN HTTP ${r2.status}`);
      return `${r2.status} — ${r2.headers.get('content-type')} (redirected to CDN ✓)`;
    });
    t7 ? passed++ : failed++;

    // 8. Download URL
    const downloadUrl = movieSources[0].downloadUrl;
    const t8 = await test(`Download URL reachable`, async () => {
      if (!downloadUrl) throw new Error('No downloadUrl');
      const r = await fetch(downloadUrl, { method: 'HEAD' });
      if (!r.ok && r.status !== 206) throw new Error(`HTTP ${r.status}`);
      return `${r.status}`;
    });
    t8 ? passed++ : failed++;
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 All tests passed! Streaming is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
  }
  console.log('');
}

run().catch(console.error);
