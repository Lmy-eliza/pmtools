import { NavLink } from 'react-router-dom';
import { Clock } from 'lucide-react';

const navItems = [
  { to: '/', label: '执行' },
  { to: '/analytics', label: '统计' },
  { to: '/settings', label: '设置' },
];

export default function Navbar() {
  return (
    <nav className="glass sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🕐</span>
        <span className="font-semibold text-gray-800 text-lg tracking-tight">
          Work Timer
        </span>
      </div>

      {/* Nav Links */}
      <div className="flex items-center gap-1 bg-gray-100/60 rounded-xl p-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* Spacer */}
      <div className="w-32" />
    </nav>
  );
}
