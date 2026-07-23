// ─── Unit-economics calculation model ────────────────────────────────────────

export interface CalcParams {
  txPerMonth: number;
  avgTxAmount: number;
  interchangeRate: number;
  avgBalance: number;
  nim: number;
  monthlyFee: number;
  otherFeeIncome: number;
  cashbackRate: number;
  processingCostPerTx: number;
  accountServicingCost: number;
  cac: number;
  churnRate: number;
  discountRate: number;
}

export interface CalcResult {
  revenue: number;
  cost: number;
  cm: number;
  cmPct: number;
  paybackMonths: number | null;
  ltv: number;
  ltvCac: number | null;
  paybackCurve: Array<{ month: number; value: number }>;
  revenueBreakdown: Array<{ type: string; value: number }>;
  costBreakdown: Array<{ type: string; value: number }>;
}

// ─── Defaults ────────────────────────────────────────────────────────────────
// Значения откалиброваны под фикстуры metric-definitions.ts (группа unit_econ):
//   revenue_per_card=340₽, cost_per_card=222₽, profit_per_card=118₽
//
// txPerMonth=14   ← tx_frequency fixture (14.2)
// cashbackRate=1.45 ← cashback_cost fixture
// cac=1850        ← cac fixture (business group)
// churnRate=3.8   ← churn_rate fixture (cx group)
//
// avgTxAmount=560 — «экономический средний чек»: оборот 14×560=7840₽/мес,
//   при котором cashback 1.45% = 113.7₽ и итоговый cost ≈ 222₽.
//   Метрика avg_ticket=3240₽ (Метрики → Вовлечение) — среднее по POS-операциям,
//   оно выше из-за вклада крупных покупок.
// nim=9.7% — ставка размещения с учётом ключевой ставки ЦБ;
//   при avgBalance=25000₽ даёт NII≈202₽, итого revenue≈340₽.

export const DEFAULTS: CalcParams = {
  txPerMonth: 14,
  avgTxAmount: 560,
  interchangeRate: 1.5,
  avgBalance: 25000,
  nim: 9.7,
  monthlyFee: 0,
  otherFeeIncome: 20,
  cashbackRate: 1.45,
  processingCostPerTx: 2,
  accountServicingCost: 80,
  cac: 1850,
  churnRate: 3.8,
  discountRate: 12,
};

// ─── Calculation ─────────────────────────────────────────────────────────────

export function calculate(p: CalcParams): CalcResult {
  const turnover = p.txPerMonth * p.avgTxAmount;

  const interchange = turnover * p.interchangeRate / 100;
  const interestIncome = p.avgBalance * p.nim / 100 / 12;
  const fees = p.monthlyFee + p.otherFeeIncome;
  const revenue = interchange + interestIncome + fees;

  const cashback = turnover * p.cashbackRate / 100;
  const processing = p.txPerMonth * p.processingCostPerTx;
  const servicing = p.accountServicingCost;
  const cost = cashback + processing + servicing;

  const cm = revenue - cost;
  const cmPct = revenue > 0 ? (cm / revenue) * 100 : 0;
  const paybackMonths = cm > 0 ? p.cac / cm : null;

  const horizon = p.churnRate > 0 ? Math.min(Math.ceil(1 / (p.churnRate / 100)), 120) : 60;
  const retention = 1 - p.churnRate / 100;
  const monthlyDiscount = p.discountRate / 100 / 12;

  let ltv = 0;
  for (let t = 1; t <= horizon; t++) {
    ltv += cm * Math.pow(retention, t - 1) / Math.pow(1 + monthlyDiscount, t - 1);
  }

  const ltvCac = p.cac > 0 ? ltv / p.cac : null;

  // Chart horizon: extend the X axis so the break-even crossing (or, if it never crosses,
  // the plateau) is actually visible — instead of cutting the curve off at 1/churn mid-rise.
  const HARD_CAP = 60;
  let cumulative = -p.cac;
  let crossMonth = -1;
  for (let t = 1; t <= 120; t++) {
    cumulative += cm * Math.pow(retention, t - 1);
    if (cumulative >= 0) { crossMonth = t; break; }
  }
  const displayHorizon = crossMonth > 0
    ? Math.min(Math.max(Math.ceil(crossMonth * 1.2), 12), HARD_CAP) // show the crossing + ~20% margin
    : Math.min(Math.max(horizon, 12), 48);                          // never crosses — show the plateau
  const paybackCurve: Array<{ month: number; value: number }> = [
    { month: 0, value: -p.cac },
  ];
  for (let t = 1; t <= displayHorizon; t++) {
    paybackCurve.push({
      month: t,
      value: paybackCurve[t - 1]!.value + cm * Math.pow(retention, t - 1),
    });
  }

  return {
    revenue,
    cost,
    cm,
    cmPct,
    paybackMonths,
    ltv,
    ltvCac,
    paybackCurve,
    revenueBreakdown: [
      { type: 'Интерчейндж', value: Math.max(interchange, 0.001) },
      { type: 'Процентный доход', value: Math.max(interestIncome, 0.001) },
      { type: 'Комиссии', value: Math.max(fees, 0.001) },
    ],
    costBreakdown: [
      { type: 'Кешбэк', value: Math.max(cashback, 0.001) },
      { type: 'Процессинг', value: Math.max(processing, 0.001) },
      { type: 'Обслуживание', value: Math.max(servicing, 0.001) },
    ],
  };
}
