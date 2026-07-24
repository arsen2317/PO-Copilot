import { useEffect, useState } from 'react';
import { Button, Dropdown, theme, Tooltip, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { DownOutlined, PlusOutlined, QuestionCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getFunnelAnalytics } from '../../data/api/funnel-analytics';
import { useUIStore } from '../../store/uiStore';
import { OVERALL_ID } from './constants';
import { TilesCarousel } from './components/TilesCarousel';
import { ChartContainer } from './components/ChartContainer';

const { useToken } = theme;

export default function FunnelPage() {
  const { token } = useToken();
  const [granularity, setGranularity] = useState('weekly');
  const [selectedId, setSelectedId] = useState<string>(OVERALL_ID);

  const { data: steps = [], isLoading } = useQuery({
    queryKey: ['funnel-analytics'],
    queryFn: getFunnelAnalytics,
  });

  // AI panel navigation: respond to focusedFunnelStepId from the store
  const focusedFunnelStepId = useUIStore((s) => s.focusedFunnelStepId);
  const clearFocusedFunnelStep = useUIStore((s) => s.setFocusedFunnelStep);
  useEffect(() => {
    if (!focusedFunnelStepId || !steps.length) return;
    if (focusedFunnelStepId === `funnel:${OVERALL_ID}` || focusedFunnelStepId === OVERALL_ID) {
      setSelectedId(OVERALL_ID);
    } else {
      // ID format from AI: "funnel:step1"
      const raw = focusedFunnelStepId.startsWith('funnel:')
        ? focusedFunnelStepId.slice('funnel:'.length)
        : focusedFunnelStepId;
      const step = steps.find((s) => s.id === raw);
      if (step) setSelectedId(step.id);
    }
    clearFocusedFunnelStep(null);
  }, [focusedFunnelStepId, steps, clearFocusedFunnelStep]);

  const lastStep = steps[steps.length - 1];
  const overallConversion = lastStep?.conversionFromFirst ?? 0;

  const FUNNEL_NAME = 'Получение карты';
  const funnelMenu: MenuProps = {
    items: [{ key: 'card', label: FUNNEL_NAME }],
  };

  const GRANULARITY_OPTIONS = [
    { value: 'daily', label: 'По дням' },
    { value: 'weekly', label: 'По неделям' },
    { value: 'monthly', label: 'По месяцам' },
  ];
  const granularityLabel = GRANULARITY_OPTIONS.find((o) => o.value === granularity)?.label ?? 'По неделям';
  const granularityMenu: MenuProps = {
    items: GRANULARITY_OPTIONS.map((o) => ({ key: o.value, label: o.label })),
    onClick: ({ key }) => setGranularity(key),
  };

  const BDR = `1px solid ${token.colorBorderSecondary}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 0 }}>

      {/* ── Page header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        <Typography.Title level={3} style={{ margin: 0, fontSize: 22, color: token.colorText }}>
          Воронки конверсии
        </Typography.Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tooltip title="Помощь">
            <div
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: token.colorTextTertiary,
              }}
            >
              <QuestionCircleOutlined style={{ fontSize: 16 }} />
            </div>
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />}>
            Добавить воронку
          </Button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        {/* Left: funnel selector dropdown button */}
        <Dropdown menu={funnelMenu} trigger={['click']}>
          <Button icon={<DownOutlined />} iconPosition="end">
            {FUNNEL_NAME}
          </Button>
        </Dropdown>

        {/* Right: last-updated info + granularity dropdown button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: token.colorTextTertiary,
              fontSize: 12,
            }}
          >
            <ReloadOutlined style={{ fontSize: 12 }} />
            II квартал 2026 (апр–июн) · Данные от 22 мин назад
          </div>
          <Dropdown menu={granularityMenu} trigger={['click']}>
            <Button icon={<DownOutlined />} iconPosition="end">
              {granularityLabel}
            </Button>
          </Dropdown>
        </div>
      </div>

      {/* ── Main chart card ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: token.colorBgContainer,
          border: BDR,
          borderRadius: token.borderRadiusLG,
          overflow: 'hidden',
          minHeight: 400,
        }}
      >
        <TilesCarousel
          steps={steps}
          selectedId={selectedId}
          loading={isLoading}
          onSelect={setSelectedId}
          bdr={BDR}
          overallConversion={overallConversion}
        />

        <ChartContainer
          selectedId={selectedId}
          steps={steps}
          granularity={granularity}
          loading={isLoading}
        />
      </div>

    </div>
  );
}
