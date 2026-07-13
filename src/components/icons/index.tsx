import type { CSSProperties, MouseEventHandler } from 'react';

export interface IconProps {
  style?: CSSProperties;
  className?: string;
  onClick?: MouseEventHandler<SVGSVGElement>;
}

export function AlertOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12.6556 2.63577C12.5233 2.39767 12.2724 2.25 12 2.25C11.7276 2.25 11.4767 2.39767 11.3444 2.63577L1.34438 20.6358C1.21533 20.8681 1.21883 21.1513 1.3536 21.3803C1.48836 21.6094 1.73426 21.75 2 21.75H22C22.2657 21.75 22.5116 21.6094 22.6464 21.3803C22.7812 21.1513 22.7847 20.8681 22.6556 20.6358L12.6556 2.63577ZM11.25 16.5V18H12.75V16.5H11.25ZM12.75 15V10H11.25V15H12.75Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function ApiOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M8.29207 12.25H6.95989L7.53082 9.96626L8.29207 12.25Z" />
      <path d="M14.4993 11.25H13.2493V9.75H14.4993C14.9135 9.75 15.2493 10.0858 15.2493 10.5C15.2493 10.9142 14.9135 11.25 14.4993 11.25Z" />
      <path d="M2 2.25C1.58579 2.25 1.25 2.58579 1.25 3V21C1.25 21.4142 1.58579 21.75 2 21.75L22 21.75C22.1989 21.75 22.3897 21.671 22.5303 21.5303C22.671 21.3897 22.75 21.1989 22.75 21V3C22.75 2.58579 22.4142 2.25 22 2.25H2ZM8.53988 8.25H6.41372L4.77148 15.0809L6.2267 15.4447L6.58489 13.75H8.79207L9.28758 15.5L10.7106 15.0257L8.53988 8.25ZM14.4993 8.25H11.7493V15.5H13.2493V12.75H14.4993C15.7419 12.75 16.7493 11.7426 16.7493 10.5C16.7493 9.25736 15.7419 8.25 14.4993 8.25ZM17.7493 15.5H19.2493V8.25H17.7493V15.5Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function AppstoreOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M11 2.25V11H2.25V3C2.25 2.58579 2.58579 2.25 3 2.25H11Z" />
      <path d="M13 2.25V11H21.75V3C21.75 2.58579 21.4142 2.25 21 2.25H13Z" />
      <path d="M21.75 13H13V21.75H21C21.4142 21.75 21.75 21.4142 21.75 21V13Z" />
      <path d="M11 21.75V13H2.25V21C2.25 21.4142 2.58579 21.75 3 21.75H11Z" />
    </svg>
  );
}

export function ArrowDownOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M20.0015 7.5H4.00146L12.0015 16.5L20.0015 7.5Z" />
    </svg>
  );
}

export function ArrowLeftOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M15.5 4V20L6.5 12L15.5 4Z" />
    </svg>
  );
}

export function ArrowUpOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M20 16.5H4L12 7.5L20 16.5Z" />
    </svg>
  );
}

export function AudioOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M11 19.6951C6.50005 19.1976 3 15.3826 3 10.75H5C5 14.616 8.13401 17.75 12 17.75C15.866 17.75 19 14.616 19 10.75H21C21 15.3826 17.5 19.1976 13 19.6951V21H15V23H9V21H11V19.6951Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M12.0005 1C8.82485 1 6.25049 3.57436 6.25049 6.75V10.75C6.25049 13.9256 8.82485 16.5 12.0005 16.5C14.9219 16.5 17.3345 14.3213 17.702 11.5H14.0005V10H17.7505V7.5H14.0005V6H17.702C17.3345 3.17873 14.9219 1 12.0005 1Z" />
    </svg>
  );
}

export function BarChartOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M14 13H10V11H14V13ZM14 17H10V15H14V17ZM14 21H10V19H14V21Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M21 9H17V7H21V9ZM21 13H17V11H21V13ZM21 17H17V15H21V17ZM21 21H17V19H21V21Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M7 5H3V3H7V5ZM7 9H3V7H7V9ZM7 13H3V11H7V13ZM7 17H3V15H7V17ZM7 21H3V19H7V21Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function BarsOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M1.25 1.25H22.75V6.75H1.25V1.25Z" />
      <path d="M1.25 9.25H22.75V14.75H1.25V9.25Z" />
      <path d="M1.25 17.25H22.75V22.75H1.25V17.25Z" />
    </svg>
  );
}

export function BellOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M4.4094 11.4516C4.62189 7.41446 7.95728 4.25 12 4.25C16.0427 4.25 19.3781 7.41446 19.5906 11.4516L19.5916 11.4713V13.721L21.5677 16.0099C21.6853 16.1461 21.75 16.32 21.75 16.5V19.75H2.25V16.5C2.25 16.32 2.3147 16.1461 2.4323 16.0099L4.40837 13.721V11.4713L4.4094 11.4516Z" />
      <path d="M9.75 3.5C9.75 2.25736 10.7574 1.25 12 1.25C13.2426 1.25 14.25 2.25736 14.25 3.5C14.25 4.74264 13.2426 5.75 12 5.75C10.7574 5.75 9.75 4.74264 9.75 3.5ZM12 2.75C11.5858 2.75 11.25 3.08579 11.25 3.5C11.25 3.91421 11.5858 4.25 12 4.25C12.4142 4.25 12.75 3.91421 12.75 3.5C12.75 3.08579 12.4142 2.75 12 2.75Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M10 18.75C10 19.8546 10.8954 20.75 12 20.75C13.1046 20.75 14 19.8546 14 18.75H16C16 20.9591 14.2091 22.75 12 22.75C9.79086 22.75 8 20.9591 8 18.75H10Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function BookOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M20.752 2.22727C20.752 1.88857 20.5775 1.57402 20.2909 1.39596C20.0042 1.21789 19.6463 1.2017 19.3449 1.35317C19.0399 1.5065 18.7504 1.66301 18.4849 1.80655L18.324 1.89343C18.0088 2.06325 17.7289 2.21041 17.455 2.33443C16.9191 2.57705 16.4383 2.71566 15.8908 2.71552H7.14084C4.99307 2.71552 3.25195 4.46567 3.25195 6.62459V19.3295C3.25195 21.2186 4.77546 22.75 6.6548 22.75H20.752V20.7955H18.8075V17.8635H20.752V2.22727ZM6.65567 17.8635H16.8639L16.8639 20.7955H6.65567C5.85021 20.7955 5.19727 20.1391 5.19727 19.3295C5.19727 18.5199 5.85021 17.8635 6.65567 17.8635Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function BulbOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 6.25C8.84624 6.25 6.25 8.89432 6.25 12.2059C6.25 13.0965 6.43829 13.9391 6.77463 14.6952L5.40413 15.3048C4.98366 14.3597 4.75 13.3096 4.75 12.2059C4.75 8.11033 7.97406 4.75 12 4.75C16.0259 4.75 19.25 8.11033 19.25 12.2059C19.25 13.3096 19.0163 14.3597 18.5959 15.3048L17.2254 14.6952C17.5617 13.9391 17.75 13.0965 17.75 12.2059C17.75 8.89432 15.1538 6.25 12 6.25Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M12.75 1.25V3.75H11.25V1.25H12.75Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M22.75 12.75L20.25 12.75L20.25 11.25L22.75 11.25L22.75 12.75Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M3.75 12.75L1.25 12.75L1.25 11.25L3.75 11.25L3.75 12.75Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M20.131 4.92882L18.3632 6.69659L17.3025 5.63593L19.0703 3.86816L20.131 4.92882Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M5.63661 6.69738L3.86884 4.92961L4.9295 3.86895L6.69727 5.63672L5.63661 6.69738Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M8.00001 15.75H16C16.2247 15.75 16.4376 15.8507 16.58 16.0245C16.7225 16.1983 16.7795 16.4268 16.7354 16.6471L16.4149 18.25H7.58515L7.26457 16.6471C7.2205 16.4268 7.27755 16.1983 7.42 16.0245C7.56245 15.8507 7.77531 15.75 8.00001 15.75Z" />
      <path d="M8.86617 19.75L9.26172 22.1233C9.32199 22.4849 9.63489 22.75 10.0015 22.75H14.0015C14.3681 22.75 14.681 22.4849 14.7413 22.1233L15.1369 19.75H8.86617Z" />
    </svg>
  );
}

export function CalendarOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M7.5 3H16.5V1.5H18.5V3H21C21.4142 3 21.75 3.33579 21.75 3.75V21.75C21.75 22.1642 21.4142 22.5 21 22.5H3C2.58579 22.5 2.25 22.1642 2.25 21.75V3.75C2.25 3.33579 2.58579 3 3 3H5.5V1.5H7.5V3ZM8.5 13H10C10.4142 13 10.75 13.3358 10.75 13.75V17.75H9.25V14.5H8.5V13ZM12 13L15 13C15.2422 13 15.4695 13.1169 15.6102 13.314C15.751 13.5111 15.788 13.764 15.7095 13.9931L14.3392 17.9931L12.9201 17.5069L13.9503 14.5L12 14.5V13ZM6 9.5H18V8H6V9.5Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function CheckCircleOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 22.75C6.06294 22.75 1.25 17.9371 1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75ZM15.2473 7.93933L10.453 13.1694L8.69156 11.4079L7.27734 12.8222L10.5159 16.0607L16.7216 9.29078L15.2473 7.93933Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function CheckOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M8.44242 15.6382L18.3058 5.5L19.7525 6.88095L8.4757 18.4999L4.25195 14.2762L5.66617 12.862L8.44242 15.6382Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function CheckSquareOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M3 2.25C2.58579 2.25 2.25 2.58579 2.25 3V21C2.25 21.4142 2.58579 21.75 3 21.75H21C21.4142 21.75 21.75 21.4142 21.75 21V3C21.75 2.58579 21.4142 2.25 21 2.25H3ZM15.2473 7.93933L10.453 13.1694L8.69156 11.4079L7.27734 12.8222L10.5159 16.0607L16.7216 9.29078L15.2473 7.93933Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function ClockCircleOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM13 11.5858V7H11V12.4142L13.7929 15.2071L15.2071 13.7929L13 11.5858Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function CloseOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 10.2623L18.0123 4.25L19.75 5.98775L13.7377 12L19.75 18.0123L18.0123 19.75L12 13.7377L5.98775 19.75L4.25 18.0123L10.2623 12L4.25 5.98775L5.98775 4.25L12 10.2623Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function CodeOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M7 11H9.00897V13H7V11ZM10.9955 11H13.0045V13H10.9955V11ZM14.991 11H17V13H14.991V11Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M18.5 5H17V3H19.5C20.0523 3 20.5 3.44772 20.5 4V9.66667L21.8 11.4C22.0667 11.7556 22.0667 12.2444 21.8 12.6L20.5 14.3333V20C20.5 20.5523 20.0523 21 19.5 21H17V19H18.5V13.6667L19.75 12L18.5 10.3333V5Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M3.5 4C3.5 3.44772 3.94772 3 4.5 3H7V5H5.5V10.3333L4.25 12L5.5 13.6667V19H7V21H4.5C3.94772 21 3.5 20.5523 3.5 20V14.3333L2.2 12.6C1.93333 12.2444 1.93333 11.7556 2.2 11.4L3.5 9.66667V4Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function CommentOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M5.25 22.75L11.2631 18.75L22.75 18.75V1.25L1.25 1.25V18.75H5.25V22.75ZM8 13.25H16V11.75H8V13.25ZM8 8.25H12V6.75H8V8.25Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function CreditCardOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M1.25 4C1.25 3.58579 1.58579 3.25 2 3.25H22C22.4142 3.25 22.75 3.58579 22.75 4V8.25H1.25V4ZM1.25 9.75H22.75V20C22.75 20.4142 22.4142 20.75 22 20.75H2C1.58579 20.75 1.25 20.4142 1.25 20V9.75ZM11 16.75H13V15.25H11V16.75ZM15 16.75H19V15.25H15V16.75Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function DeleteOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M8.58085 1.85608C8.73843 1.4884 9.09997 1.25 9.5 1.25H14.5C14.9 1.25 15.2616 1.4884 15.4191 1.85608L16.6594 4.75H22V6.75H2V4.75H7.3406L8.58085 1.85608ZM9.51654 4.75H14.4835L13.8406 3.25H10.1594L9.51654 4.75Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M19.2492 22.0449L20.2492 5.54492H3.75195L4.75195 22.0449C4.77595 22.4408 5.10399 22.7495 5.50058 22.7495H18.5006C18.8972 22.7495 19.2252 22.4408 19.2492 22.0449ZM10.501 16.9995V10.9995H8.50098L8.50098 16.9995H10.501ZM15.501 16.9995V10.9995H13.501V16.9995H15.501Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function DownOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M20.0015 7.5H4.00146L12.0015 16.5L20.0015 7.5Z" />
    </svg>
  );
}

export function EnterOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M6.5 8.5L6.5 13H4.5L4.5 8.5C4.5 5.46243 6.96243 3 10 3C13.0376 3 15.5 5.46243 15.5 8.5L15.5 15.5859H19.5L14.5 21.0001L9.49997 15.586H13.5L13.5 8.5C13.5 6.567 11.933 5 10 5C8.067 5 6.5 6.567 6.5 8.5Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function ExclamationCircleFilled(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM13 17V15H11V17H13ZM13 13V7H11V13H13Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function ExclamationCircleOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM13 17V15H11V17H13ZM13 13V7H11V13H13Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function ExperimentOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M5.23295 7.19444H6.14669L6.14669 11.0615L1.34134 21.3657C1.20091 21.6668 1.22355 22.019 1.40135 22.2996C1.57915 22.5801 1.88747 22.75 2.21875 22.75H15.7812C16.1125 22.75 16.4208 22.5802 16.5986 22.2997C16.7764 22.0192 16.7991 21.667 16.6588 21.3659L11.8519 11.051V7.19444H12.7684V5.25H5.23295V7.19444ZM9.53466 13.4359C8.96099 13.056 8.29793 12.6227 7.66016 12.4041L8.08463 11.4939L8.08463 7.19434H9.91488L9.91487 11.4831L10.9162 13.6318C10.8481 13.697 10.7722 13.7456 10.6934 13.773C10.555 13.8211 10.1998 13.8763 9.53466 13.4359Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M11.5728 2.28262C11.6455 2.18633 11.7359 2.07842 11.8447 1.96967C12.1764 1.63792 12.7309 1.25 13.5 1.25C14.0994 1.25 14.7791 1.38531 15.3137 1.86113C15.7178 2.22092 15.9682 2.71139 16.073 3.30813C18.0696 3.64912 19.4216 5.4386 19.6977 7.30011C20.56 7.42834 21.2753 7.79909 21.8017 8.37059C22.4548 9.07979 22.75 10.0249 22.75 11C22.75 13.1293 20.8923 14.75 18.7364 14.75C16.8261 14.75 15.1499 13.4775 14.7928 11.7063C12.418 11.3982 10.5495 9.49757 10.2827 7.09376L8.25 6.58558V6C8.25 5.11876 8.47246 4.40797 8.84471 3.8496C9.21383 3.29592 9.70062 2.93617 10.1646 2.70418C10.6256 2.47366 11.0776 2.36214 11.408 2.30708C11.4663 2.29736 11.5214 2.2893 11.5728 2.28262Z" />
    </svg>
  );
}

export function FileImageOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M2.25 3C2.25 2.58579 2.58579 2.25 3 2.25H21C21.4142 2.25 21.75 2.58579 21.75 3V21C21.75 21.4142 21.4142 21.75 21 21.75H3C2.58579 21.75 2.25 21.4142 2.25 21V3ZM3.75 3.75V20.25H20.25V3.75H3.75Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M3 2C2.44772 2 2 2.44772 2 3V21C2 21.5523 2.44772 22 3 22H21C21.5523 22 22 21.5523 22 21V3C22 2.44772 21.5523 2 21 2H3ZM4 19.7085V4H20V14.1314L14.9397 10.7578L4 19.7085Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function FileTextOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M2.75 21.7727C2.75 22.3125 3.18593 22.75 3.72368 22.75H13.8638L21.25 15.3366V2.22727C21.25 1.68754 20.8141 1.25 20.2763 1.25H2.75V21.7727ZM12.4869 20.7954H4.69747V3.2045H19.3027V13.9545H12.4869L12.4869 20.7954Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M16 8H8V6H16V8ZM12 12H8V10H12V12Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function FilterOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M2.46961 2.46973C2.61027 2.32904 2.80106 2.25 3 2.25H21C21.4142 2.25 21.75 2.58579 21.75 3V7.35128L15.7017 12.3915L14.6869 19.4951L10.3354 21.6708C10.1161 21.7805 9.85699 21.776 9.64159 21.6588C9.42618 21.5416 9.28167 21.3265 9.25459 21.0828L8.28792 12.3829L2.25094 7.35131L2.25 3.00016C2.24996 2.80122 2.32896 2.61041 2.46961 2.46973Z" />
    </svg>
  );
}

export function FormOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M17.75 17.5V14.5H19.75V17.5L22.75 17.5V19.5H19.75V22.5H17.75V19.5H14.75V17.5L17.75 17.5Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M7 3H10V1.5H12V3H15V1.5H17V3H20C20.4142 3 20.75 3.33579 20.75 3.75V13H16.25V16L13.25 16V21H16.25V22.5L2 22.5C1.58579 22.5 1.25 22.1642 1.25 21.75V3.75C1.25 3.33579 1.58579 3 2 3H5V1.5H7V3ZM7 10.5H15V9H7V10.5ZM7 15.5H11V14H7V15.5Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function HistoryOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M15.25 17C15.25 16.5858 15.5858 16.25 16 16.25H22C22.4142 16.25 22.75 16.5858 22.75 17V22C22.75 22.4142 22.4142 22.75 22 22.75H16C15.5858 22.75 15.25 22.4142 15.25 22V17Z" />
      <path d="M1.25 17C1.25 16.5858 1.58579 16.25 2 16.25H8C8.41421 16.25 8.75 16.5858 8.75 17V22C8.75 22.4142 8.41421 22.75 8 22.75H2C1.58579 22.75 1.25 22.4142 1.25 22V17Z" />
      <path d="M4.00105 13.9997C4.00124 13.4475 4.4489 13 5.00105 13H19C19.5523 13 20 13.4477 20 14V17H18V15H6.0007L6 17.0003L4 16.9997L4.00105 13.9997Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M12 1.25C9.1005 1.25 6.75 3.6005 6.75 6.5C6.75 9.3995 9.1005 11.75 12 11.75C14.8995 11.75 17.25 9.3995 17.25 6.5C17.25 3.6005 14.8995 1.25 12 1.25ZM12.2072 7.70718L14.2072 5.70718L12.793 4.29297L10.793 6.29297L12.2072 7.70718Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function InfoCircleOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 22.75C6.06294 22.75 1.25 17.9371 1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75ZM11 6.5V8H13V6.5H11ZM10 11H11V17H13V9H10V11Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function LayoutOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M3 2.25C2.58579 2.25 2.25 2.58579 2.25 3V8H21.75V3C21.75 2.58579 21.4142 2.25 21 2.25H3Z" />
      <path d="M21.75 10H9V21.75H21C21.4142 21.75 21.75 21.4142 21.75 21V10Z" />
      <path d="M7 21.75V10H2.25V21C2.25 21.4142 2.58579 21.75 3 21.75H7Z" />
    </svg>
  );
}

export function LeftOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M15.5 4V20L6.5 12L15.5 4Z" />
    </svg>
  );
}

export function LineChartOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M4.5 19.5V2.5H2.5V20.5C2.5 21.0523 2.94772 21.5 3.5 21.5H21.5V19.5H4.5Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M17.8916 11.2826C17.3695 12.1953 16.5353 13.1353 15.1866 13.1353C14.331 13.1353 13.7047 12.678 13.2707 12.212C12.8665 11.778 12.5278 11.2256 12.2518 10.7754C12.2409 10.7577 12.2301 10.7402 12.2195 10.7228C11.9091 10.217 11.665 9.82895 11.407 9.55578C11.1642 9.2987 11.0216 9.2643 10.9284 9.2643C10.8449 9.2643 10.676 9.29861 10.4078 9.47484C10.1427 9.64902 9.83668 9.92569 9.50053 10.3113C8.82801 11.0827 8.13098 12.1783 7.48256 13.4134C6.17591 15.9023 5.18802 18.7202 4.99066 20.1379L3.00977 19.8621C3.25179 18.1236 4.3521 15.0736 5.71176 12.4837C6.39649 11.1794 7.17714 9.93287 7.99297 8.99703C8.401 8.52899 8.84181 8.11072 9.30951 7.80339C9.77411 7.4981 10.3239 7.2643 10.9284 7.2643C11.7861 7.2643 12.4183 7.71378 12.861 8.18251C13.2788 8.62488 13.6247 9.18863 13.9047 9.64517L13.9241 9.67678C14.2362 10.1854 14.4783 10.5741 14.7342 10.8489C14.9762 11.1087 15.1104 11.1353 15.1866 11.1353C15.4413 11.1353 15.7515 10.9959 16.1557 10.2894C16.5439 9.6108 16.856 8.68853 17.2164 7.62364C17.2306 7.58161 17.2449 7.53936 17.2593 7.49689C17.6167 6.44163 18.0283 5.24453 18.6111 4.31714C19.2065 3.36994 20.1145 2.5 21.5002 2.5V4.5C21.1 4.5 20.7268 4.70948 20.3045 5.38139C19.8697 6.07312 19.5274 7.03484 19.1537 8.13841C19.1307 8.20609 19.1077 8.27441 19.0844 8.34324C18.7504 9.33246 18.3804 10.4284 17.8916 11.2826Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function LinkOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M16.8088 4.19116C15.2206 2.60295 12.6456 2.60295 11.0574 4.19116L8.19116 7.05741C6.60295 8.64563 6.60295 11.2206 8.19116 12.8088C9.77937 14.3971 12.3544 14.3971 13.9426 12.8088L14.1495 12.6019L15.5637 14.0161L15.3568 14.2231C13.0339 16.546 9.29592 16.5914 6.91764 14.3594C5.60888 15.9568 5.70006 18.3177 7.19116 19.8088C8.77937 21.3971 11.3544 21.3971 12.9426 19.8088L15.8088 16.9426C17.3971 15.3544 17.3971 12.7794 15.8088 11.1912C14.2206 9.60295 11.6456 9.60295 10.0574 11.1912L9.85049 11.3981L8.43628 9.98387L8.6432 9.77695C10.9661 7.45403 14.7041 7.4086 17.0824 9.64064C18.3911 8.04317 18.2999 5.68226 16.8088 4.19116ZM18.315 11.2629C20.5919 8.88711 20.5613 5.11516 18.2231 2.77695C15.8538 0.407685 12.0125 0.407685 9.6432 2.77695L6.77695 5.6432C4.85679 7.56335 4.49282 10.4504 5.68502 12.7371C3.40809 15.1129 3.43873 18.8848 5.77695 21.2231C8.14621 23.5923 11.9875 23.5923 14.3568 21.2231L17.2231 18.3568C19.1432 16.4366 19.5072 13.5496 18.315 11.2629Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function LockOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM9.25 10C9.25 8.48122 10.4812 7.25 12 7.25C13.5188 7.25 14.75 8.48122 14.75 10C14.75 11.166 14.0243 12.1625 13 12.5625V17H11V12.5625C9.97566 12.1625 9.25 11.166 9.25 10Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function LogoutOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M13.1 4C8.28858 4 4.5 7.64154 4.5 12C4.5 16.3585 8.28858 20 13.1 20C13.5301 20 13.9522 19.9707 14.3643 19.9142L14.6357 21.8957C14.1338 21.9645 13.621 22 13.1 22C7.30756 22 2.5 17.5827 2.5 12C2.5 6.41734 7.30756 2 13.1 2C13.621 2 14.1338 2.03552 14.6357 2.10427L14.3643 4.08576C13.9522 4.02931 13.5301 4 13.1 4Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M17.6716 13.0001L16.3786 14.293L17.7928 15.7072L21.5002 12.0001L17.7928 8.29297L16.3786 9.70723L17.6716 11.0001H10.0859V13.0001H17.6716Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function MenuFoldOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M10.25 2.25H22C22.4142 2.25 22.75 2.58579 22.75 3V21C22.75 21.4142 22.4142 21.75 22 21.75H10.25L10.25 2.25Z" />
      <path d="M2.00195 21.75H8.75195L8.75195 2.25H2.00195C1.58774 2.25 1.25195 2.58579 1.25195 3V21C1.25195 21.4142 1.58774 21.75 2.00195 21.75ZM6.24805 7.70544H3.74805V6.20544H6.24805V7.70544ZM6.24805 10.7054H3.74805V9.20544H6.24805V10.7054Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function MenuUnfoldOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M13.75 2.25H2C1.58579 2.25 1.25 2.58579 1.25 3V21C1.25 21.4142 1.58579 21.75 2 21.75H13.75L13.75 2.25Z" />
      <path d="M22 21.75H15.25V2.25H22C22.4142 2.25 22.75 2.58579 22.75 3V21C22.75 21.4142 22.4142 21.75 22 21.75ZM17.75 7.70544H20.25V6.20544H17.75V7.70544ZM17.75 10.7054H20.25V9.20544H17.75V10.7054Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function MessageOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 1.25C6.10029 1.25 1.25 5.80369 1.25 11.5C1.25 14.2189 2.36071 16.6855 4.16134 18.5143L3.25001 22.75L8.01735 21.0233C9.25046 21.4925 10.5948 21.75 12 21.75C17.8997 21.75 22.75 17.1963 22.75 11.5C22.75 5.80369 17.8997 1.25 12 1.25ZM9.00897 11H7V13H9.00897V11ZM13.0045 13V11H10.9955V13H13.0045ZM17 11H14.991V13H17V11Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function NodeIndexOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M13.25 6.75C13.25 4.40279 15.1528 2.5 17.5 2.5C19.8472 2.5 21.75 4.40279 21.75 6.75C21.75 9.09721 19.8472 11 17.5 11C15.1528 11 13.25 9.09721 13.25 6.75Z" />
      <path d="M2.25 3.25C2.25 2.83579 2.58579 2.5 3 2.5H9.5C9.91421 2.5 10.25 2.83579 10.25 3.25V9.75C10.25 10.1642 9.91421 10.5 9.5 10.5H3C2.58579 10.5 2.25 10.1642 2.25 9.75V3.25Z" />
      <path d="M2.25 14.25C2.25 13.8358 2.58579 13.5 3 13.5H9.5C9.91421 13.5 10.25 13.8358 10.25 14.25V20.75C10.25 21.1642 9.91421 21.5 9.5 21.5H3C2.58579 21.5 2.25 21.1642 2.25 20.75V14.25Z" />
      <path d="M13.25 14.25C13.25 13.8358 13.5858 13.5 14 13.5H20.5C20.9142 13.5 21.25 13.8358 21.25 14.25V20.75C21.25 21.1642 20.9142 21.5 20.5 21.5H14C13.5858 21.5 13.25 21.1642 13.25 20.75V14.25Z" />
      <path d="M14 7.75H10V5.75H14V7.75ZM16.5 14.25V10.25H18.5V14.25H16.5ZM10 16.75H14V18.75H10V16.75Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function PaperClipOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M9.74874 4.98633C8.43363 3.67122 6.30143 3.67122 4.98633 4.98633C3.67122 6.30143 3.67122 8.43363 4.98633 9.74874L6.53048 11.2929L5.11627 12.7071L3.57211 11.163C1.47596 9.0668 1.47596 5.66827 3.57211 3.57211C5.66827 1.47596 9.0668 1.47596 11.163 3.57211L20.4279 12.837C22.524 14.9332 22.524 18.3317 20.4279 20.4279C18.3317 22.524 14.9332 22.524 12.837 20.4279L9.3627 16.9535C7.90616 15.497 7.90616 13.1355 9.3627 11.6789C10.8192 10.2224 13.1808 10.2224 14.6373 11.6789L16.5675 13.6091L15.1533 15.0233L13.2231 13.0931C12.5476 12.4177 11.4524 12.4177 10.7769 13.0931C10.1014 13.7686 10.1014 14.8638 10.7769 15.5393L14.2513 19.0137C15.5664 20.3288 17.6986 20.3288 19.0137 19.0137C20.3288 17.6986 20.3288 15.5664 19.0137 14.2513L9.74874 4.98633Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function PlusOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M10.75 13.25V20H13.25V13.25H20V10.75H13.25V4H10.75V10.75H4V13.25H10.75Z" />
    </svg>
  );
}

export function ProductOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M2.82902 5.13188C2.47692 5.28435 2.25 5.62457 2.25 6V18.4874L11.6954 22.6854C11.8893 22.7715 12.1107 22.7715 12.3046 22.6854L21.75 18.4874V6C21.75 5.62457 21.5231 5.28435 21.171 5.13188L12.396 1.33188C12.1439 1.22271 11.8561 1.22271 11.604 1.33188L2.82902 5.13188ZM7.61244 6.86037L5.62566 6L12 3.2396L13.9868 4.09997L7.61244 6.86037ZM10.0131 7.89997L16.3874 5.13957L18.3743 6L12 8.7604L10.0131 7.89997ZM6 12.5L8.5 14V12.5L6 11V12.5Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function QuestionCircleOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM10.5 10C10.5 9.17157 11.1716 8.5 12 8.5C12.8284 8.5 13.5 9.17157 13.5 10C13.5 10.8284 12.8284 11.5 12 11.5C11.4477 11.5 11 11.9477 11 12.5V14.5H13V13.3551C14.4457 12.9248 15.5 11.5855 15.5 10C15.5 8.067 13.933 6.5 12 6.5C10.067 6.5 8.5 8.067 8.5 10H10.5ZM11 16V17.5H13V16H11Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function ReloadOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M15.9686 1.25098L16.6528 3.9152C16.7487 4.28871 16.6213 4.6841 16.3254 4.93135C16.0294 5.1786 15.6177 5.23366 15.2672 5.07284C14.2759 4.61801 13.1696 4.36336 12 4.36336C7.70743 4.36336 4.25 7.79455 4.25 11.9997C4.25 13.4732 4.67255 14.847 5.40528 16.0131L3.71183 17.0772C2.7854 15.6028 2.25 13.8619 2.25 11.9997C2.25 6.66542 6.62759 2.36336 12 2.36336C12.7758 2.36336 13.5313 2.4531 14.256 2.62284L14.0314 1.74846L15.9686 1.25098ZM19.75 11.9997C19.75 10.5263 19.3275 9.15243 18.5947 7.9863L20.2882 6.92223C21.2146 8.39664 21.75 10.1376 21.75 11.9997C21.75 17.334 17.3724 21.6361 12 21.6361C11.2242 21.6361 10.4687 21.5463 9.74402 21.3766L9.96857 22.251L8.03143 22.7485L7.34722 20.0842C7.2513 19.7107 7.37869 19.3153 7.67463 19.0681C7.97057 18.8208 8.38231 18.7658 8.73281 18.9266C9.72411 19.3814 10.8304 19.6361 12 19.6361C16.2926 19.6361 19.75 16.2049 19.75 11.9997Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function RightOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M7.5 4V20L16.5 12L7.5 4Z" />
    </svg>
  );
}

export function RiseOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M3 20V3H1V21C1 21.5523 1.44772 22 2 22H20V20H3Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M13.6265 15.2538C15.4215 13.6888 16.6373 11.4541 17.068 8.50117L18.482 10.1508L20.0005 8.84921L16.4626 4.72173L12.2451 7.13176L13.2373 8.86824L15.1456 7.77783C14.8311 10.5672 13.7656 12.4791 12.3122 13.7462C10.5443 15.2876 8.05905 16 5.24121 16V18C8.3652 18 11.38 17.2124 13.6265 15.2538Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function RobotOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M1.25 14.5C1.25 12.9812 2.48122 11.75 4 11.75V13.25C3.30964 13.25 2.75 13.8096 2.75 14.5C2.75 15.1904 3.30964 15.75 4 15.75V17.25C2.48122 17.25 1.25 16.0188 1.25 14.5Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M21.25 14.5C21.25 13.8096 20.6904 13.25 20 13.25V11.75C21.5188 11.75 22.75 12.9812 22.75 14.5C22.75 16.0188 21.5188 17.25 20 17.25V15.75C20.6904 15.75 21.25 15.1904 21.25 14.5Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M8.25 6L8.25 9L6.75 9L6.75 6L8.25 6Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M17.25 6L17.25 9L15.75 9L15.75 6L17.25 6Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M7.5 3.75C7.08579 3.75 6.75 4.08579 6.75 4.5C6.75 4.91421 7.08579 5.25 7.5 5.25C7.91421 5.25 8.25 4.91421 8.25 4.5C8.25 4.08579 7.91421 3.75 7.5 3.75ZM5.25 4.5C5.25 3.25736 6.25736 2.25 7.5 2.25C8.74264 2.25 9.75 3.25736 9.75 4.5C9.75 5.74264 8.74264 6.75 7.5 6.75C6.25736 6.75 5.25 5.74264 5.25 4.5Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M16.5 3.75C16.0858 3.75 15.75 4.08579 15.75 4.5C15.75 4.91421 16.0858 5.25 16.5 5.25C16.9142 5.25 17.25 4.91421 17.25 4.5C17.25 4.08579 16.9142 3.75 16.5 3.75ZM14.25 4.5C14.25 3.25736 15.2574 2.25 16.5 2.25C17.7426 2.25 18.75 3.25736 18.75 4.5C18.75 5.74264 17.7426 6.75 16.5 6.75C15.2574 6.75 14.25 5.74264 14.25 4.5Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M4.5 8.25C4.08579 8.25 3.75 8.58579 3.75 9L3.75 21C3.75 21.4142 4.08579 21.75 4.5 21.75L19.5 21.75C19.9142 21.75 20.25 21.4142 20.25 21L20.25 9C20.25 8.58579 19.9142 8.25 19.5 8.25L4.5 8.25ZM13.9531 15.4863C13.5397 15.9267 12.8379 16.2497 11.9999 16.2497C11.1619 16.2497 10.4601 15.9267 10.0467 15.4863L8.95313 16.513C9.67987 17.2871 10.7933 17.7497 11.9999 17.7497C13.2065 17.7497 14.32 17.2871 15.0467 16.513L13.9531 15.4863ZM8 13C8 12.4477 8.44772 12 9 12H9.00896C9.56125 12 10.009 12.4477 10.009 13C10.009 13.5523 9.56125 14 9.00896 14H9C8.44772 14 8 13.5523 8 13ZM15 12C14.4477 12 14 12.4477 14 13C14 13.5523 14.4477 14 15 14H15.009C15.5612 14 16.009 13.5523 16.009 13C16.009 12.4477 15.5612 12 15.009 12H15Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function SafetyCertificateOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M7.19426 2.8128C8.53664 2.08008 10.0574 1.25 11.9998 1.25C13.9514 1.25 15.4742 2.08191 16.8176 2.81581L16.863 2.84064C18.2546 3.60075 19.4623 4.2476 20.9857 4.2476H21.58L21.7159 4.82563C23.7855 13.6288 19.6501 21.1096 12.1571 22.7163L11.9997 22.75L11.8424 22.7163C4.34935 21.1096 0.214124 13.6288 2.2837 4.82563L2.41959 4.2476H3.01383C4.53955 4.2476 5.75106 3.60038 7.14351 2.8405L7.19426 2.8128ZM11.0001 16.4143L17.7072 9.70718L16.293 8.29297L11.0001 13.5859L9.70718 12.293L8.29297 13.7072L11.0001 16.4143Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function SafetyOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M11.9978 1.25C10.0554 1.25 8.53468 2.08008 7.19231 2.8128L7.14156 2.8405C5.74911 3.60038 4.53759 4.2476 3.01188 4.2476H2.41764L2.28175 4.82563C0.212171 13.6288 4.34739 21.1096 11.8404 22.7163L11.9978 22.75L12.1552 22.7163C19.6482 21.1096 23.7835 13.6288 21.7139 4.82563L21.578 4.2476H20.9838C19.4604 4.2476 18.2527 3.60075 16.8611 2.84064L16.8156 2.81581C15.4722 2.08191 13.9495 1.25 11.9978 1.25ZM10.998 7V10H12.998V7H10.998Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function ScheduleOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M11 7H13V11.5858L14.7071 13.2929L13.2929 14.7071L11 12.4142V7Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M15.5399 14.4077C15.7817 14.2199 16.1134 14.1979 16.3779 14.3522L22.3779 17.8522C22.6084 17.9866 22.75 18.2333 22.75 18.5C22.75 18.7668 22.6084 19.0134 22.3779 19.1478L16.3779 22.6478C16.1134 22.8021 15.7817 22.7801 15.5399 22.5923C15.2981 22.4044 15.1948 22.0884 15.2789 21.794L16.22 18.5L15.2789 15.206C15.1948 14.9116 15.2981 14.5956 15.5399 14.4077Z" />
      <path d="M12 3.20455C7.1424 3.20455 3.20455 7.1424 3.20455 12C3.20455 16.8576 7.1424 20.7955 12 20.7955C12.3054 20.7955 12.6069 20.7799 12.9037 20.7497L13.1019 22.6941C12.7393 22.7311 12.3717 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 12.735 22.6761 13.4538 22.535 14.149L20.6195 13.7601C20.7348 13.1922 20.7955 12.6037 20.7955 12C20.7955 7.1424 16.8576 3.20455 12 3.20455Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function SearchOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M1 11C1 5.47715 5.47715 1 11 1C16.5228 1 21 5.47715 21 11C21 13.4013 20.1536 15.6049 18.7429 17.3287L23 21.5858L21.5858 23L17.3287 18.7429C15.6049 20.1536 13.4013 21 11 21C5.47715 21 1 16.5228 1 11ZM11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function SendOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M22.2119 2.73602C22.3006 2.46831 22.2317 2.17343 22.0334 1.97283C21.8352 1.77222 21.5412 1.6998 21.2724 1.78539L2.27241 7.83639C1.97497 7.93112 1.7673 8.20018 1.75103 8.51193C1.73475 8.82367 1.91328 9.1129 2.19925 9.23808L10.1996 12.7402L14.4705 8.46965L15.5311 9.53034L11.2403 13.8208L14.5075 21.7843C14.6266 22.0746 14.9138 22.2601 15.2273 22.2492C15.5409 22.2383 15.8146 22.0335 15.9133 21.7357L22.2119 2.73602Z" />
    </svg>
  );
}

export function SettingOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M9.0475 1.25C8.63329 1.25 8.2975 1.58579 8.2975 2V4.15233L7.15452 4.82396L5.33227 3.75501C5.15915 3.65346 4.95256 3.62553 4.75869 3.67747C4.56483 3.72941 4.39987 3.85689 4.30071 4.03139L1.34804 9.22754C1.14539 9.58417 1.26683 10.0374 1.62064 10.245L3.45164 11.3191L3.45164 12.681L1.62074 13.755C1.26693 13.9626 1.14549 14.4158 1.34814 14.7725L4.30081 19.9686C4.39997 20.1431 4.56493 20.2706 4.75879 20.3225C4.95266 20.3745 5.15925 20.3465 5.33237 20.245L7.15457 19.1761L8.2975 19.8477V22C8.2975 22.4142 8.63329 22.75 9.0475 22.75H14.9528C15.367 22.75 15.7028 22.4142 15.7028 22V19.8477L16.8457 19.1761L18.6679 20.245C18.841 20.3465 19.0476 20.3745 19.2414 20.3225C19.4353 20.2706 19.6003 20.1431 19.6994 19.9686L22.6521 14.7725C22.8547 14.4158 22.7333 13.9626 22.3795 13.755L20.5487 12.681L20.5487 11.319L22.3796 10.245C22.7334 10.0374 22.8548 9.58417 22.6522 9.22754L19.6995 4.03139C19.6004 3.85689 19.4354 3.72941 19.2415 3.67747C19.0477 3.62553 18.8411 3.65346 18.668 3.75501L16.8458 4.82393L15.7028 4.15233V2C15.7028 1.58579 15.367 1.25 14.9528 1.25H9.0475ZM12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function SortAscendingOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M17.2933 3.58594L21.0004 7.29304L19.5862 8.70726L18.2933 7.41436V14.0002C18.2933 14.2886 18.1688 14.5629 17.9518 14.7528L13.9518 18.2528L12.6348 16.7477L16.2933 13.5465V7.41437L15.0004 8.70726L13.5862 7.29304L17.2933 3.58594Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M10 3H3V10H10V3Z" />
      <path d="M10 14H3V21H10V14Z" />
    </svg>
  );
}

export function StarFilled(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 1.25C12.2668 1.25 12.5134 1.39168 12.6478 1.6221L15.989 7.34985L22.1834 8.91209C22.4402 8.97684 22.6437 9.17215 22.719 9.42598C22.7943 9.67981 22.7302 9.95455 22.5504 10.1488L18.318 14.7204L19.9122 21.836C19.9735 22.1096 19.8771 22.3946 19.6622 22.5747C19.4473 22.7549 19.1499 22.8001 18.8912 22.692L12 19.8128L5.10881 22.692C4.85009 22.8001 4.55269 22.7549 4.33782 22.5747C4.12295 22.3946 4.02652 22.1096 4.08782 21.836L5.68203 14.7204L1.44966 10.1488C1.26979 9.95455 1.20568 9.67981 1.281 9.42598C1.35631 9.17215 1.55988 8.97684 1.81661 8.91209L8.01099 7.34985L11.3522 1.6221C11.4866 1.39168 11.7333 1.25 12 1.25Z" />
    </svg>
  );
}

export function StarOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12 1.25C12.2668 1.25 12.5134 1.39168 12.6478 1.6221L15.989 7.34985L22.1834 8.91209C22.4402 8.97684 22.6437 9.17215 22.719 9.42598C22.7943 9.67981 22.7302 9.95455 22.5504 10.1488L18.318 14.7204L19.9122 21.836C19.9735 22.1096 19.8771 22.3946 19.6622 22.5747C19.4473 22.7549 19.1499 22.8001 18.8912 22.692L12 19.8128L5.10881 22.692C4.85009 22.8001 4.55269 22.7549 4.33782 22.5747C4.12295 22.3946 4.02652 22.1096 4.08782 21.836L5.68203 14.7204L1.44966 10.1488C1.26979 9.95455 1.20568 9.67981 1.281 9.42598C1.35631 9.17215 1.55988 8.97684 1.81661 8.91209L8.01099 7.34985L11.3522 1.6221C11.4866 1.39168 11.7333 1.25 12 1.25Z" />
    </svg>
  );
}

export function StopOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M3.25 4C3.25 3.58579 3.58579 3.25 4 3.25H20C20.4142 3.25 20.75 3.58579 20.75 4V20C20.75 20.4142 20.4142 20.75 20 20.75H4C3.58579 20.75 3.25 20.4142 3.25 20V4Z" />
    </svg>
  );
}

export function TeamOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M7.75 7.5C7.75 5.15279 9.65279 3.25 12 3.25C14.3472 3.25 16.25 5.15279 16.25 7.5C16.25 9.84721 14.3472 11.75 12 11.75C9.65279 11.75 7.75 9.84721 7.75 7.5Z" />
      <path d="M4.25 20C4.25 16.1678 7.83242 13.25 12 13.25C16.1676 13.25 19.75 16.1678 19.75 20V20.75H4.25V20Z" />
      <path d="M7.23113 4.75809C6.76605 5.56524 6.5 6.50155 6.5 7.5C6.5 8.89211 7.0172 10.1634 7.86994 11.1323C7.59306 11.209 7.30133 11.25 7.00002 11.25C5.20511 11.25 3.74998 9.79494 3.74998 8C3.74998 6.20506 5.20511 4.75 7.00002 4.75C7.07772 4.75 7.15479 4.75273 7.23113 4.75809Z" />
      <path d="M8.786 12.5328C5.91139 13.5128 3.61372 15.7763 3.10517 18.75H1.25V18C1.25 14.8244 3.82436 12.25 7 12.25C7.62349 12.25 8.2238 12.3492 8.786 12.5328Z" />
      <path d="M20.8957 18.75H22.7508V18C22.7508 14.8244 20.1765 12.25 17.0008 12.25C16.3774 12.25 15.777 12.3492 15.2148 12.5328C18.0895 13.5128 20.3871 15.7763 20.8957 18.75Z" />
      <path d="M16.1309 11.1323C16.4078 11.209 16.6995 11.25 17.0009 11.25C18.7958 11.25 20.2509 9.79493 20.2509 8C20.2509 6.20507 18.7958 4.75 17.0009 4.75C16.9231 4.75 16.8461 4.75273 16.7697 4.75809C17.2348 5.56524 17.5008 6.50155 17.5008 7.5C17.5008 8.89211 16.9836 10.1634 16.1309 11.1323Z" />
    </svg>
  );
}

export function UserOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M2.25 22C2.25 17.0869 6.70071 13.25 12 13.25C17.2993 13.25 21.75 17.0869 21.75 22V22.75H2.25V22Z" />
      <path d="M6.75 6.5C6.75 3.6005 9.1005 1.25 12 1.25C14.8995 1.25 17.25 3.6005 17.25 6.5C17.25 9.39949 14.8995 11.75 12 11.75C9.1005 11.75 6.75 9.39949 6.75 6.5Z" />
    </svg>
  );
}

export function WarningFilled(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12.6556 2.63577C12.5233 2.39767 12.2724 2.25 12 2.25C11.7276 2.25 11.4767 2.39767 11.3444 2.63577L1.34438 20.6358C1.21533 20.8681 1.21883 21.1513 1.3536 21.3803C1.48836 21.6094 1.73426 21.75 2 21.75H22C22.2657 21.75 22.5116 21.6094 22.6464 21.3803C22.7812 21.1513 22.7847 20.8681 22.6556 20.6358L12.6556 2.63577ZM11.25 10V11.5H12.75V10H11.25ZM10 14.25H11.25V18.5H12.75V12.75H10V14.25Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function WarningOutlined(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M12.6556 2.63577C12.5233 2.39767 12.2724 2.25 12 2.25C11.7276 2.25 11.4767 2.39767 11.3444 2.63577L1.34438 20.6358C1.21533 20.8681 1.21883 21.1513 1.3536 21.3803C1.48836 21.6094 1.73426 21.75 2 21.75H22C22.2657 21.75 22.5116 21.6094 22.6464 21.3803C22.7812 21.1513 22.7847 20.8681 22.6556 20.6358L12.6556 2.63577ZM11.25 10V11.5H12.75V10H11.25ZM10 14.25H11.25V18.5H12.75V12.75H10V14.25Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function DashboardSquareIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M1.25 2C1.25 1.58579 1.58579 1.25 2 1.25H10C10.4142 1.25 10.75 1.58579 10.75 2V10C10.75 10.4142 10.4142 10.75 10 10.75H2C1.58579 10.75 1.25 10.4142 1.25 10V2Z" />
      <path d="M13.25 2C13.25 1.58579 13.5858 1.25 14 1.25H22C22.4142 1.25 22.75 1.58579 22.75 2V10C22.75 10.4142 22.4142 10.75 22 10.75H14C13.5858 10.75 13.25 10.4142 13.25 10V2Z" />
      <path d="M1.25 14C1.25 13.5858 1.58579 13.25 2 13.25H10C10.4142 13.25 10.75 13.5858 10.75 14V22C10.75 22.4142 10.4142 22.75 10 22.75H2C1.58579 22.75 1.25 22.4142 1.25 22V14Z" />
      <path d="M13.25 14C13.25 13.5858 13.5858 13.25 14 13.25H22C22.4142 13.25 22.75 13.5858 22.75 14V22C22.75 22.4142 22.4142 22.75 22 22.75H14C13.5858 22.75 13.25 22.4142 13.25 22V14Z" />
    </svg>
  );
}

export function SearchCircleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3Z" fillRule="evenodd" clipRule="evenodd" />
      <path d="M7 11.6C7 9.05949 9.05949 7 11.6 7C14.1405 7 16.2 9.05949 16.2 11.6C16.2 12.5083 15.9368 13.355 15.4824 14.0682L17.2071 15.7929L15.7929 17.2071L14.0682 15.4824C13.355 15.9368 12.5083 16.2 11.6 16.2C9.05949 16.2 7 14.1405 7 11.6ZM11.6 9C10.1641 9 9 10.1641 9 11.6C9 13.0359 10.1641 14.2 11.6 14.2C13.0359 14.2 14.2 13.0359 14.2 11.6C14.2 10.1641 13.0359 9 11.6 9Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

// NB: the uploaded pack has no "token-circle" icon (no Crypto/Token category) — using a plain
// solid circle as a neutral placeholder brand mark. Swap the path below if you add that icon later.
export function TokenCircleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12Z" />
    </svg>
  );
}

// NB: the uploaded pack has no "Activity01" icon (no Activity/Health category) — using
// Business and Finance/analytics-02.svg as the closest analytics-style substitute.
export function Activity01Icon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M15.25 5C15.25 2.92893 16.9289 1.25 19 1.25C21.0711 1.25 22.75 2.92893 22.75 5C22.75 7.07107 21.0711 8.75 19 8.75C16.9289 8.75 15.25 7.07107 15.25 5Z" />
      <path d="M13.75 5C13.75 4.38639 13.8553 3.79736 14.0487 3.25H2C1.58579 3.25 1.25 3.58579 1.25 4V22C1.25 22.4142 1.58579 22.75 2 22.75H20C20.4142 22.75 20.75 22.4142 20.75 22V9.95126C20.2026 10.1447 19.6136 10.25 19 10.25C16.1005 10.25 13.75 7.8995 13.75 5ZM11.75 18V9H10.25V18H11.75ZM16.75 18V14H15.25V18H16.75ZM6.75 18V15H5.25V18H6.75Z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}
