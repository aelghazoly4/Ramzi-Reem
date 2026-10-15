// POST /api/rsvp  — تأكيد الحضور (سأحضر / أعتذر). رد واحد لكل زائر، ولو غيّر رأيه بيتحدّث.
import { getDb } from './_lib/db.js';
import { handler, body, str, eventId, clientMeta, HttpError, VID_RE } from './_lib/http.js';

export default handler(['POST'], async (req, res) => {
  const b = body(req);
  const event = eventId(b.event);
  const vid = str(b.vid, 64);
  const name = str(b.name, 40);
  if (!VID_RE.test(vid)) throw new HttpError(400, 'Invalid visitor id');
  if (!name) throw new HttpError(400, 'Name is required');
  if (typeof b.attending !== 'boolean') throw new HttpError(400, 'attending must be true or false');

  const db = await getDb();
  const now = new Date();
  await db.collection('rsvps').updateOne(
    { event, vid },
    {
      $set: { name, attending: b.attending, ...clientMeta(req), updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  res.status(200).json({ ok: true });
});
