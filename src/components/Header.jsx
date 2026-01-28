import { NavLink, useLocation } from 'react-router-dom';
import { Home, Code, Bot, FolderKanban } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Header = () => {
  const { t } = useTranslation('common');
  const location = useLocation();

  const navItems = [
    {
      path: '/homepage',
      label: t('header.homepage', 'Homepage'),
      icon: Home,
    },
    {
      path: '/project',
      label: t('header.project', 'Project'),
      icon: FolderKanban,
    },
    {
      path: '/agents',
      label: t('header.agent', 'Agent'),
      icon: Bot,
    },
    {
      path: '/skills',
      label: t('header.skill', 'SKILL'),
      icon: Code,
    },
  ];

  return (
    <header className='h-14 border-b border-border bg-card flex-shrink-0'>
      <nav className='h-full flex items-center justify-center gap-1'>
        {navItems.map((item) => {
          const Icon = item.icon;
          // For root path, match exactly; for others, check if path starts with the item path
          // Special handling for /agents list and /agent/:id detail pages
          const isActive =
            item.path === '/'
              ? location.pathname === '/' || location.pathname.startsWith('/session/')
              : item.path === '/agents'
                ? location.pathname === '/agents' || location.pathname.startsWith('/agent/')
                : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={() => {
                return `
                  flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}
                `;
              }}
            >
              <Icon className='w-4 h-4' />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
};

export default Header;
