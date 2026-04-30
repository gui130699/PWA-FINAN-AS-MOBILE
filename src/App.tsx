import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { InstallPWAProvider } from './contexts/InstallPWAContext'
import { ToastContainer } from './components/ui/Toast'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { FixedAccountsPage } from './pages/FixedAccountsPage'
import { InstallmentsPage } from './pages/InstallmentsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { SplashScreen } from './components/ui/SplashScreen'
import React from 'react'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <AppLayout>{children}</AppLayout>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/transactions" element={<PrivateRoute><TransactionsPage /></PrivateRoute>} />
      <Route path="/fixed" element={<PrivateRoute><FixedAccountsPage /></PrivateRoute>} />
      <Route path="/installments" element={<PrivateRoute><InstallmentsPage /></PrivateRoute>} />
      <Route path="/categories" element={<PrivateRoute><CategoriesPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AppWithSplash() {
  const { loading } = useAuth()
  return (
    <>
      <SplashScreen ready={!loading} />
      <AppRoutes />
    </>
  )
}

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'
  return (
    <ThemeProvider>
      <InstallPWAProvider>
        <AuthProvider>
          <BrowserRouter basename={basename}>
            <AppWithSplash />
            <ToastContainer />
          </BrowserRouter>
        </AuthProvider>
      </InstallPWAProvider>
    </ThemeProvider>
  )
}
