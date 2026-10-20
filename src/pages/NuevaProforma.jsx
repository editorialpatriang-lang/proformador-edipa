import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createProforma,
  updateProforma,
  getProforma,
  getNextNumero,
  searchClientes,
  saveCliente,
  searchProductos,
  saveProducto,
  signOut,
} from '../lib/supabase'
import {
  EMISORES,
  EMISOR_DEFAULT,
  FORMAS_PAGO,
  FORMA_PAGO_OTRO,
  FORMA_PAGO_LABELS,
  FORMA_PAGO_DEFAULT,
  PLAZOS_ENTREGA,
  getEmisor,
  resolveFormaPago,
} from '../lib/emisores'

const IVA_RATE = 0.15
const NUMERO_FORMAT = n => String(n).padStart(6, '0')

const emptyItem = () => ({ id: crypto.randomUUID(), descripcion: '', cantidad: 1, valor_unitario: 0 })

export default function NuevaProforma({ user }) {
  const navigate = useNavigate()
  const { id: editId } = useParams()   // presente solo en modo edición (/editar/:id)
  const esEdicion = Boolean(editId)
  const [numero, setNumero] = useState(null)
  const [cargando, setCargando] = useState(esEdicion)
  // La fecha es la de creación de la proforma: se fija a hoy y NO se puede editar.
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])

  // Cliente
  const [cliente, setCliente] = useState({ nombre: '', ruc: '', telefono: '', correo: '', direccion: '' })
  const [clienteId, setClienteId] = useState(null)
  const [clienteQuery, setClienteQuery] = useState('')
  const [clienteResults, setClienteResults] = useState([])
  const [showClienteResults, setShowClienteResults] = useState(false)
  const [showNewCliente, setShowNewCliente] = useState(false)
  const clienteSearchRef = useRef(null)

  // Producto (para agregar al catálogo)
  const [productoModal, setProductoModal] = useState(false)
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', descripcion: '', precio: '' })

  // Items
  const [items, setItems] = useState([emptyItem()])

  // Observaciones y condiciones
  const [observaciones, setObservaciones] = useState('')
  const [emisor, setEmisor] = useState(EMISOR_DEFAULT)
  const [formaPago, setFormaPago] = useState(FORMA_PAGO_DEFAULT)
  const [formaPagoOtro, setFormaPagoOtro] = useState('')
  const [plazoEntrega, setPlazoEntrega] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (esEdicion) {
      // Cargar proforma existente para edición
      getProforma(editId).then(({ proforma, items: dbItems }) => {
        setNumero(proforma.numero)
        setFecha(proforma.fecha)
        setCliente({
          nombre: proforma.cliente_nombre || '',
          ruc: proforma.cliente_ruc || '',
          telefono: proforma.cliente_telefono || '',
          correo: proforma.cliente_correo || '',
          direccion: proforma.cliente_direccion || '',
        })
        setClienteId(proforma.cliente_id || null)
        setClienteQuery(proforma.cliente_nombre || '')
        setObservaciones(proforma.observaciones || '')
        setEmisor(proforma.emisor || EMISOR_DEFAULT)
        // Si la forma de pago guardada no es una de las opciones, se trata como "Otra"
        const esOpcion = FORMAS_PAGO.includes(proforma.forma_pago)
        setFormaPago(esOpcion ? proforma.forma_pago : (proforma.forma_pago ? FORMA_PAGO_OTRO : FORMA_PAGO_DEFAULT))
        setFormaPagoOtro(esOpcion ? '' : (proforma.forma_pago || ''))
        setPlazoEntrega(proforma.plazo_entrega || '')
        setItems(dbItems.length > 0
          ? dbItems.map(it => ({
              id: crypto.randomUUID(),
              descripcion: it.descripcion,
              cantidad: it.cantidad,
              valor_unitario: it.valor_unitario,
              valor_total: parseFloat(it.cantidad) * parseFloat(it.valor_unitario),
            }))
          : [emptyItem()])
        setCargando(false)
      }).catch(e => {
        setError('No se pudo cargar la proforma: ' + e.message)
        setCargando(false)
      })
      return
    }
    getNextNumero().then(setNumero).catch(() => setNumero(4843))
  }, [editId])

  // Búsqueda de cliente con debounce
  useEffect(() => {
    if (!clienteQuery || clienteQuery.length < 2) {
      setClienteResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const r = await searchClientes(clienteQuery)
        setClienteResults(r)
        setShowClienteResults(true)
      } catch { /* silencio */ }
    }, 300)
    return () => clearTimeout(t)
  }, [clienteQuery])

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    function handler(e) {
      if (clienteSearchRef.current && !clienteSearchRef.current.contains(e.target)) {
        setShowClienteResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function selectCliente(c) {
    setCliente({
      nombre: c.nombre,
      ruc: c.ruc || '',
      telefono: c.telefono || '',
      correo: c.correo || '',
      direccion: c.direccion || '',
    })
    setClienteId(c.id)
    setClienteQuery(c.nombre)
    setShowClienteResults(false)
  }

  function handleClienteChange(field, value) {
    setCliente(prev => ({ ...prev, [field]: value }))
    setClienteId(null)
    if (field === 'nombre') {
      setClienteQuery(value)
    }
  }

  function updateItem(id, field, value) {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it
      const next = { ...it, [field]: value }
      if (field === 'cantidad' || field === 'valor_unitario') {
        const c = parseFloat(next.cantidad) || 0
        const v = parseFloat(next.valor_unitario) || 0
        next.valor_total = c * v
      }
      return next
    }))
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()])
  }

  function removeItem(id) {
    setItems(prev => {
      if (prev.length === 1) {
        return [emptyItem()]
      }
      return prev.filter(it => it.id !== id)
    })
  }

  // Completar desde un producto del catálogo
  async function fillFromProduct(prod) {
    const lastItem = items[items.length - 1]
    const isLastEmpty = !lastItem.descripcion && (!lastItem.valor_unitario || lastItem.valor_unitario === 0)
    if (isLastEmpty) {
      updateItem(lastItem.id, 'descripcion', prod.nombre)
      updateItem(lastItem.id, 'valor_unitario', parseFloat(prod.precio) || 0)
    } else {
      const it = emptyItem()
      it.descripcion = prod.nombre
      it.valor_unitario = parseFloat(prod.precio) || 0
      setItems(prev => [...prev, it])
    }
  }

  async function saveNewCliente() {
    if (!cliente.nombre.trim()) {
      setError('El nombre del cliente es obligatorio.')
      return false
    }
    try {
      const saved = await saveCliente({ ...cliente, creado_por: user.id })
      setClienteId(saved.id)
      setClienteQuery(saved.nombre)
      setShowNewCliente(false)
      return true
    } catch (e) {
      setError('No se pudo guardar el cliente: ' + e.message)
      return false
    }
  }

  async function saveNewProducto() {
    if (!nuevoProducto.nombre.trim()) {
      setError('El nombre del producto es obligatorio.')
      return false
    }
    try {
      const saved = await saveProducto({ ...nuevoProducto, creado_por: user.id })
      setProductoModal(false)
      setNuevoProducto({ nombre: '', descripcion: '', precio: '' })
      await fillFromProduct(saved)
      return true
    } catch (e) {
      setError('No se pudo guardar el producto: ' + e.message)
      return false
    }
  }

  const subtotal = items.reduce((s, it) => s + (parseFloat(it.valor_total) || 0), 0)
  const iva = subtotal * IVA_RATE
  const total = subtotal + iva
  const emisorData = getEmisor(emisor)
  const formaPagoFinal = resolveFormaPago(formaPago, formaPagoOtro)

  async function handleSave() {
    setError('')
    if (!cliente.nombre.trim()) {
      setError('Escribe el nombre del cliente.')
      return
    }
    const itemsValidos = items.filter(it => it.descripcion.trim() && (parseFloat(it.valor_total) > 0 || true))
    if (itemsValidos.length === 0) {
      setError('Agrega al menos un producto o descripción.')
      return
    }
    if (!clienteId) {
      const ok = await saveNewCliente()
      if (!ok) return
    }

    setSaving(true)
    try {
      if (esEdicion) {
        await updateProforma(
          editId,
          {
            cliente_id: clienteId,
            cliente_nombre: cliente.nombre,
            cliente_ruc: cliente.ruc,
            cliente_telefono: cliente.telefono,
            cliente_correo: cliente.correo,
            cliente_direccion: cliente.direccion,
            fecha,
            observaciones,
            forma_pago: formaPagoFinal,
            plazo_entrega: plazoEntrega,
            emisor,
          },
          itemsValidos
        )
        navigate(`/proforma/${editId}`)
        return
      }
      const { proforma } = await createProforma(
        {
          cliente_id: clienteId,
          cliente_nombre: cliente.nombre,
          cliente_ruc: cliente.ruc,
          cliente_telefono: cliente.telefono,
          cliente_correo: cliente.correo,
          cliente_direccion: cliente.direccion,
          fecha,
          observaciones,
          forma_pago: formaPagoFinal,
          plazo_entrega: plazoEntrega,
          emisor,
          creado_por: user.id,
        },
        itemsValidos
      )
      navigate(`/proforma/${proforma.id}`)
    } catch (e) {
      setError('No se pudo guardar la proforma: ' + e.message)
      setSaving(false)
    }
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  if (cargando) {
    return (
      <div className="app-shell">
        <div className="app-loading"><div className="spinner" /></div>
      </div>
    )
  }

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
        <div className="dash-head">
          <h2>{esEdicion ? 'Editar proforma' : 'Nueva proforma'}</h2>
          <Link to={esEdicion ? `/proforma/${editId}` : '/'} className="btn-secondary">← Volver</Link>
        </div>

        <div className="notice">
          Proforma <strong>Nro. {numero !== null ? NUMERO_FORMAT(numero) : '…'}</strong> · RUC {emisorData.ruc} · IVA 15%
          {esEdicion && ' · El número se mantiene, se actualiza el contenido'}
        </div>

        {error && <div className="msg-err">{error}</div>}

        {/* Emisor / local */}
        <section className="form-section">
          <h3>Emisor de la proforma</h3>
          <div className="field" style={{ maxWidth: 460 }}>
            <label>Local</label>
            <select value={emisor} onChange={e => setEmisor(e.target.value)}>
              {EMISORES.map(em => (
                <option key={em.id} value={em.id}>{em.nombre} · RUC {em.ruc}</option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: 13, color: '#4b5563', marginTop: 10 }}>
            {emisorData.direccion} · Tel. {emisorData.telefono} · {emisorData.correo}
          </p>
        </section>

        {/* Datos del cliente */}
        <section className="form-section">
          <h3>Datos del cliente</h3>
          <div className="grid-2">
            <div className="field autocomplete-wrap" ref={clienteSearchRef}>
              <label>Nombre / Empresa *</label>
              <input
                value={clienteQuery}
                onChange={e => handleClienteChange('nombre', e.target.value)}
                placeholder="Escribe para buscar o ingresa un nuevo cliente"
              />
              {showClienteResults && clienteResults.length > 0 && (
                <div className="autocomplete-list">
                  {clienteResults.map(c => (
                    <button key={c.id} type="button" onClick={() => selectCliente(c)}>
                      {c.nombre}{c.ruc ? ` · RUC ${c.ruc}` : ''}
                    </button>
                  ))}
                </div>
              )}
              {clienteId && <div style={{ fontSize: 12, color: '#1a9c5a', marginTop: 4 }}>✓ Cliente guardado</div>}
            </div>
            <div className="field">
              <label>RUC / Cédula</label>
              <input value={cliente.ruc} onChange={e => handleClienteChange('ruc', e.target.value)} />
            </div>
            <div className="field">
              <label>Teléfono</label>
              <input value={cliente.telefono} onChange={e => handleClienteChange('telefono', e.target.value)} />
            </div>
            <div className="field">
              <label>Correo</label>
              <input type="email" value={cliente.correo} onChange={e => handleClienteChange('correo', e.target.value)} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Dirección</label>
              <input value={cliente.direccion} onChange={e => handleClienteChange('direccion', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Productos */}
        <section className="form-section">
          <h3>Productos / Servicios</h3>
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Cant.</th>
                <th>Descripción</th>
                <th style={{ width: 110 }}>V. Unitario</th>
                <th style={{ width: 110 }}>V. Total</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id}>
                  <td>
                    <input
                      className="num-input"
                      type="number"
                      min="0"
                      step="any"
                      value={it.cantidad}
                      onChange={e => updateItem(it.id, 'cantidad', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="desc"
                      value={it.descripcion}
                      onChange={e => updateItem(it.id, 'descripcion', e.target.value)}
                      placeholder="Descripción (p. ej. Tarjetas 1000 uds, UV brillante)"
                    />
                  </td>
                  <td>
                    <input
                      className="num-input"
                      type="number"
                      min="0"
                      step="any"
                      value={it.valor_unitario}
                      onChange={e => updateItem(it.id, 'valor_unitario', e.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {(parseFloat(it.valor_total) || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}
                  </td>
                  <td>
                    <button type="button" className="btn-remove" onClick={() => removeItem(it.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn-add-item" onClick={addItem}>+ Agregar fila</button>
          <button
            type="button"
            className="btn-add-item"
            style={{ marginLeft: 10 }}
            onClick={() => { setProductoModal(true); setError('') }}
          >
            + Guardar como producto del catálogo
          </button>
        </section>

        {/* Observaciones y condiciones */}
        <section className="form-section">
          <h3>Condiciones</h3>
          <div className="grid-3">
            <div className="field">
              <label>Forma de pago</label>
              <select value={formaPago} onChange={e => setFormaPago(e.target.value)}>
                {FORMAS_PAGO.map(f => (
                  <option key={f} value={f}>{FORMA_PAGO_LABELS[f] || f}</option>
                ))}
              </select>
            </div>
            {formaPago === FORMA_PAGO_OTRO && (
              <div className="field">
                <label>Especifica la forma de pago</label>
                <input
                  value={formaPagoOtro}
                  onChange={e => setFormaPagoOtro(e.target.value)}
                  placeholder="p. ej. 30% anticipo, 70% entrega"
                />
              </div>
            )}
            <div className="field">
              <label>Plazo de entrega</label>
              <select value={plazoEntrega} onChange={e => setPlazoEntrega(e.target.value)}>
                <option value="">Selecciona un plazo</option>
                {PLAZOS_ENTREGA.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Fecha</label>
              <input type="text" value={fecha} readOnly />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Observaciones</label>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Notas, condiciones, detalles del pedido…"
              />
            </div>
          </div>
        </section>

        {/* Totales */}
        <div className="totals-box">
          <div className="row"><span>Subtotal</span><span>{(subtotal).toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}</span></div>
          <div className="row"><span>IVA 15%</span><span>{iva.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}</span></div>
          <div className="row total"><span>TOTAL</span><span>{total.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}</span></div>
        </div>

        <div className="form-actions">
          <Link to={esEdicion ? `/proforma/${editId}` : '/'} className="btn-secondary">Cancelar</Link>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (esEdicion ? 'Actualizando…' : 'Guardando…') : (esEdicion ? 'Actualizar proforma' : 'Guardar proforma')}
          </button>
        </div>
      </main>

      {/* Modal nuevo producto */}
      {productoModal && (
        <div className="modal-overlay" onClick={() => setProductoModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Guardar producto en el catálogo</h3>
            <div className="field">
              <label>Nombre *</label>
              <input value={nuevoProducto.nombre} onChange={e => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })} placeholder="p. ej. Tarjetas 1000 uds UV" />
            </div>
            <div className="field">
              <label>Descripción</label>
              <input value={nuevoProducto.descripcion} onChange={e => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })} />
            </div>
            <div className="field">
              <label>Precio (USD)</label>
              <input type="number" step="any" value={nuevoProducto.precio} onChange={e => setNuevoProducto({ ...nuevoProducto, precio: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setProductoModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={saveNewProducto}>Guardar y usar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
