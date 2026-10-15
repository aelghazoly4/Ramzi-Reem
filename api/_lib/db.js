// اتصال MongoDB مشترك بين كل الـ functions (بيتعمل مرة واحدة لكل cold start)
import { MongoClient } from 'mongodb';

const cache = globalThis.__weddingMongo || (globalThis.__weddingMongo = { promise: null, indexed: false });

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw Object.assign(new Error('MONGODB_URI is not set'), { status: 500 });

  if (!cache.promise) {
    cache.promise = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 })
      .connect()
      .catch(err => { cache.promise = null; throw err; });
  }
  const client = await cache.promise;
  const db = client.db(process.env.MONGODB_DB || 'wedding');

  if (!cache.indexed) {
    cache.indexed = true;
    ensureIndexes(db).catch(() => { cache.indexed = false; });
  }
  return db;
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection('events').createIndexes([
      { key: { event: 1, type: 1, createdAt: -1 } },
      { key: { event: 1, vid: 1 } },
      { key: { event: 1, guest: 1 } },
    ]),
    db.collection('wishes').createIndexes([
      { key: { event: 1, createdAt: -1 } },
      { key: { vid: 1, createdAt: -1 } },
    ]),
    db.collection('rsvps').createIndexes([
      { key: { event: 1, vid: 1 }, unique: true },
      { key: { event: 1, updatedAt: -1 } },
    ]),
  ]);
}
