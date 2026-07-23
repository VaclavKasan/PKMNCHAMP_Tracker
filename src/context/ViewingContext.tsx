import { createContext, useContext, useState, type ReactNode } from 'react'
import type { FriendProfile } from '../types'

interface ViewingContextValue {
  viewedUserId:  string | null
  viewedProfile: FriendProfile | null
  viewFriend:    (profile: FriendProfile) => void
  viewSelf:      () => void
}

const ViewingContext = createContext<ViewingContextValue | null>(null)

export function ViewingProvider({ children }: { children: ReactNode }) {
  const [viewedProfile, setViewedProfile] = useState<FriendProfile | null>(null)

  return (
    <ViewingContext.Provider
      value={{
        viewedUserId: viewedProfile?.id ?? null,
        viewedProfile,
        viewFriend: setViewedProfile,
        viewSelf: () => setViewedProfile(null),
      }}
    >
      {children}
    </ViewingContext.Provider>
  )
}

export function useViewing() {
  const ctx = useContext(ViewingContext)
  if (!ctx) throw new Error('useViewing must be used inside ViewingProvider')
  return ctx
}
