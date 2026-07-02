import type { Epic, Team } from '../types';

export const teamFixtures: Team[] = [
  { id: 'team-debit', name: 'Дебетовые карты', productOwner: 'Иван Петров' },
  { id: 'team-payments', name: 'Переводы и платежи', productOwner: 'Алексей Фёдоров' },
  { id: 'team-analytics', name: 'Аналитика и данные', productOwner: 'Ольга Зайцева' },
  { id: 'team-platform', name: 'Платформа', productOwner: 'Константин Борисов' },
];

export const epicFixtures: Epic[] = [
  {
    id: 'EPIC-1',
    name: 'Онбординг и конверсия',
    color: '#1668dc',
    teamId: 'team-debit',
    description: 'Улучшение воронки онбординга и повышение конверсии новых пользователей',
  },
  {
    id: 'EPIC-2',
    name: 'Интерфейс и UX',
    color: '#d89614',
    teamId: 'team-debit',
    description: 'Редизайн ключевых экранов и улучшение пользовательского опыта',
  },
  {
    id: 'EPIC-3',
    name: 'Безопасность и авторизация',
    color: '#722ed1',
    teamId: 'team-debit',
    description: 'Внедрение биометрии, push-OTP и усиление защиты аккаунтов',
  },
  {
    id: 'EPIC-4',
    name: 'Платёжная инфраструктура',
    color: '#13c2c2',
    teamId: 'team-payments',
    description: 'Обновление процессинга и переход на новые API платёжных систем (команда Переводов)',
  },
  {
    id: 'EPIC-5',
    name: 'Аналитика и дашборды',
    color: '#eb2f96',
    teamId: 'team-analytics',
    description: 'Единая аналитическая платформа и дата-пайплайны (команда Аналитики)',
  },
  {
    id: 'EPIC-6',
    name: 'Программа лояльности',
    color: '#49aa19',
    teamId: 'team-debit',
    description: 'Редизайн кэшбэка и бонусной программы для дебетовых карт',
  },
];
