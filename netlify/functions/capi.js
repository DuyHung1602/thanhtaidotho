/*
 * ═══════════════════════════════════════════════════════════════
 * NETLIFY FUNCTION — Meta Conversions API (CAPI)
 * ───────────────────────────────────────────────────────────────
 * File này nằm ở: netlify/functions/capi.js
 *
 * Cần 2 biến môi trường trong Netlify (Site config → Env variables):
 *   PIXEL_ID          = mã Pixel của bạn (dãy số)
 *   META_ACCESS_TOKEN = access token lấy từ Events Manager
 * ═══════════════════════════════════════════════════════════════
 */

const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const PIXEL_ID     = process.env.PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return { statusCode: 200, body: JSON.stringify({ status: 'not_configured' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) {}

  const eventId   = body.event_id   || ('ev_' + Date.now());
  const eventName = body.event_name || 'Lead';

  const payload = JSON.stringify({
    data: [{
      event_name:        eventName,
      event_time:        Math.floor(Date.now() / 1000),
      event_id:          eventId,
      action_source:     'website',
      event_source_url:  body.url || '',
      user_data: {
        client_ip_address: (event.headers['x-forwarded-for'] || '').split(',')[0].trim(),
        client_user_agent:  event.headers['user-agent'] || '',
      }
    }]
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'graph.facebook.com',
      path:     `/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: 200,
        body: JSON.stringify({ status: 'ok' })
      }));
    });

    req.on('error', () => {
      resolve({ statusCode: 200, body: JSON.stringify({ status: 'error' }) });
    });

    req.write(payload);
    req.end();
  });
};
