import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../services/auth';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

function getHeaderTitle(pathname: string, search: string) {
  if (pathname === '/calendar') {
    return '달력 보기';
  }

  if (search.includes('scope=major')) {
    return '전공 과목';
  }

  if (search.includes('scope=general')) {
    return '교양 과목';
  }

  return '전체 과제';
}

function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user } = useAuth();

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
              <p>{getHeaderTitle(location.pathname, location.search)}</p>
            </div>
          </div>
          <div className="header-actions">
            <span className="header-user">{user?.displayName || '내 작업 공간'}</span>
            <button type="button" className="ghost-action" onClick={() => void logout()}>
              아이디 바꾸기
            </button>
          </div>
        </header>
        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}

export default Layout;
