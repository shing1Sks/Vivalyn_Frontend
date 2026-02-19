import type { UserProfile } from '../../lib/api'

const SIZE = {
  sm: { box: 'w-9 h-9', text: 'text-sm' },
  md: { box: 'w-16 h-16', text: 'text-2xl' },
  lg: { box: 'w-20 h-20', text: 'text-3xl' },
}

interface UserAvatarProps {
  email: string
  profile: Pick<UserProfile, 'profile_pic_link' | 'profile_pic_gradient'> | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function UserAvatar({ email, profile, size = 'sm', className = '' }: UserAvatarProps) {
  const { box, text } = SIZE[size]
  const initial = email?.charAt(0).toUpperCase() ?? '?'

  if (profile?.profile_pic_link) {
    return (
      <img
        src={profile.profile_pic_link}
        alt={email}
        referrerPolicy="no-referrer"
        className={`${box} rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`${box} ${text} rounded-full flex items-center justify-center font-semibold text-white select-none ${className}`}
      style={{ background: profile?.profile_pic_gradient ?? 'linear-gradient(135deg, hsl(230, 65%, 78%), hsl(270, 65%, 82%))' }}
    >
      {initial}
    </div>
  )
}
