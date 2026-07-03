import { Typography } from 'antd';
import { useLocation } from 'react-router-dom';

const NAMES: Record<string, string> = {
  '/funnel': 'Воронка',
  '/retention': 'Удержание',
  '/features': 'Фичи',
  '/unit-economics': 'Unit-экономика',
};

export default function PlaceholderPage() {
  const { pathname } = useLocation();
  const name = NAMES[pathname] ?? pathname;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <Typography.Title level={3} style={{ color: '#D7D8DA', margin: 0 }}>{name}</Typography.Title>
      <Typography.Text style={{ color: '#9B9C9E' }}>Раздел находится в разработке</Typography.Text>
    </div>
  );
}
