/* تنسيق موعد الحفل بكل الأشكال اللي في الدعوة — مشترك بين الدعوة ولوحة التحكم */
(function () {
  const TZ = 'Asia/Amman';
  const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const HOURS_AR = ['الثانية عشرة', 'الواحدة', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة',
                    'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'الحادية عشرة', 'الثانية عشرة'];

  const arDigits = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const pad = n => String(n).padStart(2, '0');

  /** أجزاء التاريخ بتوقيت الأردن */
  function parts(date) {
    const f = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hourCycle: 'h23', weekday: 'short',
    }).formatToParts(date);
    const g = t => f.find(p => p.type === t)?.value;
    return { y: +g('year'), m: +g('month'), d: +g('day'), h: +g('hour') % 24, min: +g('minute'), wd: DAY_KEYS.indexOf(g('weekday')) };
  }

  /** "الثامنة مساءً" / "التاسعة والنصف مساءً" ... */
  function timeWords(h, min) {
    let hh = h, tail = '';
    if (min === 0) tail = '';
    else if (min === 15) tail = ' والربع';
    else if (min === 20) tail = ' والثلث';
    else if (min === 30) tail = ' والنصف';
    else if (min === 40) { hh = (h + 1) % 24; tail = ' إلا ثلثاً'; }
    else if (min === 45) { hh = (h + 1) % 24; tail = ' إلا ربعاً'; }
    else tail = ` و${min} دقيقة`;
    const period = h < 12 ? 'صباحاً' : h < 15 ? 'ظهراً' : h < 18 ? 'عصراً' : 'مساءً';
    return `${HOURS_AR[hh % 12 === 0 ? 12 : hh % 12]}${tail} ${period}`;
  }

  /** "8:00 PM" */
  function clock(h, min) {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${pad(min)} ${h < 12 ? 'AM' : 'PM'}`;
  }

  function format(iso) {
    const date = new Date(iso);
    const p = parts(date);
    const day = DAYS_AR[p.wd], mon = MONTHS_AR[p.m - 1];
    return {
      date,
      cover:     `${day} ${arDigits(p.d)} ${mon} ${arDigits(p.y)}`,      // الجمعة ١٣ نوفمبر ٢٠٢٦
      hero:      `${p.d}.${MONTHS_EN[p.m - 1]}.${p.y}`,                  // 13.NOV.2026
      std:       `${p.d} .${pad(p.m)}.${p.y}`,                            // 13 .11.2026
      timeLine:  `في تمام الساعة ${timeWords(p.h, p.min)}`,               // في تمام الساعة الثامنة مساءً
      dayLine:   `من يوم ${day} الموافق ${p.d} ${mon} ${p.y}`,           // من يوم الجمعة الموافق 13 نوفمبر 2026
      endDayMon: `${arDigits(p.d)} ${mon}`,                               // ١٣ نوفمبر
      endYear:   arDigits(p.y),                                           // ٢٠٢٦
      short:     `${day} ${p.d} ${mon} ${p.y} · ${clock(p.h, p.min)}`,   // للوحة التحكم
      clock:     clock(p.h, p.min),
      localInput: `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`, // لقيمة input datetime-local
    };
  }

  window.EventDate = { format, timeWords, clock, TZ };
})();
