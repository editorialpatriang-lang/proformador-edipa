import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Proforma helpers
export async function getNextNumero() {
  const { data, error } = await supabase
    .from('proformas')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)
  if (error) throw error
  return (data && data.length > 0) ? data[0].numero + 1 : 4843
}

export async function getProformas() {
  const { data, error } = await supabase
    .from('proformas')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getProforma(id) {
  const { data: proforma, error: pfErr } = await supabase
    .from('proformas')
    .select('*')
    .eq('id', id)
    .single()
  if (pfErr) throw pfErr
  const { data: items, error: itErr } = await supabase
    .from('proforma_items')
    .select('*')
    .eq('proforma_id', id)
    .order('id', { ascending: true })
  if (itErr) throw itErr
  return { proforma, items }
}

export async function createProforma(proformaData, items) {
  // proformaData: { cliente, fecha, observaciones, forma_pago, plazo_entrega, creado_por }
  // items: [{ descripcion, cantidad, valor_unitario, valor_total }]
  const numero = await getNextNumero()
  const subtotal = items.reduce((s, i) => s + parseFloat(i.valor_total), 0)
  const iva = subtotal * 0.15
  const total = subtotal + iva

  const { data: proforma, error: pfErr } = await supabase
    .from('proformas')
    .insert({
      numero,
      cliente_id: proformaData.cliente_id || null,
      cliente_nombre: proformaData.cliente_nombre,
      cliente_ruc: proformaData.cliente_ruc,
      cliente_telefono: proformaData.cliente_telefono,
      cliente_correo: proformaData.cliente_correo,
      cliente_direccion: proformaData.cliente_direccion,
      fecha: proformaData.fecha || new Date().toISOString().split('T')[0],
      observaciones: proformaData.observaciones || '',
      forma_pago: proformaData.forma_pago || '',
      plazo_entrega: proformaData.plazo_entrega || '',
      subtotal: subtotal.toFixed(2),
      iva: iva.toFixed(2),
      total: total.toFixed(2),
      estado: 'creada',
      creado_por: proformaData.creado_por,
    })
    .select()
    .single()
  if (pfErr) {
    // Retry on unique constraint (numero collision)
    if (pfErr.code === '23505') {
      return createProforma(proformaData, items)
    }
    throw pfErr
  }

  const itemsWithProformaId = items.map(i => ({
    proforma_id: proforma.id,
    descripcion: i.descripcion,
    cantidad: parseFloat(i.cantidad),
    valor_unitario: parseFloat(i.valor_unitario),
    valor_total: parseFloat(i.valor_total),
  }))

  const { error: itErr } = await supabase
    .from('proforma_items')
    .insert(itemsWithProformaId)
  if (itErr) throw itErr

  return { proforma, numero }
}

export async function updateProformaEstado(id, estado) {
  const { error } = await supabase
    .from('proformas')
    .update({ estado })
    .eq('id', id)
  if (error) throw error
}

// Actualizar una proforma existente: campos, totales e items (se reemplazan)
export async function updateProforma(id, proformaData, items) {
  const subtotal = items.reduce((s, i) => s + parseFloat(i.valor_total), 0)
  const iva = subtotal * 0.15
  const total = subtotal + iva

  const { error: pfErr } = await supabase
    .from('proformas')
    .update({
      cliente_id: proformaData.cliente_id || null,
      cliente_nombre: proformaData.cliente_nombre,
      cliente_ruc: proformaData.cliente_ruc,
      cliente_telefono: proformaData.cliente_telefono,
      cliente_correo: proformaData.cliente_correo,
      cliente_direccion: proformaData.cliente_direccion,
      fecha: proformaData.fecha,
      observaciones: proformaData.observaciones || '',
      forma_pago: proformaData.forma_pago || '',
      plazo_entrega: proformaData.plazo_entrega || '',
      subtotal: subtotal.toFixed(2),
      iva: iva.toFixed(2),
      total: total.toFixed(2),
    })
    .eq('id', id)
  if (pfErr) throw pfErr

  const { error: delErr } = await supabase
    .from('proforma_items')
    .delete()
    .eq('proforma_id', id)
  if (delErr) throw delErr

  const { error: itErr } = await supabase
    .from('proforma_items')
    .insert(items.map(i => ({
      proforma_id: id,
      descripcion: i.descripcion,
      cantidad: parseFloat(i.cantidad),
      valor_unitario: parseFloat(i.valor_unitario),
      valor_total: parseFloat(i.valor_total),
    })))
  if (itErr) throw itErr
}

// Client helpers
export async function searchClientes(query) {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .ilike('nombre', `%${query}%`)
    .order('nombre')
    .limit(10)
  if (error) throw error
  return data
}

export async function saveCliente(cliente) {
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nombre: cliente.nombre,
      ruc: cliente.ruc || '',
      telefono: cliente.telefono || '',
      correo: cliente.correo || '',
      direccion: cliente.direccion || '',
      creado_por: cliente.creado_por,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Product helpers
export async function searchProductos(query) {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .ilike('nombre', `%${query}%`)
    .order('nombre')
    .limit(10)
  if (error) throw error
  return data
}

export async function saveProducto(producto) {
  const { data, error } = await supabase
    .from('productos')
    .insert({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: parseFloat(producto.precio) || 0,
      creado_por: producto.creado_por,
    })
    .select()
    .single()
  if (error) throw error
  return data
}