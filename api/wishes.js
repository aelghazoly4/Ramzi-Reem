// POST /api/wishes  — استقبال تهنئة مكتوبة أو صوتية من الضيف
import { Binary } from 'mongodb';
import { getDb } from './_lib/db.js';
import { handler, body, str, eventId, clientMeta, HttpError, VID_RE } from './_lib/http.js';

const MAX_AUDIO_BYTES = 1.5 * 1024 * 1024;   // ~ دقيقة ونص صوت
const MAX_PER_10_MIN = 6;                     // حماية بسيطة من الإرسال المتكرر

export default handler(['POST'], async (req, res) => {
  const b = body(req);
  const event = eventId(b.event);
  const vid = str(b.vid, 64);
  const name = str(b.name, 40);
  if (!VID_RE.test(vid)) throw new HttpError(400, 'Invalid visitor id');
  if (!name) throw new HttpError(400, 'Name is required');

  let kind, text = null, audio = null;
  if (typeof b.audio === 'string' && b.audio) {
    const m = /^data:(audio\/[a-z0-9.+-]+)(?:;[^,]*)?;base64,([A-Za-z0-9+/=]+)$/i.exec(b.audio);
    if (!m) throw new HttpError(400, 'Invalid audio');
    const buf = Buffer.from(m[2], 'base64');
    if (!buf.length) throw new HttpError(400, 'Empty audio');
    if (buf.length > MAX_AUDIO_BYTES) throw new HttpError(413, 'Audio too large');
    kind = 'voice';
    audio = { data: new Binary(buf), mime: m[1].toLowerCase(), size: buf.length };
  } else {
    text = str(b.text, 400);
    if (!text) throw new HttpError(400, 'Text is required');
    kind = 'text';
  }

  const db = await getDb();
  const wishes = db.collection('wishes');

  const recent = await wishes.countDocuments({ vid, createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } });
  if (recent >= MAX_PER_10_MIN) throw new HttpError(429, 'Too many wishes, try again later');

  let audioId = null;
  if (audio) {
    const r = await db.collection('audios').insertOne({ event, ...audio, createdAt: new Date() });
    audioId = r.insertedId;
  }

  const duration = Number(b.duration);
  const r = await wishes.insertOne({
    event,
    vid,
    name,
    kind,
    text,
    audioId,
    audioMime: audio?.mime || null,
    duration: Number.isFinite(duration) && duration > 0 ? Math.min(Math.round(duration), 600) : null,
    ...clientMeta(req),
    createdAt: new Date(),
  });

  res.status(201).json({ ok: true, id: r.insertedId });
});
