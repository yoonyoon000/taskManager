import { NavLink, useLocation } from 'react-router-dom';

const items = [
  {
    label: '전체 과제',
    icon: 'dashboard',
    to: '/?scope=all',
    isActive: (pathname: string, search: string) => pathname === '/' && search.includes('scope=all'),
  },
  {
    label: '교양 과목',
    icon: 'menu_book',
    to: '/?scope=general',
    isActive: (pathname: string, search: string) => pathname === '/' && search.includes('scope=general'),
  },
  {
    label: '전공 과목',
    icon: 'check_circle',
    to: '/?scope=major',
    isActive: (pathname: string, search: string) => pathname === '/' && search.includes('scope=major'),
  },
  {
    label: '달력 보기',
    icon: 'calendar_month',
    to: '/calendar',
    isActive: (pathname: string) => pathname === '/calendar',
  },
];

function Sidebar() {
  const location = useLocation();

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <span className="material-symbols-outlined" aria-hidden>
            dashboard
          </span>
          <strong>보드</strong>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="사이드 메뉴">
        {items.map((item) => {
          const active = item.isActive(location.pathname, location.search);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={active ? 'sidebar-link is-active' : 'sidebar-link'}
            >
              <span className="material-symbols-outlined" aria-hidden>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export default Sidebar;
