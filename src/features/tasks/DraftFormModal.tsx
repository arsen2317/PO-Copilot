import { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Select } from 'antd';
import type { TaskDraft } from '../../data/types';
import { useUIStore } from '../../store/uiStore';

// Форма создания / редактирования черновика задачи.
// Покрывает все поля модели TaskDraft — драфт можно оформить полностью вручную,
// а также отредактировать любой черновик (созданный ИИ или пользователем).

interface DraftFormValues {
  title: string;
  type: TaskDraft['type'];
  priority: TaskDraft['priority'];
  storyPoints?: number;
  description?: string;
  epicId?: string;
  labels?: string[];
  criteriaText?: string;
  complianceNotes?: string;
}

const TYPE_OPTIONS: TaskDraft['type'][] = ['Story', 'Bug', 'Task', 'Spike'];
const PRIORITY_OPTIONS: { value: TaskDraft['priority']; label: string }[] = [
  { value: 'P0', label: 'P0 — критический' },
  { value: 'P1', label: 'P1 — высокий' },
  { value: 'P2', label: 'P2 — средний' },
  { value: 'P3', label: 'P3 — низкий' },
];

export default function DraftFormModal({
  open,
  onClose,
  onSaved,
  editingDraft,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (mode: 'create' | 'edit') => void;
  editingDraft?: TaskDraft | null;
}) {
  const [form] = Form.useForm<DraftFormValues>();
  const addTaskDraft = useUIStore((s) => s.addTaskDraft);
  const updateTaskDraft = useUIStore((s) => s.updateTaskDraft);
  const isEdit = !!editingDraft;

  useEffect(() => {
    if (!open) return;
    if (editingDraft) {
      form.resetFields();
      form.setFieldsValue({
        title: editingDraft.title,
        type: editingDraft.type,
        priority: editingDraft.priority,
        labels: editingDraft.labels ?? [],
        criteriaText: (editingDraft.criteria ?? []).join('\n'),
        ...(editingDraft.storyPoints !== undefined ? { storyPoints: editingDraft.storyPoints } : {}),
        ...(editingDraft.description !== undefined ? { description: editingDraft.description } : {}),
        ...(editingDraft.epicId !== undefined ? { epicId: editingDraft.epicId } : {}),
        ...(editingDraft.complianceNotes !== undefined ? { complianceNotes: editingDraft.complianceNotes } : {}),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ type: 'Story', priority: 'P2' });
    }
  }, [open, editingDraft, form]);

  const handleOk = () => {
    void form.validateFields().then((values) => {
      const criteria = (values.criteriaText ?? '')
        .split('\n')
        .map((c) => c.trim())
        .filter(Boolean);
      const patch: Omit<TaskDraft, 'id' | 'createdAt'> = {
        title: values.title.trim(),
        type: values.type,
        priority: values.priority,
        criteria,
        ...(values.storyPoints !== undefined && values.storyPoints !== null ? { storyPoints: values.storyPoints } : {}),
        ...(values.description?.trim() ? { description: values.description.trim() } : {}),
        ...(values.epicId?.trim() ? { epicId: values.epicId.trim() } : {}),
        ...(values.labels?.length ? { labels: values.labels } : {}),
        ...(values.complianceNotes?.trim() ? { complianceNotes: values.complianceNotes.trim() } : {}),
        ...(editingDraft?.linkedArtifacts?.length ? { linkedArtifacts: editingDraft.linkedArtifacts } : {}),
      };
      if (editingDraft) updateTaskDraft(editingDraft.id, patch);
      else addTaskDraft(patch);
      onSaved?.(editingDraft ? 'edit' : 'create');
      onClose();
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText={isEdit ? 'Сохранить' : 'Создать драфт'}
      cancelText="Отмена"
      title={isEdit ? 'Редактировать черновик' : 'Новый черновик задачи'}
      centered
      width={620}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 8 }}>
        <Form.Item
          name="title"
          label="Название"
          rules={[{ required: true, message: 'Укажите название задачи' }]}
        >
          <Input placeholder="Например: Добавить биометрию при входе" />
        </Form.Item>

        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="type" label="Тип" style={{ flex: 1 }} rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))} />
          </Form.Item>
          <Form.Item name="priority" label="Приоритет" style={{ flex: 1 }} rules={[{ required: true }]}>
            <Select options={PRIORITY_OPTIONS} />
          </Form.Item>
          <Form.Item name="storyPoints" label="Story Points" style={{ width: 130 }}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="—" />
          </Form.Item>
        </div>

        <Form.Item name="description" label="Описание">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="Контекст, цель, детали реализации" />
        </Form.Item>

        <Form.Item
          name="criteriaText"
          label="Критерии приёмки"
          tooltip="Каждый критерий — с новой строки"
        >
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder={'Пользователь может войти по отпечатку\nЕсть fallback на PIN-код'} />
        </Form.Item>

        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="labels" label="Метки" style={{ flex: 1 }}>
            <Select mode="tags" tokenSeparators={[',']} placeholder="Добавьте метки" />
          </Form.Item>
          <Form.Item name="epicId" label="Эпик" style={{ width: 200 }}>
            <Input placeholder="EPIC-123" />
          </Form.Item>
        </div>

        <Form.Item name="complianceNotes" label="Compliance-замечания">
          <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} placeholder="Требования ИБ / регуляторные ограничения" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
