import type { CSSProperties, MouseEventHandler } from 'react';

export interface IconProps {
  style?: CSSProperties;
  className?: string;
  onClick?: MouseEventHandler<SVGSVGElement>;
}

// "PO Copilot" logo mark — the only icon in this app not sourced from antd.
export function TokenCircleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM12.4619 7.25293C12.2469 6.91532 11.7531 6.91532 11.5381 7.25293L10.916 8.23047C10.2281 9.31135 9.31135 10.2281 8.23047 10.916L7.25293 11.5381C6.91532 11.7531 6.91532 12.2469 7.25293 12.4619L8.23047 13.084C9.31135 13.7719 10.2281 14.6886 10.916 15.7695L11.5381 16.7471C11.7531 17.0847 12.2469 17.0847 12.4619 16.7471L13.084 15.7695C13.7719 14.6886 14.6886 13.7719 15.7695 13.084L16.7471 12.4619C17.0847 12.2469 17.0847 11.7531 16.7471 11.5381L15.7695 10.916C14.6886 10.2281 13.7719 9.31135 13.084 8.23047L12.4619 7.25293Z" />
    </svg>
  );
}
