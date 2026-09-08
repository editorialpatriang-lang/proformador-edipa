import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase, getCurrentUser } from './lib/supabase'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NuevaProforma from './pages/NuevaProforma.jsx'
import ProformaDetalle from './pages/ProformaDetalle.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getCurrentUser().then(u => {
      setUser(u)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) navigate('/login')
    })
    return () => listener?.subscription?.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Cargando Proformas Edipa…</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
      <Route path="/nueva" element={user ? <NuevaProforma user={user} /> : <Navigate to="/login" />} />
      <Route path="/editar/:id" element={user ? <NuevaProforma user={user} /> : <Navigate to="/login" />} />
      <Route path="/proforma/:id" element={user ? <ProformaDetalle user={user} /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
