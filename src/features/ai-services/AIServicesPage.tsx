import { AppstoreOutlined } from '@ant-design/icons';
import InDevelopmentPage from '../../components/InDevelopmentPage';

export default function AIServicesPage() {
  return (
    <InDevelopmentPage
      title="ИИ-сервисы"
      icon={<AppstoreOutlined />}
      description="Каталог сторонних ИИ-инструментов с фильтрами, рейтингом и корпоративной подпиской."
    />
  );
}
