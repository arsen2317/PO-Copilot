declare module 'wx-react-gantt' {
  import type { ComponentType } from 'react';

  interface GanttScale {
    unit: string;
    step: number;
    format: string;
  }

  interface GanttColumn {
    id: string;
    header?: string;
    width?: number;
    flexgrow?: number;
    align?: 'left' | 'center' | 'right';
    sort?: boolean;
    template?: (task: unknown) => string;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type GanttTask = Record<string, any>;

  interface GanttLink {
    id: string | number;
    source: string | number;
    target: string | number;
    type: string;
  }

  interface GanttProps {
    tasks?: GanttTask[];
    links?: GanttLink[];
    scales?: GanttScale[];
    columns?: GanttColumn[];
    cellHeight?: number;
    cellWidth?: number;
    scaleHeight?: number;
    readonly?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    taskTemplate?: ComponentType<any>;
    markers?: unknown[];
    start?: Date;
    end?: Date;
    zoom?: boolean | object;
    baselines?: boolean;
    highlightTime?: unknown[];
    editorShape?: unknown[];
    selected?: (string | number)[];
    activeTask?: string | number | null;
    init?: (api: unknown) => void;
    api?: unknown;
    [key: string]: unknown;
  }

  export const Gantt: ComponentType<GanttProps>;
  export const Willow: ComponentType<{ children?: React.ReactNode }>;
  export const WillowDark: ComponentType<{ children?: React.ReactNode }>;
  export const Toolbar: ComponentType<unknown>;
  export const ContextMenu: ComponentType<unknown>;
  export const defaultColumns: GanttColumn[];
  export const defaultEditorShape: unknown[];
}
