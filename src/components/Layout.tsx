import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/', label: '대시보드' },
  { to: '/subjects', label: '과목 관리' },
  { to: '/tasks/new', label: '과제 생성' },
];

function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <Link to="/" className="brand">
            과제 관리 도우미
          </Link>
          <p className="brand-description">과목과 과제를 달력과 체크리스트로 함께 관리하는 웹앱</p>
        </div>
        <Link to="/tasks/new" className="button primary small">
          체크리스트 만들기
        </Link>
      </header>
      <div className="subnav">
        <nav className="topnav" aria-label="주요 메뉴">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={location.pathname === item.to ? 'nav-link is-active' : 'nav-link'}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <main className="page-shell">{children}</main>
    </div>
  );
}

export default Layout;
