import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { fetchProfile, ApiError } from '../lib/api'
import type { UserProfile } from '../lib/api'

interface ProfileContextType {
  profile: UserProfile | null
  profileLoading: boolean
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session, signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    if (!session?.access_token) {
      setProfile(null)
      return
    }
    setProfileLoading(true)
    fetchProfile(session.access_token)
      .then(setProfile)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          // Session exists in localStorage but user no longer exists in Supabase
          signOut()
        } else {
          console.error('[ProfileContext]', e)
        }
      })
      .finally(() => setProfileLoading(false))
  }, [session?.access_token])

  return (
    <ProfileContext.Provider value={{ profile, profileLoading }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider')
  return ctx
}
