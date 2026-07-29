// Каталог скиллов по агентам. Ключ — key карточки агента в интерфейсе
// (AGENT_ITEMS в AIPanelSider). Сами тексты — в соседних файлах, по одному на агента.
import { BRIEFING_SKILL } from './briefing';
import { METRICS_SKILL } from './metrics';
import { QBR_SKILL } from './qbr';
import { TASKS_SKILL } from './tasks';
import { RISKS_SKILL } from './risks';
import { HYPOTHESES_SKILL } from './hypotheses';
import { CUSTDEV_SKILL } from './custdev';
import { CJM_SKILL } from './cjm';
import { TRENDS_SKILL } from './trends';

export const AGENT_PROMPTS: Record<string, string> = {
  'agent-briefing': BRIEFING_SKILL,
  'agent-metrics': METRICS_SKILL,
  'agent-qbr': QBR_SKILL,
  'agent-tasks': TASKS_SKILL,
  'agent-risks': RISKS_SKILL,
  'agent-hypotheses': HYPOTHESES_SKILL,
  'agent-custdev': CUSTDEV_SKILL,
  'agent-cjm': CJM_SKILL,
  'agent-trends': TRENDS_SKILL,
};
