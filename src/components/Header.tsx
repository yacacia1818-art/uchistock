import type { ReactNode } from 'react';

interface HeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Header({ icon, title, subtitle, actions }: HeaderProps) {
  return (
    <div className="header-bar">
      <div>
        <div className="header-title">
          {icon}
          <span>{title}</span>
        </div>
        {subtitle && <div className="header-subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  );
}
