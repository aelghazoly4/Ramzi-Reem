// GET /api/settings?event=ramzi-reem — إعدادات الدعوة اللي العميل غيّرها من لوحة التحكم (موعد الحفل + الفقرات)
import { getDb } from './_lib/db.js';
import { handler, eventId } from './_lib/http.js';

export default handler(['GET'], async (req, res) => {
  const event = eventId(req.query.event);
  const db = await getDb();
  const doc = await db.collection('settings').findOne({ event }, { projection: { _id: 0, eventDate: 1, details: 1, updatedAt: 1 } });
  res.status(200).json(doc || {});
});
