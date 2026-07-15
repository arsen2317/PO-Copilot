import { TeamOutlined } from '@ant-design/icons';
import InDevelopmentPage from '../../components/InDevelopmentPage';

export default function RoomsPage() {
  return (
    <InDevelopmentPage
      title="Комнаты"
      icon={<TeamOutlined />}
      description="Планирование спринта, ретро и груминг — совместные сессии команды с ИИ-фасилитатором."
    />
  );
}
