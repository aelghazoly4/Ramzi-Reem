// PUT /api/admin/settings  — تعديل موعد الحفل وفقرات الحفل من لوحة التحكم (محمية بـ ADMIN_KEY)
import { getDb } from '../_lib/db.js';
import { handler, body, eventId, requireAdmin } from '../_lib/http.js';
import { cleanSettings } from '../_lib/settings.js';

export default handler(['PUT'], async (req, res) => {
  requireAdmin(req);
  const b = body(req);
  const event = eventId(b.event);
  const data = cleanSettings(b);
  const db = await getDb();
  await db.collection('settings').updateOne(
    { event },
    { $set: { ...data, updatedAt: new Date() }, $setOnInsert: { event } },
    { upsert: true },
  );
  const doc = await db.collection('settings').findOne({ event }, { projection: { _id: 0 } });
  res.status(200).json({ ok: true, settings: doc });
});
