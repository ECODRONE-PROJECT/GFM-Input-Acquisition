import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import Login from './pages/Login'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Orders from './pages/Orders'
import CreditApps from './pages/CreditApps'
import Operations from './pages/Operations'
import AggregateDeals from './pages/AggregateDeals'
import Notifications from './pages/Notifications'
import { getAdminSession } from './lib/adminAuth'

function RequireAdminAuth({ children }: { children: ReactElement }) {
  const session = getAdminSession()
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return children
}

function GuestOnly({ children }: { children: ReactElement }) {
  const session = getAdminSession()
  if (session) {
    return <Navigate to="/admin" replace />
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <Login />
          </GuestOnly>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdminAuth>
            <AdminLayout />
          </RequireAdminAuth>
        }
      >
        <Route index element={<Dashboard />} />
        {/* Admin sections */}
        <Route path="inventory" element={<Inventory />} />
        <Route path="deals" element={<AggregateDeals />} />
        <Route path="orders" element={<Orders />} />
        <Route path="credit" element={<CreditApps />} />
        <Route path="operations" element={<Operations />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
