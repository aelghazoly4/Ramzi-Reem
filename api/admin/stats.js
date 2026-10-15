// GET /api/admin/stats?event=ramzi-reem  — إحصائيات لوحة التحكم (محمية بـ ADMIN_KEY)
import { getDb } from '../_lib/db.js';
import { handler, eventId, requireAdmin } from '../_lib/http.js';

const TZ = process.env.TZ_OFFSET || '+03:00';
const DAYS = 14;

export default handler(['GET'], async (req, res) => {
  requireAdmin(req);
  const event = eventId(req.query.event);
  const db = await getDb();

  const since = new Date(Date.now() - DAYS * 864e5);

  const uniq = type => [
    { $match: { type } },
    { $group: { _id: '$vid' } },
    { $count: 'n' },
  ];

  const [agg] = await db.collection('events').aggregate([
    { $match: { event } },
    {
      $facet: {
        counts: [{ $group: { _id: '$type', n: { $sum: 1 } } }],
        uniqueViews: uniq('view'),
        uniqueOpens: uniq('open'),
        daily: [
          { $match: { createdAt: { $gte: since } } },
          { $group: {
              _id: { d: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, t: '$type' },
              n: { $sum: 1 },
              v: { $addToSet: '$vid' },
          } },
          { $project: { _id: 0, date: '$_id.d', type: '$_id.t', n: 1, visitors: { $size: '$v' } } },
        ],
        devices: [
          { $match: { type: 'view' } },
          { $group: { _id: { vid: '$vid', device: '$device' } } },
          { $group: { _id: '$_id.device', n: { $sum: 1 } } },
          { $sort: { n: -1 } },
        ],
        countries: [
          { $match: { type: 'view', country: { $ne: null } } },
          { $group: { _id: { vid: '$vid', c: '$country' } } },
          { $group: { _id: '$_id.c', n: { $sum: 1 } } },
          { $sort: { n: -1 } },
          { $limit: 8 },
        ],
        guests: [
          { $match: { guest: { $ne: null } } },
          { $group: {
              _id: '$guest',
              views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
              opens: { $sum: { $cond: [{ $eq: ['$type', 'open'] }, 1, 0] } },
              lastSeen: { $max: '$createdAt' },
          } },
          { $sort: { lastSeen: -1 } },
          { $limit: 200 },
        ],
        recent: [
          { $sort: { createdAt: -1 } },
          { $limit: 15 },
          { $project: { _id: 0, type: 1, guest: 1, device: 1, os: 1, country: 1, city: 1, createdAt: 1 } },
        ],
      },
    },
  ]).toArray();

  const count = t => agg.counts.find(c => c._id === t)?.n || 0;

  // آخر 14 يوم بالترتيب حتى الأيام اللي مفيهاش زيارات
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: offsetToZone(TZ), year: 'numeric', month: '2-digit', day: '2-digit' });
  const days = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const key = fmt.format(d);
    const row = t => agg.daily.find(x => x.date === key && x.type === t);
    days.push({ date: key, views: row('view')?.n || 0, visitors: row('view')?.visitors || 0, opens: row('open')?.n || 0 });
  }

  const [wishCounts] = await db.collection('wishes').aggregate([
    { $match: { event } },
    { $group: { _id: null, text: { $sum: { $cond: [{ $eq: ['$kind', 'text'] }, 1, 0] } }, voice: { $sum: { $cond: [{ $eq: ['$kind', 'voice'] }, 1, 0] } } } },
  ]).toArray();

  res.status(200).json({
    totals: {
      views: count('view'),
      visitors: agg.uniqueViews[0]?.n || 0,
      opens: count('open'),
      openers: agg.uniqueOpens[0]?.n || 0,
      textWishes: wishCounts?.text || 0,
      voiceWishes: wishCounts?.voice || 0,
    },
    daily: days,
    devices: agg.devices.map(d => ({ key: d._id || 'unknown', n: d.n })),
    countries: agg.countries.map(c => ({ key: c._id, n: c.n })),
    guests: agg.guests.map(g => ({ name: g._id, views: g.views, opens: g.opens, lastSeen: g.lastSeen })),
    recent: agg.recent,
    generatedAt: new Date(),
  });
});

/** "+03:00" → "Etc/GMT-3" علشان Intl يفهم الإزاحة */
function offsetToZone(off) {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(off);
  if (!m || m[3] !== '00') return 'UTC';
  const h = Number(m[2]);
  return h === 0 ? 'UTC' : `Etc/GMT${m[1] === '+' ? '-' : '+'}${h}`;
}
