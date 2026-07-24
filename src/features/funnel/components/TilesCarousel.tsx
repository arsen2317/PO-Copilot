import { useCallback, useEffect, useRef, useState } from 'react';
import { theme } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { FunnelAnalyticsStep } from '../../../data/types';
import { OVERALL_ID } from '../constants';
import { FunnelTile } from './FunnelTile';

const { useToken } = theme;

// ────────────────────────────────────────────────────────────────────────────────
// Tiles carousel
// ────────────────────────────────────────────────────────────────────────────────

function CarouselNavBtn({ dir, bdr, onClick }: { dir: 1 | -1; bdr: string; onClick: () => void }) {
  const { token } = useToken();
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [dir === -1 ? 'left' : 'right']: 4,
        zIndex: 2,
        width: 28,
        height: 28,
        borderRadius: 8,
        border: bdr,
        background: token.colorBgContainer,
        color: token.colorText,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {dir === -1 ? <LeftOutlined style={{ fontSize: 11 }} /> : <RightOutlined style={{ fontSize: 11 }} />}
    </button>
  );
}

export function TilesCarousel({
  steps,
  selectedId,
  loading,
  onSelect,
  bdr,
  overallConversion,
}: {
  steps: FunnelAnalyticsStep[];
  selectedId: string;
  loading: boolean;
  onSelect: (id: string) => void;
  bdr: string;
  overallConversion: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const syncButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    syncButtons();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(syncButtons);
    ro.observe(el);
    return () => ro.disconnect();
  }, [steps, syncButtons]);

  const scroll = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0, padding: '12px 16px 0' }}>
      {canLeft && <CarouselNavBtn dir={-1} bdr={bdr} onClick={() => scroll(-1)} />}
      {canRight && <CarouselNavBtn dir={1} bdr={bdr} onClick={() => scroll(1)} />}
      <div
        ref={scrollRef}
        onScroll={syncButtons}
        style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{ minWidth: 160, height: 80, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }}
            />
          ))
        ) : (
          <>
            <FunnelTile
              label="Общая конверсия"
              value={`${overallConversion.toFixed(2)}%`}
              change={0}
              selected={selectedId === OVERALL_ID}
              onClick={() => onSelect(OVERALL_ID)}
            />
            {steps.map((s, idx) => (
              <FunnelTile
                key={s.id}
                label={`Шаг ${idx + 1}: ${s.name}`}
                value={s.users.toLocaleString('ru')}
                subLabel="за квартал"
                change={s.change}
                selected={selectedId === s.id}
                onClick={() => onSelect(s.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
