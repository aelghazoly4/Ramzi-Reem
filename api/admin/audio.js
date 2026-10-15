// GET /api/admin/audio?id=<audioId>  — تشغيل التهنئة الصوتية في لوحة التحكم
import { ObjectId } from 'mongodb';
import { getDb } from '../_lib/db.js';
import { handler, requireAdmin, HttpError } from '../_lib/http.js';

export default handler(['GET'], async (req, res) => {
  requireAdmin(req);
  if (!ObjectId.isValid(String(req.query.id))) throw new HttpError(400, 'Invalid id');
  const db = await getDb();
  const doc = await db.collection('audios').findOne({ _id: new ObjectId(String(req.query.id)) });
  if (!doc) throw new HttpError(404, 'Not found');

  const buf = Buffer.from(doc.data.buffer);
  res.setHeader('Content-Type', doc.mime || 'audio/webm');
  res.setHeader('Content-Length', buf.length);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.status(200).send(buf);
});
