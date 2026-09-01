import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getProformas, signOut } from '../lib/supabase'

const NUMERO_FORMAT = n => String(n).padStart(6, '0')

export default function Dashboard({ user }) {
  const [proformas, setProformas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const navigate = useNavigate()

  useEffect(() => {
    loadProformas()
  }, [])

  async function loadProformas() {
    try {
      const data = await getProformas()
      setProformas(data)
    } catch (e) {
      setError('No se pudieron cargar las proformas: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const filtradas = proformas.filter(p => {
    const matchText =
      !search ||
      (p.cliente_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      String(p.numero).includes(search)
    const matchEstado = filtroEstado === 'todas' || p.estado === filtroEstado
    return matchText && matchEstado
  })

  function formatFecha(f) {
    if (!f) return ''
    const d = new Date(f + 'T00:00:00')
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function formatMoney(v) {
    return Number(v || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD' })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/images/logo-edipa.png" alt="EDIPA" />
          Proformas Edipa
        </div>
        <div className="user-box">
          <span>{user?.email}</span>
          <button className="btn-logout" onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main className="main">
        <div className="dash-head">
          <h2>Mis proformas</h2>
          <Link to="/nueva" className="btn-primary">+ Nueva proforma</Link>
        </div>

        {error && <div className="msg-err">{error}</div>}

        <div className="toolbar">
          <input
            type="search"
            placeholder="Buscar por cliente o número…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="creada">Creadas</option>
            <option value="enviada">Enviadas</option>
          </select>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : filtradas.length === 0 ? (
            <div className="empty-state">
              <div className="big">📄</div>
              <p>No hay proformas {search ? 'que coincidan con la búsqueda' : 'todavía'}.</p>
              {!search && <p style={{ marginTop: 10 }}><Link to="/nueva" className="btn-primary">Crear la primera</Link></p>}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nro.</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(p => (
                  <tr key={p.id}>
                    <td className="num">Nro. {NUMERO_FORMAT(p.numero)}</td>
                    <td>{p.cliente_nombre || '—'}</td>
                    <td>{formatFecha(p.fecha)}</td>
                    <td>{formatMoney(p.total)}</td>
                    <td>
                      <span className={`badge badge-${p.estado}`}>
                        {p.estado === 'enviada' ? 'Enviada' : 'Creada'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/proforma/${p.id}`} className="btn-ghost">Ver / Enviar</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}