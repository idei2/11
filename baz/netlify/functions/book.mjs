import { getStore } from "@netlify/blobs";

/* ===== РАСПИСАНИЕ: для новой клиники меняется только этот блок ===== */
const SCHEDULE = {
  open: "09:00", close: "20:00", step: 60,   // слоты по step минут
  daysAhead: 14,                              // сколько дней открыто для записи
  closedWeekdays: [],                         // 0 = воскресенье, 6 = суббота
  leadMinutes: 60,                            // за сколько минут закрывается запись на сегодня
  tz: "Europe/Moscow"
};
/* ===== конец блока расписания ===== */

const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const toMin = t => { const [h, m] = t.split(":"); return +h * 60 + +m; };
const fmt = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const addDays = (d, n) => { const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const weekday = d => new Date(d + "T12:00:00Z").getUTCDay();
const key = (d, t) => `${d}_${t.replace(":", "-")}`;
const times = [];
for (let m = toMin(SCHEDULE.open); m + SCHEDULE.step <= toMin(SCHEDULE.close); m += SCHEDULE.step) times.push(fmt(m));

const now = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: SCHEDULE.tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
};
const isClosed = d => SCHEDULE.closedWeekdays.includes(weekday(d));
const isPast = (n, d, t) => d === n.date && toMin(t) < n.min + SCHEDULE.leadMinutes;

export default async (req) => {
  const store = getStore("bookings");
  const url = new URL(req.url);
  const admin = Netlify.env.get("ADMIN_TOKEN");
  const n = now();

  /* свободные и занятые слоты (без персональных данных) */
  if (req.method === "GET" && !url.searchParams.has("admin")) {
    const { blobs } = await store.list();
    const taken = new Set(blobs.map(b => b.key));
    const days = [];
    for (let i = 0; i < SCHEDULE.daysAhead; i++) {
      const date = addDays(n.date, i);
      const busy = times.filter(t => taken.has(key(date, t)) || isPast(n, date, t));
      days.push({ date, closed: isClosed(date), times, busy });
    }
    return json({ days });
  }

  /* запись */
  if (req.method === "POST") {
    let b; try { b = await req.json(); } catch { return json({ error: "bad" }, 400); }
    const { name = "", phone = "", service = "", date = "", time = "" } = b;
    const digits = phone.replace(/\D/g, "");
    if (!name.trim() || name.length > 80 || digits.length < 10 || digits.length > 15) return json({ error: "fields" }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !times.includes(time)) return json({ error: "slot" }, 400);
    if (date < n.date || date > addDays(n.date, SCHEDULE.daysAhead - 1) || isClosed(date) || isPast(n, date, time)) return json({ error: "slot" }, 400);
    const res = await store.setJSON(key(date, time), { name: name.trim(), phone, service: service.slice(0, 120), created: new Date().toISOString() }, { onlyIfNew: true });
    if (res && res.modified === false) return json({ error: "taken" }, 409);
    return json({ ok: true });
  }

  /* админка: список записей и освобождение слота, нужен ADMIN_TOKEN */
  const token = url.searchParams.get("admin") || url.searchParams.get("token");
  if (!admin || token !== admin) return json({ error: "forbidden" }, 403);
  if (req.method === "GET") {
    const { blobs } = await store.list();
    const rows = await Promise.all(blobs.map(async b => ({ slot: b.key, ...(await store.get(b.key, { type: "json" })) })));
    return json(rows.sort((a, c) => a.slot.localeCompare(c.slot)));
  }
  if (req.method === "DELETE") {
    await store.delete(key(url.searchParams.get("date") || "", url.searchParams.get("time") || ""));
    return json({ ok: true });
  }
  return json({ error: "method" }, 405);
};

export const config = { path: "/api/book" };
