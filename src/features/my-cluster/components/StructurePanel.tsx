import { useState } from 'react';
import { theme } from 'antd';
import { ApartmentOutlined, CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import type { ClusterStructure } from '../../../data/types';

const { useToken } = theme;

/** Дерево «Структура»: кластер → стримы, активный стрим подсвечен. */
export default function StructurePanel({ structure }: { structure: ClusterStructure }) {
  const { token } = useToken();
  const [open, setOpen] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(
    structure.streams.find((s) => s.active)?.id ?? '',
  );

  return (
    <div
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: token.colorTextTertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          padding: '0 6px 8px',
        }}
      >
        Структура
      </div>

      {/* Корень — кластер */}
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 34,
          padding: '0 6px',
          borderRadius: token.borderRadius,
          cursor: 'pointer',
        }}
      >
        {open ? (
          <CaretDownOutlined style={{ fontSize: 10, color: token.colorTextTertiary }} />
        ) : (
          <CaretRightOutlined style={{ fontSize: 10, color: token.colorTextTertiary }} />
        )}
        <ApartmentOutlined style={{ fontSize: 14, color: token.colorPrimary }} />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: token.colorText }}>
          {structure.clusterName}
        </span>
      </div>

      {/* Стримы */}
      {open &&
        structure.streams.map((s) => {
          const isActive = s.id === selected;
          return (
            <div
              key={s.id}
              onClick={() => setSelected(s.id)}
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                minHeight: 32,
                padding: '5px 8px 5px 30px',
                borderRadius: token.borderRadius,
                cursor: 'pointer',
                background: isActive
                  ? token.colorFillSecondary
                  : hovered === s.id
                    ? token.colorFillQuaternary
                    : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  lineHeight: 1.35,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? token.colorText : token.colorTextSecondary,
                }}
              >
                {s.name}
              </span>
            </div>
          );
        })}
    </div>
  );
}
