import { ChevronLeft, ChevronRight, Ruler, Factory, ClipboardList, PenTool, UserPlus, LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePrefetchRouteData } from '@/hooks/useMasterData'

const SIDEBAR_W = 240
const SIDEBAR_W_COLLAPSED = 60

const menuItems = [
  { key: 'joborder', label: 'Job Order', path: '/joborder', icon: ClipboardList },
  { key: 'plantcode', label: 'Plant Code', path: '/plantcode', icon: Factory },
  { key: 'sizes', label: 'Size', path: '/sizes', icon: Ruler },
  { key: 'tagbuilder', label: 'Tag Builder', path: '/tagbuilder', icon: PenTool },
  { key: 'registeruser', label: 'Register User', path: '/registeruser', icon: UserPlus },
]

interface Props {
  expanded: boolean
  onToggle: () => void
}

export default function Sidebar({ expanded, onToggle }: Props) {
  const { hasAccess, user, logout } = useAuth()
  const prefetchRouteData = usePrefetchRouteData()
  const visibleItems = menuItems.filter((item) => hasAccess(item.key))

  const w = expanded ? SIDEBAR_W : SIDEBAR_W_COLLAPSED

  return (
    <aside
      style={{
        width: w,
        height: '100vh',
        background: 'var(--bg-sidebar)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
        transition: 'width 0.28s ease-in-out',
        overflow: 'hidden',
      }}
    >
      {/* Logo + toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: expanded ? '14px 12px 14px 16px' : '14px 0',
          justifyContent: expanded ? 'space-between' : 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          minHeight: 54,
          transition: 'padding 0.28s ease-in-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 'var(--radius-sm)',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: '#0c0c0d',
              flexShrink: 0,
            }}
          >
            P
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              opacity: expanded ? 1 : 0,
              width: expanded ? 'auto' : 0,
              overflow: 'hidden',
              transition: 'opacity 0.2s ease, width 0.28s ease-in-out',
            }}
          >
            Packing Order
          </span>
        </div>
        {expanded && (
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>
      {!expanded && (
        <button
          onClick={onToggle}
          title="Expand sidebar"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '8px auto', width: 28, height: 28,
            background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer',
            borderRadius: 6, color: 'rgba(255,255,255,0.5)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: expanded ? '12px 10px' : '12px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          transition: 'padding 0.28s ease-in-out',
        }}
      >
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onMouseEnter={() => prefetchRouteData(item.path)}
            onFocus={() => prefetchRouteData(item.path)}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: expanded ? 'flex-start' : 'center',
              gap: 10,
              padding: expanded ? '9px 12px' : '10px 0',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: 13.5,
              fontWeight: 500,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              position: 'relative',
              transition: 'all 0.18s ease',
              overflow: 'hidden',
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 20,
                      borderRadius: '0 3px 3px 0',
                      background: '#fff',
                    }}
                  />
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: expanded ? 'flex-start' : 'center',
                    width: expanded ? 'auto' : 20,
                    flexShrink: 0,
                  }}
                >
                  <item.icon size={20} />
                </div>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    opacity: expanded ? 1 : 0,
                    width: expanded ? 'auto' : 0,
                    overflow: 'hidden',
                    transition: 'opacity 0.2s ease, width 0.28s ease-in-out',
                  }}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      {user && (
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: expanded ? '12px 12px' : '12px 0',
            display: 'flex',
            flexDirection: expanded ? 'row' : 'column',
            alignItems: 'center',
            gap: 10,
            transition: 'padding 0.28s ease-in-out',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}
            title={user.username}
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              whiteSpace: 'nowrap',
              opacity: expanded ? 1 : 0,
              width: expanded ? 'auto' : 0,
              overflow: 'hidden',
              transition: 'opacity 0.2s ease, width 0.28s ease-in-out',
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.username}
            </div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)} &middot; {user.company} &middot; {user.site}
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#f87171' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  )
}

