// POST /api/track  — تسجيل مشاهدة الدعوة (view) أو فتحها بزرار "افتح الدعوة" (open)
import { getDb } from './_lib/db.js';
import { handler, body, str, eventId, clientMeta, HttpError, VID_RE } from './_lib/http.js';

const TYPES = new Set(['view', 'open']);

export default handler(['POST'], async (req, res) => {
  const b = body(req);
  const type = str(b.type, 10);
  const vid = str(b.vid, 64);
  if (!TYPES.has(type)) throw new HttpError(400, 'Invalid type');
  if (!VID_RE.test(vid)) throw new HttpError(400, 'Invalid visitor id');

  const db = await getDb();
  await db.collection('events').insertOne({
    event: eventId(b.event),
    type,
    vid,
    guest: str(b.guest, 40) || null,
    referrer: str(b.referrer, 200) || null,
    ...clientMeta(req),
    createdAt: new Date(),
  });
  res.status(200).json({ ok: true });
});
