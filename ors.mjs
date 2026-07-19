const ALLOWED_HOST = 'api.openrouteservice.org';
const ALLOWED_PATHS = ['/geocode/', '/v2/', '/elevation/'];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function headersToObject(value) {
  if (!value) return {};
  if (Array.isArray(value)) return Object.fromEntries(value);
  if (typeof value === 'object') return value;
  return {};
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) {
      return json({
        error: 'Routing is not configured.',
        detail: 'Add ORS_API_KEY in the Vercel project environment variables and redeploy.'
      }, 503);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'Invalid JSON request body.' }, 400);
    }

    let target;
    try {
      target = new URL(String(payload.url || ''));
    } catch {
      return json({ error: 'Invalid OpenRouteService URL.' }, 400);
    }

    if (target.protocol !== 'https:' || target.hostname !== ALLOWED_HOST) {
      return json({ error: 'This proxy only permits OpenRouteService requests.' }, 403);
    }
    if (!ALLOWED_PATHS.some((prefix) => target.pathname.startsWith(prefix))) {
      return json({ error: 'Unsupported OpenRouteService endpoint.' }, 403);
    }

    const method = String(payload.method || 'GET').toUpperCase();
    if (!['GET', 'POST'].includes(method)) {
      return json({ error: 'Unsupported request method.' }, 405);
    }

    // Never trust or forward a browser-supplied API key.
    target.searchParams.delete('api_key');
    const incomingHeaders = headersToObject(payload.headers);
    const outgoingHeaders = new Headers();
    const accept = incomingHeaders.Accept || incomingHeaders.accept;
    const contentType = incomingHeaders['Content-Type'] || incomingHeaders['content-type'];
    if (accept) outgoingHeaders.set('Accept', String(accept));
    if (contentType) outgoingHeaders.set('Content-Type', String(contentType));

    if (target.pathname.startsWith('/geocode/')) {
      target.searchParams.set('api_key', apiKey);
    } else {
      outgoingHeaders.set('Authorization', apiKey);
    }

    try {
      const upstream = await fetch(target, {
        method,
        headers: outgoingHeaders,
        body: method === 'POST' && payload.body != null ? String(payload.body) : undefined,
        signal: request.signal
      });

      const responseHeaders = new Headers({
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      for (const name of ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']) {
        const value = upstream.headers.get(name);
        if (value) responseHeaders.set(name, value);
      }

      return new Response(await upstream.arrayBuffer(), {
        status: upstream.status,
        headers: responseHeaders
      });
    } catch (error) {
      return json({
        error: 'OpenRouteService request failed.',
        detail: error instanceof Error ? error.message : String(error)
      }, 502);
    }
  }
};
