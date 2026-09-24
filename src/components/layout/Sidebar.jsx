import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Camera, Users, UserCircle, Settings, Download } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { to: '/routines', icon: Dumbbell, label: 'Treino' },
  { to: '/groups', icon: Users, label: 'Grupos' },
  { to: '/profile', icon: UserCircle, label: 'Perfil' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar" id="sidebar-nav">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <img src="/overgain-logo.jpg" alt="Overgain Logo" className="sidebar-logo-img" />
        </div>
        <span className="sidebar-logo-text">OVERGAIN</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <a
          href="/Overgain.apk"
          download="Overgain.apk"
          className="sidebar-apk-btn"
          title="Baixar App Android (.apk)"
        >
          <Download size={18} />
          <span>Baixar App Android (.apk)</span>
        </a>
      </div>
    </aside>
  );
}
