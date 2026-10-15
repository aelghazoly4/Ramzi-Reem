// التحقق من إعدادات الدعوة (الموعد + فقرات الحفل)
import { HttpError, str } from './http.js';

export const ICON_KEYS = ['car', 'dress', 'plate', 'cake', 'camera'];

export function cleanSettings(b) {
  const out = {};

  if (b.eventDate !== undefined) {
    const d = new Date(String(b.eventDate));
    if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid date');
    const y = d.getUTCFullYear();
    if (y < 2024 || y > 2100) throw new HttpError(400, 'Date out of range');
    out.eventDate = d.toISOString();
  }

  if (b.details !== undefined) {
    if (!Array.isArray(b.details) || b.details.length > 8) throw new HttpError(400, 'Invalid details');
    out.details = b.details.map(x => {
      const icon = ICON_KEYS.includes(x?.icon) ? x.icon : 'car';
      const label = str(x?.label, 30);
      const time = str(x?.time, 15);
      if (!label || !time) throw new HttpError(400, 'Each item needs a label and a time');
      return { icon, label, time };
    });
  }

  return out;
}
