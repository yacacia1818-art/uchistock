import type { ReactNode } from 'react';

interface HeaderProps {
  icon?: ReactNode;
  title: string;
  actions?: ReactNode;
}

export function Header({ icon, title, actions }: HeaderProps) {
  return (
    <div className="header-bar">
      <div className="header-title">
        {icon}
        <span>{title}</span>
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  );
}
