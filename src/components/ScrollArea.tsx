import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import type { CSSProperties, ReactNode } from 'react';

interface ScrollAreaProps {
  /** Applied to the scroll viewport itself (flex sizing, max-height, etc). */
  style?: CSSProperties;
  /** Applied to a wrapper inside the scrollable content (padding, gap — scrolls with the content). */
  contentStyle?: CSSProperties;
  className?: string;
  children: ReactNode;
}

/**
 * Cross-browser scrollbar (Chrome/Firefox/Safari all render identically) via OverlayScrollbars:
 * thin, dark, hidden until the user actually scrolls. Only safe for self-contained lists —
 * it forces its root into a library-managed flex structure, so it must not wrap flex-column
 * layouts that size children via `flex`/`min-height:0` chains (e.g. whole-page scroll areas).
 */
export default function ScrollArea({ style, contentStyle, className, children }: ScrollAreaProps) {
  return (
    <OverlayScrollbarsComponent
      className={className}
      style={style}
      options={{
        scrollbars: { theme: 'os-theme-app', autoHide: 'scroll', autoHideDelay: 400 },
        overflow: { x: 'hidden' },
      }}
    >
      <div style={contentStyle}>{children}</div>
    </OverlayScrollbarsComponent>
  );
}
