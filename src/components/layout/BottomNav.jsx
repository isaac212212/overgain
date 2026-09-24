import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Camera, Users, UserCircle } from 'lucide-react';
import './BottomNav.css';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { to: '/routines', icon: Dumbbell, label: 'Treino', isCenter: true },
  { to: '/groups', icon: Users, label: 'Grupos' },
  { to: '/profile', icon: UserCircle, label: 'Perfil' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" id="bottom-nav">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''} ${item.isCenter ? 'bottom-nav-center' : ''}`
          }
        >
          <div className={`bottom-nav-icon ${item.isCenter ? 'bottom-nav-icon-center' : ''}`}>
            <item.icon size={item.isCenter ? 24 : 22} />
          </div>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
