// أدوات مشتركة: التحقق من المدخلات، صلاحية الأدمن، بيانات الجهاز والدولة
import { createHash, timingSafeEqual } from 'node:crypto';

export const EVENT_RE = /^[a-z0-9-]{1,40}$/;
export const VID_RE = /^[a-zA-Z0-9-]{8,64}$/;

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** يغلف الـ handler: يحدد الـ methods المسموحة ويرجع الأخطاء بشكل JSON موحد */
export function handler(methods, fn) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!methods.includes(req.method)) {
      res.setHeader('Allow', methods.join(', '));
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      await fn(req, res);
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.error(err);
      res.status(status).json({ error: status >= 500 ? 'Server error' : err.message });
    }
  };
}

export function body(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { throw new HttpError(400, 'Invalid JSON'); }
  }
  return req.body;
}

/** نص نظيف بطول محدد */
export function str(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

export function eventId(v) {
  const e = str(v, 40).toLowerCase();
  if (!EVENT_RE.test(e)) throw new HttpError(400, 'Invalid event id');
  return e;
}

/** حماية لوحة التحكم بكلمة سر ADMIN_KEY (مقارنة ثابتة الوقت) */
export function requireAdmin(req) {
  const expected = process.env.ADMIN_KEY;
  if (!expected) throw new HttpError(500, 'ADMIN_KEY is not set');
  const given = String(req.headers['x-admin-key'] || '');
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  if (!given || !timingSafeEqual(a, b)) throw new HttpError(401, 'Unauthorized');
}

export function clientMeta(req) {
  const ua = String(req.headers['user-agent'] || '');
  const device = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua) ? 'tablet'
    : /Mobi|iPhone|iPod|Android|BlackBerry|Opera Mini|IEMobile/i.test(ua) ? 'mobile' : 'desktop';
  const os = /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
    : /Android/i.test(ua) ? 'Android'
    : /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/i.test(ua) ? 'macOS'
    : /Linux/i.test(ua) ? 'Linux' : 'Other';
  let city = String(req.headers['x-vercel-ip-city'] || '');
  try { city = decodeURIComponent(city); } catch { /* keep raw */ }
  return {
    device,
    os,
    country: String(req.headers['x-vercel-ip-country'] || '').slice(0, 2).toUpperCase() || null,
    city: city.slice(0, 60) || null,
  };
}
