import { useMemo, useState } from 'react';
import { Tabs, theme, Typography } from 'antd';

import { calculate, DEFAULTS, type CalcParams } from './calc';
import { fmt, fmtPct, fmtRub } from './format';
import { KpiTile } from './components/KpiTile';
import { InputRow } from './components/InputRow';
import { SectionTitle } from './components/SectionTitle';
import { DonutChart } from './components/DonutChart';
import { PaybackChartContainer } from './components/PaybackChart';
import { REVENUE_COLORS, COST_COLORS } from './palette';

const { useToken } = theme;

export default function UnitEconomicsPage() {
  const { token } = useToken();
  const [params, setParams] = useState<CalcParams>(DEFAULTS);

  const set = <K extends keyof CalcParams>(key: K) => (v: number) =>
    setParams((prev) => ({ ...prev, [key]: v }));

  const result = useMemo(() => calculate(params), [params]);

  const paybackStatus =
    result.paybackMonths === null ? 'bad'
    : result.paybackMonths <= 12 ? 'good'
    : result.paybackMonths <= 24 ? 'warn'
    : 'bad';

  const ltvCacStatus =
    result.ltvCac === null ? 'bad'
    : result.ltvCac >= 3 ? 'good'
    : result.ltvCac >= 1 ? 'warn'
    : 'bad';

  const cmStatus = result.cm > 0 ? 'good' : 'bad';

  const BDR = `1px solid ${token.colorBorderSecondary}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 0 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontSize: 22, color: token.colorText }}>
            Unit-экономика
          </Typography.Title>
          <Typography.Text style={{ fontSize: 13, color: token.colorTextTertiary }}>
            Расчёт прибыльности одной активной дебетовой карты
          </Typography.Text>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 12 }}>

        {/* ── Left: input panel ── */}
        <div style={{
          width: 280,
          flexShrink: 0,
          background: token.colorBgContainer,
          border: BDR,
          borderRadius: token.borderRadiusLG,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>

          {/* Доходы */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SectionTitle>Доходы</SectionTitle>
            <InputRow
              label="Транзакций в месяц"
              value={params.txPerMonth}
              min={0}
              max={200}
              onChange={set('txPerMonth')}
            />
            <InputRow
              label="Средний чек"
              suffix="₽"
              value={params.avgTxAmount}
              min={0}
              step={100}
              onChange={set('avgTxAmount')}
            />
            <InputRow
              label="Ставка интерчейнджа"
              hint="% от суммы транзакции"
              suffix="%"
              value={params.interchangeRate}
              min={0}
              max={5}
              step={0.1}
              precision={2}
              onChange={set('interchangeRate')}
            />
            <InputRow
              label="Остаток на счёте"
              suffix="₽"
              value={params.avgBalance}
              min={0}
              step={1000}
              onChange={set('avgBalance')}
            />
            <InputRow
              label="Чистая % маржа"
              hint="ЧПМ, % годовых"
              suffix="%"
              value={params.nim}
              min={0}
              max={30}
              step={0.5}
              precision={1}
              onChange={set('nim')}
            />
            <InputRow
              label="Ежемесячная плата"
              suffix="₽"
              value={params.monthlyFee}
              min={0}
              step={10}
              onChange={set('monthlyFee')}
            />
            <InputRow
              label="Прочие доходы"
              hint="Снятия наличных, прочие комиссии"
              suffix="₽/мес"
              value={params.otherFeeIncome}
              min={0}
              step={5}
              onChange={set('otherFeeIncome')}
            />
          </div>

          {/* Расходы */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SectionTitle>Расходы</SectionTitle>
            <InputRow
              label="Кешбэк / лояльность"
              suffix="% об."
              value={params.cashbackRate}
              min={0}
              max={10}
              step={0.1}
              precision={2}
              onChange={set('cashbackRate')}
            />
            <InputRow
              label="Процессинг (за транз.)"
              suffix="₽"
              value={params.processingCostPerTx}
              min={0}
              step={0.5}
              precision={1}
              onChange={set('processingCostPerTx')}
            />
            <InputRow
              label="Обслуживание счёта"
              hint="ДБО, колл-центр, пластик"
              suffix="₽/мес"
              value={params.accountServicingCost}
              min={0}
              step={5}
              onChange={set('accountServicingCost')}
            />
            <InputRow
              label="CAC"
              hint="Стоимость привлечения одного клиента"
              suffix="₽"
              value={params.cac}
              min={0}
              step={100}
              onChange={set('cac')}
            />
          </div>

          {/* Параметры LTV */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SectionTitle>Параметры LTV</SectionTitle>
            <InputRow
              label="Отток в месяц (Churn)"
              hint="% активных карт, уходящих в месяц"
              suffix="%/мес"
              value={params.churnRate}
              min={0.1}
              max={50}
              step={0.5}
              precision={1}
              onChange={set('churnRate')}
            />
            <InputRow
              label="Ставка дисконтирования"
              suffix="% год"
              value={params.discountRate}
              min={0}
              max={50}
              step={1}
              onChange={set('discountRate')}
            />
          </div>
        </div>

        {/* ── Right: results ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* KPI tiles */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
            <KpiTile
              label="Выручка / карта / мес"
              value={fmtRub(result.revenue)}
              hint="Сумма всех источников дохода"
            />
            <KpiTile
              label="Расходы / карта / мес"
              value={fmtRub(result.cost)}
              hint="Переменные операционные расходы без CAC"
            />
            <KpiTile
              label="Contribution Margin"
              value={fmtRub(result.cm)}
              sub={`${fmtPct(result.cmPct)} от выручки`}
              accent={cmStatus}
              hint="Выручка минус операционные расходы"
            />
            <KpiTile
              label="Срок окупаемости"
              value={result.paybackMonths !== null ? `${fmt(result.paybackMonths, 1)} мес.` : 'Не окупается'}
              sub={result.paybackMonths !== null
                ? result.paybackMonths <= 12 ? 'Отличный показатель'
                  : result.paybackMonths <= 24 ? 'Приемлемый показатель'
                  : 'Высокий срок окупаемости'
                : 'Маржа отрицательная'}
              accent={paybackStatus}
              hint="CAC / Contribution Margin"
            />
            <KpiTile
              label="LTV"
              value={fmtRub(result.ltv)}
              sub={`горизонт ${Math.min(Math.ceil(1 / (params.churnRate / 100)), 120)} мес.`}
              hint="Чистая приведённая стоимость будущих маржей"
            />
            <KpiTile
              label="LTV / CAC"
              value={result.ltvCac !== null ? `${fmt(result.ltvCac, 2)}x` : '—'}
              sub={result.ltvCac !== null
                ? result.ltvCac >= 3 ? '≥ 3x — хорошо'
                  : result.ltvCac >= 1 ? '1–3x — приемлемо'
                  : '< 1x — убыточно'
                : undefined}
              accent={ltvCacStatus}
              hint="Отношение LTV к стоимости привлечения"
            />
          </div>

          {/* Charts card */}
          <div style={{
            flex: 1,
            background: token.colorBgContainer,
            border: BDR,
            borderRadius: token.borderRadiusLG,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Tabs
              defaultActiveKey="payback"
              size="small"
              className="ue-charts-tabs"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              tabBarStyle={{ margin: '0 16px', flexShrink: 0 }}
              items={[
                {
                  key: 'payback',
                  label: 'График окупаемости',
                  children: (
                    <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                      <Typography.Text style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 8, display: 'block' }}>
                        Накопленный денежный поток (Contribution Margin − CAC), ₽
                      </Typography.Text>
                      <PaybackChartContainer data={result.paybackCurve} />
                    </div>
                  ),
                },
                {
                  key: 'revenue',
                  label: 'Структура выручки',
                  children: (
                    <div style={{ padding: '8px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                      <Typography.Text style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 12, display: 'block', textAlign: 'center' }}>
                        Итого: {fmtRub(result.revenue)} / карта / мес
                      </Typography.Text>
                      <div style={{ width: '100%', maxWidth: 380 }}>
                        <DonutChart data={result.revenueBreakdown} colors={REVENUE_COLORS} />
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'cost',
                  label: 'Структура расходов',
                  children: (
                    <div style={{ padding: '8px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                      <Typography.Text style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 12, display: 'block', textAlign: 'center' }}>
                        Итого: {fmtRub(result.cost)} / карта / мес
                      </Typography.Text>
                      <div style={{ width: '100%', maxWidth: 380 }}>
                        <DonutChart data={result.costBreakdown} colors={COST_COLORS} />
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
