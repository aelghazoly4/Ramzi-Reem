// GET    /api/admin/wishes?event=ramzi-reem   — كل التهاني (من غير ملفات الصوت)
// DELETE /api/admin/wishes?id=<wishId>        — حذف تهنئة (وتسجيلها الصوتي لو موجود)
import { ObjectId } from 'mongodb';
import { getDb } from '../_lib/db.js';
import { handler, eventId, requireAdmin, HttpError } from '../_lib/http.js';

export default handler(['GET', 'DELETE'], async (req, res) => {
  requireAdmin(req);
  const db = await getDb();
  const wishes = db.collection('wishes');

  if (req.method === 'DELETE') {
    if (!ObjectId.isValid(String(req.query.id))) throw new HttpError(400, 'Invalid id');
    const _id = new ObjectId(String(req.query.id));
    const wish = await wishes.findOneAndDelete({ _id });
    if (!wish) throw new HttpError(404, 'Not found');
    if (wish.audioId) await db.collection('audios').deleteOne({ _id: wish.audioId });
    return res.status(200).json({ ok: true });
  }

  const event = eventId(req.query.event);
  const list = await wishes
    .find({ event }, { projection: { vid: 0 } })
    .sort({ createdAt: -1 })
    .limit(1000)
    .toArray();

  res.status(200).json({
    wishes: list.map(w => ({
      id: w._id,
      name: w.name,
      kind: w.kind,
      text: w.text,
      audioId: w.audioId,
      duration: w.duration,
      device: w.device,
      country: w.country,
      createdAt: w.createdAt,
    })),
  });
});
