import { NavLink } from 'react-router-dom';
import { Home, Package, ClipboardList, Calendar, MoreHorizontal } from 'lucide-react';

const items = [
  { to: '/', label: 'ホーム', icon: Home, end: true },
  { to: '/ingredients', label: '食材', icon: Package, end: false },
  { to: '/records', label: '記録', icon: ClipboardList, end: false },
  { to: '/calendar', label: 'カレンダー', icon: Calendar, end: false },
  { to: '/more', label: 'その他', icon: MoreHorizontal, end: false },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon size={22} strokeWidth={2.2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
