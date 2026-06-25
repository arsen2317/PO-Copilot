import { Typography } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';

export default function MetricsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, opacity: 0.4 }}>
      <LineChartOutlined style={{ fontSize: 40 }} />
      <Typography.Text style={{ fontSize: 16 }}>Страница метрик</Typography.Text>
    </div>
  );
}
