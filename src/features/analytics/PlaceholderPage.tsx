import { useLocation } from 'react-router-dom';
import { LineChartOutlined, RocketOutlined } from '@ant-design/icons';
import InDevelopmentPage from '../../components/InDevelopmentPage';

type Config = { title: string; icon?: React.ReactNode; description?: string };

const CONFIG: Record<string, Config> = {
  '/retention': {
    title: 'Удержание',
    icon: <LineChartOutlined />,
    description: 'Когортный анализ удержания пользователей, отток и триггеры реактивации.',
  },
  '/features': {
    title: 'Фичи',
    icon: <RocketOutlined />,
    description: 'Витрина фич продукта: статус раскатки, adoption и влияние на метрики.',
  },
};

export default function PlaceholderPage() {
  const { pathname } = useLocation();
  const fallback: Config = { title: pathname };
  const cfg = CONFIG[pathname] ?? fallback;
  return <InDevelopmentPage title={cfg.title} icon={cfg.icon} description={cfg.description} />;
}
