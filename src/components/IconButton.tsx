import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  variant?: 'ghost' | 'filled';
  children?: ReactNode;
}

function IconButton({
  icon,
  label,
  variant = 'ghost',
  children,
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`icon-button ${variant === 'filled' ? 'is-filled' : ''} ${className}`.trim()}
      {...props}
    >
      <span className="material-symbols-outlined" aria-hidden>
        {icon}
      </span>
      {children ? <span className="icon-button-text">{children}</span> : null}
    </button>
  );
}

export default IconButton;
