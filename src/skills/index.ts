// Публичный вход в папку скиллов. Всё, что нужно ассистенту, импортируется отсюда.
// Как устроена папка и как добавить скилл — см. src/skills/README.md.
export { getBaseSystemPrompt } from './base';
export { getOrchestratorSystemPrompt } from './orchestrator';
export { getSpecialistPreamble, getDateLine, FORMATTING_RULES, INTERACTIVE_LINK_RULES } from './shared';
export { AGENT_PROMPTS } from './agents/index';
export { WRITE_TASK_SKILL } from './executors/write-task';
export { QBR_REPORT_SKILL } from './executors/qbr-report';
export { RESEARCH_BRIEF_SKILL } from './executors/research-brief';
