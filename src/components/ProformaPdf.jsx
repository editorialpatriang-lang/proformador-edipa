import React from 'react'
import { Document, Page, Text, View, Image, Font } from '@react-pdf/renderer'

// Importar fuentes y logo (en prod: data URIs inline; en dev: URLs de Vite)
import robotoRegularData from '../fonts/Roboto-Regular.ttf'
import robotoBoldData from '../fonts/Roboto-Bold.ttf'
import robotoItalicData from '../fonts/Roboto-Italic.ttf'
import robotoBoldItalicData from '../fonts/Roboto-BoldItalic.ttf'
import logoUrl from '../assets/logo-edipa.png'

// Cargar una fuente y devolverla como data URL base64 (formato que v4.9 espera)
async function loadFontDataUri(src) {
  const res = await fetch(src)
  if (!res.ok) throw new Error('No se pudo cargar la fuente: ' + src)
  const buf = await res.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return 'data:font/ttf;base64,' + btoa(binary)
}

// Convertir una URL/data URI de imagen a data URI base64
async function loadImageDataUri(src) {
  if (typeof src === 'string' && src.startsWith('data:')) return src
  const res = await fetch(src)
  if (!res.ok) throw new Error('No se pudo cargar la imagen: ' + src)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

let assetsPromise = null
// Cargar fuentes + logo una sola vez (async, funciona en dev y prod)
let logoDataUri = null
function registerFonts() {
  if (!assetsPromise) {
    assetsPromise = (async () => {
      const [regular, bold, italic, boldItalic, logo] = await Promise.all([
        loadFontDataUri(robotoRegularData),
        loadFontDataUri(robotoBoldData),
        loadFontDataUri(robotoItalicData),
        loadFontDataUri(robotoBoldItalicData),
        loadImageDataUri(logoUrl),
      ])
      logoDataUri = logo
      Font.register({
        family: 'Roboto',
        fonts: [
          { src: regular, fontWeight: 400 },
          { src: bold, fontWeight: 700 },
          { src: italic, fontStyle: 'italic', fontWeight: 400 },
          { src: boldItalic, fontStyle: 'italic', fontWeight: 700 },
        ],
      })
    })()
  }
  return assetsPromise
}

// Constantes de diseño (extraídas de ProformaPlantilla.pdf)
const AZUL = '#20305d'
const ROSA = '#dc2978'
const TEXTO = '#1d1d1b'

const NUMERO_FORMAT = n => String(n).padStart(6, '0')

export function buildProformaPdfData({ proforma, items }) {
  const subtotal = proforma?.subtotal != null ? Number(proforma.subtotal) : items.reduce((s, i) => s + Number(i.valor_total || 0), 0)
  const iva = proforma?.iva != null ? Number(proforma.iva) : subtotal * 0.15
  const total = proforma?.total != null ? Number(proforma.total) : subtotal + iva

  return {
    numero: NUMERO_FORMAT(proforma?.numero ?? 0),
    fecha: proforma?.fecha || '',
    cliente: {
      nombre: proforma?.cliente_nombre || '',
      ruc: proforma?.cliente_ruc || '',
      telefono: proforma?.cliente_telefono || '',
      correo: proforma?.cliente_correo || '',
      direccion: proforma?.cliente_direccion || '',
    },
    observaciones: proforma?.observaciones || '',
    formaPago: proforma?.forma_pago || '',
    plazoEntrega: proforma?.plazo_entrega || '',
    subtotal, iva, total,
    items: (items || []).map(i => ({
      cantidad: Number(i.cantidad || 0),
      descripcion: i.descripcion || '',
      valorUnitario: Number(i.valor_unitario || 0),
      valorTotal: Number(i.valor_total || 0),
    })),
  }
}

const money = v =>
  Number(v || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD' })

function ProformaPdf({ data }) {
  const { numero, fecha, cliente, observaciones, formaPago, plazoEntrega, subtotal, iva, total, items } = data
  const footerContacts = [
    { text: '0998349359', x: 73 },
    { text: 'www.edipatriaec.com', x: 160 },
    { text: 'mariscal@edipatriaec.com', x: 278 },
    { text: 'VC Roca E6-26 y Reina Victoria', x: 408 },
  ]

  const colCant = 30
  const colDesc = 100
  const colUnit = 425
  const colTotal = 501
  const tableTop = 300
  const rowHeight = 20
  const maxRows = 18
  const visibleItems = items.slice(0, maxRows)
  const rowsToRender = visibleItems.length > 0 ? visibleItems : [{ cantidad: '', descripcion: '', valorUnitario: '', valorTotal: '' }]

  return (
    <Document>
      <Page size="A4" style={{ fontFamily: 'Roboto', color: TEXTO }}>
        {/* ===== HEADER ===== */}
        <View style={{ flexDirection: 'row', height: 130, backgroundColor: AZUL, position: 'relative' }}>
          <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 240, backgroundColor: ROSA }} />
          <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 26, paddingRight: 10, zIndex: 2 }}>
            {logoDataUri ? (
              <Image src={logoDataUri} style={{ width: 200, height: 70, objectFit: 'contain' }} />
            ) : (
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>EDITORIAL PATRIA</Text>
            )}
          </View>
          <View style={{ width: 240, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 20, zIndex: 3 }}>
            <Text style={{ color: '#fff', fontSize: 30, fontWeight: 'bold', lineHeight: 1.1 }}>PROFORMA</Text>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 8 }}>RUC: 1708753056001</Text>
            <Text style={{ color: '#fff', fontSize: 13, fontStyle: 'italic', marginTop: 2 }}>A-003-026</Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 2 }}>Nro{numero}</Text>
          </View>
        </View>

        {/* ===== DATOS DEL CLIENTE ===== */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 34, marginTop: 28, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', fontStyle: 'italic', color: AZUL }}>CLIENTE:</Text>
            <Text style={{ fontSize: 12, marginTop: 2 }}>{cliente.nombre || ''}</Text>
            <Text style={{ fontSize: 13, fontWeight: 'bold', fontStyle: 'italic', color: AZUL, marginTop: 12 }}>FECHA:</Text>
            <Text style={{ fontSize: 12, marginTop: 2 }}>{fecha}</Text>
            <Text style={{ fontSize: 13, fontWeight: 'bold', fontStyle: 'italic', color: AZUL, marginTop: 12 }}>TELÉFONO:</Text>
            <Text style={{ fontSize: 12, marginTop: 2 }}>{cliente.telefono || ''}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', fontStyle: 'italic', color: AZUL }}>RUC:</Text>
            <Text style={{ fontSize: 12, marginTop: 2 }}>{cliente.ruc || ''}</Text>
            <Text style={{ fontSize: 13, fontWeight: 'bold', fontStyle: 'italic', color: AZUL, marginTop: 12 }}>CORREO:</Text>
            <Text style={{ fontSize: 12, marginTop: 2 }}>{cliente.correo || ''}</Text>
          </View>
        </View>

        {/* ===== TABLA ===== */}
        <View style={{ position: 'absolute', left: 20, right: 21, top: tableTop - 20 }}>
          <View style={{ flexDirection: 'row', backgroundColor: AZUL, height: 36, alignItems: 'center' }}>
            <Text style={{ width: colCant, color: '#fff', fontSize: 13, fontWeight: 'bold', paddingLeft: 16 }}>Cant.</Text>
            <Text style={{ width: colDesc - colCant, color: '#fff', fontSize: 13, fontWeight: 'bold' }}>DESCRIPCIÓN</Text>
            <Text style={{ width: colUnit - colDesc, color: '#fff', fontSize: 13, fontWeight: 'bold', textAlign: 'right', paddingRight: 10 }}>V. Unit.</Text>
            <Text style={{ width: colTotal - colUnit, color: '#fff', fontSize: 13, fontWeight: 'bold', textAlign: 'right', paddingRight: 10 }}>V. TOTAL.</Text>
          </View>
          {rowsToRender.map((it, i) => (
            <View key={i} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e8ebf2', minHeight: rowHeight, alignItems: 'center', paddingVertical: 2 }}>
              <Text style={{ width: colCant, fontSize: 11, paddingLeft: 16 }}>{it.cantidad !== '' ? Number(it.cantidad).toLocaleString('es-EC') : ''}</Text>
              <Text style={{ width: colDesc - colCant, fontSize: 11, paddingRight: 8 }}>{it.descripcion}</Text>
              <Text style={{ width: colUnit - colDesc, fontSize: 11, textAlign: 'right', paddingRight: 10 }}>{it.valorUnitario !== '' ? money(it.valorUnitario) : ''}</Text>
              <Text style={{ width: colTotal - colUnit, fontSize: 11, textAlign: 'right', paddingRight: 10 }}>{it.valorTotal !== '' ? money(it.valorTotal) : ''}</Text>
            </View>
          ))}
        </View>

        {/* ===== OBSERVACIONES Y CONDICIONES ===== */}
        <View style={{ position: 'absolute', left: 34, right: 21, top: 680 }}>
          <Text style={{ fontSize: 17, color: ROSA, fontWeight: 'bold' }}>OBSERVACIONES:</Text>
          <Text style={{ fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>{observaciones || ''}</Text>
          <View style={{ flexDirection: 'row', marginTop: 18 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: TEXTO }}>Forma de pago:</Text>
              <Text style={{ fontSize: 11, marginTop: 2 }}>{formaPago || ''}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: TEXTO }}>Plazo de entrega:</Text>
              <Text style={{ fontSize: 11, marginTop: 2 }}>{plazoEntrega || ''}</Text>
            </View>
          </View>
        </View>

        {/* ===== TOTALES ===== */}
        <View style={{ position: 'absolute', left: 424, right: 21, top: 724 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>SUBTOTAL</Text>
            <Text style={{ fontSize: 12 }}>{money(subtotal)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: AZUL }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>IVA 15%</Text>
            <Text style={{ fontSize: 12 }}>{money(iva)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 2, borderTopColor: AZUL, marginTop: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: AZUL }}>TOTAL</Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: AZUL }}>{money(total)}</Text>
          </View>
        </View>

        {/* ===== FOOTER ===== */}
        <View style={{ position: 'absolute', left: 34, right: 21, bottom: 24, flexDirection: 'row', alignItems: 'center' }}>
          {footerContacts.map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: AZUL, marginRight: 5 }} />
              <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: AZUL }}>{c.text}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

export default ProformaPdf
export { registerFonts }