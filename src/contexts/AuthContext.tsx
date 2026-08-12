import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { SessionUser, LoginRow } from '@/types'

interface AuthState {
  user: SessionUser | null
  loading: boolean
  login: (username: string, password: string, remember: boolean) => Promise<{ error?: string }>
  logout: () => void
  hasAccess: (menuKey: string) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

const SESSION_KEY = 'packing_session'

const ROLE_MENUS: Record<string, string[]> = {
  admin: ['joborder', 'plantcode', 'sizes', 'tagbuilder', 'registeruser'],
  user: ['joborder', 'plantcode'],
}

function getStoredUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

function storeUser(user: SessionUser, persistent: boolean) {
  const raw = JSON.stringify(user)
  if (persistent) {
    localStorage.setItem(SESSION_KEY, raw)
    sessionStorage.removeItem(SESSION_KEY)
  } else {
    sessionStorage.setItem(SESSION_KEY, raw)
    localStorage.removeItem(SESSION_KEY)
  }
}

function clearStoredUser() {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(getStoredUser)
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (username: string, password: string, remember: boolean) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('packinglogin')
        .select('username, role, company, companyname, site, password, status')
        .eq('username', username)
        .single()

      if (error || !data) {
        return { error: 'Invalid username or password.' }
      }

      const row = data as LoginRow

      if (!row.status) {
        return { error: 'Account is disabled. Contact administrator.' }
      }

      if (row.password !== password) {
        return { error: 'Invalid username or password.' }
      }

      const sessionUser: SessionUser = {
        username: row.username,
        role: row.role,
        company: row.company,
        companyname: row.companyname ?? '',
        site: row.site,
      }

      setUser(sessionUser)
      storeUser(sessionUser, remember)

      const now = new Date()
      const klTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
      await supabase
        .from('packinglogin')
        .update({ last_login: klTime.toISOString().replace('Z', '') })
        .eq('username', username)

      return {}
    } catch {
      return { error: 'An unexpected error occurred. Please try again.' }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    clearStoredUser()
  }, [])

  const hasAccess = useCallback((menuKey: string) => {
    if (!user) return false
    const allowed = ROLE_MENUS[user.role] ?? []
    return allowed.includes(menuKey)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
