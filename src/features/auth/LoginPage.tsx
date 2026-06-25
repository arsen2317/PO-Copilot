import { useState } from 'react';
import { Button, Form, Input, Typography } from 'antd';
import { CreditCardOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { login } from './auth';

interface LoginPageProps {
  onSuccess: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFinish = ({ username, password }: { username: string; password: string }) => {
    setLoading(true);
    setError(false);
    setTimeout(() => {
      if (login(username, password)) {
        onSuccess();
      } else {
        setError(true);
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
    }}>
      <div style={{
        width: 360,
        background: '#121214',
        border: '1px solid #2D2E30',
        borderRadius: 16,
        padding: '36px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <CreditCardOutlined style={{ fontSize: 22, color: '#4A82F7' }} />
          <Typography.Text style={{ fontSize: 18, fontWeight: 600, color: '#D7D8DA' }}>
            Дебетовые карты
          </Typography.Text>
        </div>

        <div>
          <Typography.Title level={4} style={{ margin: '0 0 4px', color: '#D7D8DA', textAlign: 'center' }}>
            Вход
          </Typography.Title>
          <Typography.Text style={{ display: 'block', color: '#9B9C9E', fontSize: 13, textAlign: 'center' }}>
            Войдите чтобы продолжить
          </Typography.Text>
        </div>

        <Form layout="vertical" onFinish={handleFinish} requiredMark={false}>
          <Form.Item name="username" rules={[{ required: true, message: '' }]} style={{ marginBottom: 12 }}>
            <Input
              prefix={<UserOutlined style={{ color: '#9B9C9E' }} />}
              placeholder="Логин"
              size="large"
              autoComplete="username"
            />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '' }]} style={{ marginBottom: 16 }}>
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9B9C9E' }} />}
              placeholder="Пароль"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          {error && (
            <Typography.Text style={{ display: 'block', color: '#F04438', fontSize: 13, marginBottom: 12 }}>
              Неверный логин или пароль
            </Typography.Text>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Войти
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
