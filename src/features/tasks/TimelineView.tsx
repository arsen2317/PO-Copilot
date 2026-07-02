import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Select, theme } from 'antd';

const { useToken } = theme;

// ─── types ────────────────────────────────────────────────────────────────────

type Period = 'sprint' | 'month' | 'quarter' | 'halfyear' | 'year';

interface Col {
  date: Date;
  lower: string;
  upper: string | null;   // non-null only at the start of a new month/year group
  isToday: boolean;
  isWeekend: boolean;
}

// ─── constants ────────────────────────────────────────────────────────────────

const PERIODS: { value: Period; label: string }[] = [
  { value: 'sprint',   label: 'Спринт' },
  { value: 'month',    label: 'Месяц' },
  { value: 'quarter',  label: 'Квартал' },
  { value: 'halfyear', label: 'Полугодие' },
  { value: 'year',     label: 'Год' },
];

const COL_W: Record<Period, number> = {
  sprint: 48, month: 40, quarter: 120, halfyear: 90, year: 100,
};

const RU_DAYS  = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const RU_MON_S = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const RU_MON_F = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

// ─── date helpers ─────────────────────────────────────────────────────────────

function midnight(d: Date): Date { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function mondayOf(d: Date): Date {
  const r = midnight(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}

// ─── column builders ──────────────────────────────────────────────────────────

function buildCols(period: Period, today: Date): Col[] {
  const t = midnight(today);
  const cols: Col[] = [];

  if (period === 'sprint' || period === 'month') {
    const count = period === 'sprint' ? 21 : 42;
    const backWeeks = period === 'sprint' ? 1 : 3;
    let cur = mondayOf(addDays(t, -backWeeks * 7));
    let lastMonth = -1;

    for (let i = 0; i < count; i++) {
      const mo = cur.getMonth();
      const upper: string | null = mo !== lastMonth
        ? `${RU_MON_F[mo]} ${cur.getFullYear()}`
        : null;
      if (upper !== null) lastMonth = mo;
      cols.push({
        date: new Date(cur),
        lower: `${RU_DAYS[cur.getDay()]} ${cur.getDate()}`,
        upper,
        isToday: cur.getTime() === t.getTime(),
        isWeekend: cur.getDay() === 0 || cur.getDay() === 6,
      });
      cur = addDays(cur, 1);
    }

  } else if (period === 'quarter' || period === 'halfyear') {
    const count = period === 'quarter' ? 16 : 30;
    const backWeeks = period === 'quarter' ? 4 : 8;
    let cur = mondayOf(addDays(t, -backWeeks * 7));
    let lastMonth = -1;

    for (let i = 0; i < count; i++) {
      const end = addDays(cur, 6);
      const mo = cur.getMonth();
      const upper: string | null = mo !== lastMonth
        ? `${RU_MON_F[mo]} ${cur.getFullYear()}`
        : null;
      if (upper !== null) lastMonth = mo;
      cols.push({
        date: new Date(cur),
        lower: `${cur.getDate()} ${RU_MON_S[mo]}`,
        upper,
        isToday: t >= cur && t <= end,
        isWeekend: false,
      });
      cur = addDays(cur, 7);
    }

  } else {
    // year: 14 months so we always see current year fully
    const year = t.getFullYear();
    let lastYear = -1;
    for (let m = 0; m < 14; m++) {
      const cur = new Date(year, m, 1);
      const endOfMo = new Date(year, m + 1, 0);
      const yr = cur.getFullYear();
      const upper: string | null = yr !== lastYear ? String(yr) : null;
      if (upper !== null) lastYear = yr;
      cols.push({
        date: cur,
        lower: RU_MON_F[cur.getMonth()] ?? '',
        upper,
        isToday: t >= cur && t <= endOfMo,
        isWeekend: false,
      });
    }
  }

  return cols;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function TimelineView({ bdr }: { bdr: string }) {
  const { token } = useToken();
  const [searchParams, setSearchParams] = useSearchParams();

  const [period, setPeriod] = useState<Period>(() => {
    const p = searchParams.get('range') as Period;
    return PERIODS.some(x => x.value === p) ? p : 'sprint';
  });

  const today  = useMemo(() => midnight(new Date()), []);
  const cols   = useMemo(() => buildCols(period, today), [period, today]);
  const colW   = COL_W[period];
  const totalW = cols.length * colW;

  const scrollRef = useRef<HTMLDivElement>(null);
  const todayIdx  = cols.findIndex(c => c.isToday);

  // Upper header groups (consecutive cols sharing a month/year label)
  const upperGroups = useMemo(() => {
    const groups: { label: string; span: number }[] = [];
    for (const col of cols) {
      if (col.upper !== null) {
        groups.push({ label: col.upper, span: 1 });
      } else if (groups.length > 0) {
        groups[groups.length - 1]!.span++;
      } else {
        groups.push({ label: '', span: 1 });
      }
    }
    return groups;
  }, [cols]);

  // Scroll so that today is visible near the center-left on every period change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || todayIdx < 0) return;
    el.scrollLeft = Math.max(0, todayIdx * colW - el.clientWidth / 3);
  }, [period, todayIdx, colW]);

  const changePeriod = (p: Period) => {
    setPeriod(p);
    setSearchParams(sp => { sp.set('range', p); return sp; }, { replace: true });
  };

  const line   = `1px solid ${token.colorBorderSecondary}`;
  const lineFaint = `1px solid ${token.colorBorderSecondary}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Period selector */}
      <div style={{ marginBottom: 14, flexShrink: 0 }}>
        <Select
          value={period}
          onChange={changePeriod}
          style={{ width: 150 }}
          size="small"
          options={PERIODS}
        />
      </div>

      {/* Scrollable grid */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: 'auto',
          border: bdr,
          borderRadius: 10,
          minHeight: 300,
          background: token.colorBgContainer,
          position: 'relative',
        }}
      >
        <div style={{ width: totalW, minHeight: '100%', position: 'relative' }}>

          {/* ── Sticky header ── */}
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: token.colorBgContainer,
            borderBottom: line,
          }}>

            {/* Upper row: month / year */}
            <div style={{ display: 'flex', height: 28 }}>
              {upperGroups.map((g, i) => (
                <div
                  key={i}
                  style={{
                    width: g.span * colW,
                    flexShrink: 0,
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    color: token.colorTextSecondary,
                    borderRight: lineFaint,
                    boxSizing: 'border-box',
                  }}
                >
                  {g.label}
                </div>
              ))}
            </div>

            {/* Lower row: day / week / month labels */}
            <div style={{ display: 'flex', height: 30, borderTop: line }}>
              {cols.map((col, i) => (
                <div
                  key={i}
                  style={{
                    width: colW,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    color: col.isToday
                      ? token.colorPrimary
                      : col.isWeekend
                        ? token.colorTextDisabled
                        : token.colorTextSecondary,
                    fontWeight: col.isToday ? 700 : 400,
                    background: col.isToday
                      ? `${token.colorPrimary}1a`
                      : col.isWeekend
                        ? 'rgba(255,255,255,0.025)'
                        : undefined,
                    borderRight: lineFaint,
                    boxSizing: 'border-box',
                  }}
                >
                  {col.lower}
                </div>
              ))}
            </div>
          </div>

          {/* ── Body ── */}
          <div
            style={{
              position: 'relative',
              minHeight: 400,
              // Subtle vertical grid lines via CSS repeating gradient
              backgroundImage: `repeating-linear-gradient(
                to right,
                transparent,
                transparent ${colW - 1}px,
                ${token.colorBorderSecondary} ${colW - 1}px,
                ${token.colorBorderSecondary} ${colW}px
              )`,
            }}
          >
            {/* Today column highlight */}
            {todayIdx >= 0 && (
              <div style={{
                position: 'absolute',
                left: todayIdx * colW,
                top: 0,
                width: colW,
                height: '100%',
                background: `${token.colorPrimary}0d`,
                pointerEvents: 'none',
              }} />
            )}

            {/* Weekend highlights (day views only) */}
            {cols.map((col, i) =>
              col.isWeekend && !col.isToday ? (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: i * colW,
                    top: 0,
                    width: colW,
                    height: '100%',
                    background: 'rgba(255,255,255,0.018)',
                    pointerEvents: 'none',
                  }}
                />
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
