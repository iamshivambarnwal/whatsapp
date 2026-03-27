import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, Send, Users, Zap, BarChart3,
  Key, CreditCard, Settings, ChevronRight
} from 'lucide-react';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
  { to: '/campaigns', icon: Send, label: 'Campaigns' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/automation', icon: Zap, label: 'Automation' },
  { to: '/messages', icon: BarChart3, label: 'Messages' },
  { to: '/api-settings', icon: Key, label: 'API Settings' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center font-bold text-gray-900">W</div>
          <span className="font-bold text-sm tracking-wide">WhatsApp SaaS</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-green-500/10 text-green-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`
            }
          >
            <Icon size={16} />
            <span>{label}</span>
            <ChevronRight size={12} className="ml-auto opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-600">v1.0.0</p>
      </div>
    </aside>
  );
}
