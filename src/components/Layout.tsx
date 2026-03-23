import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

function getHeaderTitle(pathname: string) {
  if (pathname === '/calendar') {
    return '달력 보기';
  }

  return '전체 과제';
}

function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <Sidebar />
      </aside>
      <div className="shell-main">
        <header className="shell-header">
          <div className="header-brand">
            <span className="material-symbols-outlined header-brand-icon" aria-hidden>
              dashboard
            </span>
            <div>
              <strong>과제 관리 도우미</strong>
              <p>{getHeaderTitle(location.pathname)}</p>
            </div>
          </div>
        </header>
        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}

export default Layout;
