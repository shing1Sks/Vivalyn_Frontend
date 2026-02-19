const BASE = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

export interface UserProfile {
  id: string
  is_admin: boolean
  profile_pic_gradient: string | null
  profile_pic_link: string | null
}

export async function fetchProfile(accessToken: string): Promise<UserProfile> {
  const res = await fetch(`${BASE}/api/v1/profile/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}
