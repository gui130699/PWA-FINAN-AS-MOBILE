import React from 'react'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { InstallPWABannerMobile } from './InstallPWABanner'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="lg:ml-64 flex flex-col min-h-dvh">
        <TopBar />
        <main className="flex-1 px-4 py-4 pb-24 lg:pb-6 lg:px-6 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
      <BottomNav />
      <InstallPWABannerMobile />
    </div>
  )
}
