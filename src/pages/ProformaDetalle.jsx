import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getProforma, updateProformaEstado, signOut } from '../lib/supabase'
import { getEmisor } from '../lib/emisores'

// Lazy load @react-pdf/renderer (pesado ~1.5MB) solo cuando se necesita
const NUMERO_FORMAT = n => String(n).padStart(6, '0')

export default function ProformaDetalle({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    try {
      const { proforma, items } = await getProforma(id)
      setData({ proforma, items })
      const pdfData = await buildData({ proforma, items })
      const blob = await generatePdfBlob(pdfData)
      setPdfUrl(URL.createObjectURL(blob))
    } catch (e) {
      setErr('No se pudo cargar la proforma: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Importación dinámica del módulo PDF
  async function buildData({ proforma, items }) {
    const { buildProformaPdfData } = await import('../components/ProformaPdf.jsx')
    return buildProformaPdfData({ proforma, items })
  }

  async function generatePdfBlob(pdfData) {
    const { pdf } = await import('@react-pdf/renderer')
    const { default: ProformaPdf, registerFonts } = await import('../components/ProformaPdf.jsx')
    await registerFonts()  // asegurar fuentes cargadas antes de renderizar
    return pdf(<ProformaPdf data={pdfData} />).toBlob()
  }

  async function handleDownload() {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `Proforma_${NUMERO_FORMAT(data.proforma.numero)}_${(data.proforma.cliente_nombre || 'cliente').replace(/\s+/g, '_')}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function handleEnviar() {
    setMsg('')
    setErr('')
    const correo = data.proforma.cliente_correo
    if (!correo) {
      setErr('El cliente no tiene correo registrado. Agrega un correo para poder enviar la proforma.')
      return
    }
    setBusy(true)
    try {
      const pdfData = await buildData({ proforma: data.proforma, items: data.items })
      const blob = await generatePdfBlob(pdfData)
      const base64 = await blobToBase64(blob)
      const res = await fetch('/api/enviar-proforma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: correo,
          clienteNombre: data.proforma.cliente_nombre,
          numero: NUMERO_FORMAT(data.proforma.numero),
          pdfBase64: base64,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || 'Error al enviar el correo')
      }
      await updateProformaEstado(id, 'enviada')
      setData(prev => ({ ...prev, proforma: { ...prev.proforma, estado: 'enviada' } }))
      setMsg(`Proforma enviada a ${correo}.`)
    } catch (e) {
      setErr('No se pudo enviar: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app-loading"><div className="spinner" /></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="app-shell">
        <main className="main">
          <div className="msg-err">{err}</div>
          <Link to="/" className="btn-secondary">← Volver</Link>
        </main>
      </div>
    )
  }

  const { proforma, items } = data
  const emisorData = getEmisor(proforma.emisor)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/images/logo-edipa.png" alt="EDIPA" />
          <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Proformas Edipa</Link>
        </div>
        <div className="user-box">
          <span>{user?.email}</span>
          <button className="btn-logout" onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <main className="main">
        <div className="detail-head">
          <div>
            <h2 style={{ color: 'var(--azul-oscuro)' }}>Proforma Nro. {NUMERO_FORMAT(proforma.numero)}</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
              {proforma.cliente_nombre || 'Cliente sin nombre'} · {proforma.fecha} ·{' '}
              {emisorData.nombre} · RUC {emisorData.ruc} ·{' '}
              <span className={`badge badge-${proforma.estado}`}>
                {proforma.estado === 'enviada' ? 'Enviada' : 'Creada'}
              </span>
            </p>
          </div>
          <Link to="/" className="btn-secondary">← Volver</Link>
        </div>

        {msg && <div className="msg-ok">{msg}</div>}
        {err && <div className="msg-err">{err}</div>}

        <div className="detail-actions">
          <button className="btn-primary" onClick={handleDownload}>⬇ Descargar PDF</button>
          <Link to={`/editar/${proforma.id}`} className="btn-secondary">✎ Editar</Link>
          <button className="btn-secondary" onClick={handleEnviar} disabled={busy}>
            {busy ? 'Enviando…' : '✉ Enviar por correo'}
          </button>
        </div>

        <div className="pdf-preview">
          {pdfUrl ? (
            <iframe title="Vista previa" src={pdfUrl} />
          ) : (
            <div className="pdf-empty">Generando PDF…</div>
          )}
        </div>
      </main>
    </div>
  )
}
