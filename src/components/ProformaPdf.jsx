import React from 'react'
import { Document, Page, Text, View, Image, Font } from '@react-pdf/renderer'

// Importar fuentes y logo
import robotoRegularData from '../fonts/Roboto-Regular.ttf'
import robotoBoldData from '../fonts/Roboto-Bold.ttf'
import robotoItalicData from '../fonts/Roboto-Italic.ttf'
import robotoBoldItalicData from '../fonts/Roboto-BoldItalic.ttf'
import caveatRegularData from '../fonts/Caveat-Regular.ttf'
import logoUrl from '../assets/logo-edipa.png'

// Cargar fuente como data URI base64 (formato que v4.9 espera)
async function loadFontDataUri(src) {
  const res = await fetch(src)
  if (!res.ok) throw new Error('No se pudo cargar la fuente: ' + src)
  const buf = await res.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk)
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  return 'data:font/ttf;base64,' + btoa(binary)
}

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
let logoDataUri = null
function registerFonts() {
  if (!assetsPromise) {
    assetsPromise = (async () => {
      const [regular, bold, italic, boldItalic, caveat, logo] = await Promise.all([
        loadFontDataUri(robotoRegularData),
        loadFontDataUri(robotoBoldData),
        loadFontDataUri(robotoItalicData),
        loadFontDataUri(robotoBoldItalicData),
        loadFontDataUri(caveatRegularData),
        loadImageDataUri(logoUrl),
      ])
      logoDataUri = logo
      Font.register({ family: 'Roboto', fonts: [
        { src: regular, fontWeight: 400 },
        { src: bold, fontWeight: 700 },
        { src: italic, fontStyle: 'italic', fontWeight: 400 },
        { src: boldItalic, fontStyle: 'italic', fontWeight: 700 },
      ]})
      Font.register({ family: 'Caveat', fonts: [
        { src: caveat, fontWeight: 400 },
      ]})
    })()
  }
  return assetsPromise
}

const NUMERO_FORMAT = n => String(n).padStart(6, '0')

export function buildProformaPdfData({ proforma, items }) {
  const subtotal = proforma?.subtotal != null ? Number(proforma.subtotal) : items.reduce((s, i) => s + Number(i.valor_total || 0), 0)
  const iva = proforma?.iva != null ? Number(proforma.iva) : subtotal * 0.15
  const total = proforma?.total != null ? Number(proforma.total) : subtotal + iva
  return {
    numero: 'Nro.' + NUMERO_FORMAT(proforma?.numero ?? 0),
    fecha: proforma?.fecha || '',
    cliente: {
      nombre: proforma?.cliente_nombre || '',
      ruc: proforma?.cliente_ruc || '',
      telefono: proforma?.cliente_telefono || '',
      correo: proforma?.cliente_correo || '',
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

const money = v => Number(v || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD' })
const AZUL = '#20305d'
const ROSA = '#dc2978'
const TEXTO = '#1d1d1b'

const colCantWidth = 62       // Cant. column: 20-82
const colDescWidth = 338      // DESCRIPCIÓN column: 82-420
const colUnitWidth = 76       // V. Unit. column: 420-496
const colTotalWidth = 78      // V. TOTAL. column: 496-574

function ProformaPdf({ data }) {
  const { numero, fecha, cliente, observaciones, formaPago, plazoEntrega, subtotal, iva, total, items } = data
  const footerContacts = [
    { text: '0998349359', x: 73 },
    { text: 'www.edipatriaec.com', x: 160 },
    { text: 'mariscal@edipatriaec.com', x: 278 },
    { text: 'VC Roca E6-26 y Reina Victoria', x: 408 },
  ]
  const maxRows = 18
  const visibleItems = (items || []).slice(0, maxRows)
  const rowsToRender = visibleItems.length > 0 ? visibleItems : [{ cantidad: '', descripcion: '', valorUnitario: '', valorTotal: '' }]

  return (
    <Document>
      <Page size="A4" style={{ fontFamily: 'Roboto', color: TEXTO }}>
        {/* ===== HEADER: azul izq + rosa der ===== */}
        <View style={{ flexDirection: 'row', height: 155, backgroundColor: AZUL, position: 'relative' }}>
          <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 366, backgroundColor: ROSA }} />
          {/* Logo EDIPA */}
          <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 34, zIndex: 2 }}>
            {logoDataUri ? (
              <Image src={logoDataUri} style={{ width: 200, height: 70, objectFit: 'contain' }} />
            ) : (
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>EDITORIAL PATRIA</Text>
            )}
          </View>
          {/* Texto sobre rosa — posiciones extraídas del PDF original */}
          <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 366, zIndex: 3 }}>
            <Text style={{ position: 'absolute', left: 146, top: 23, color: '#fff', fontSize: 31.5, fontWeight: 'bold' }}>PROFORMA</Text>
            <Text style={{ position: 'absolute', left: 147, top: 61, color: '#fff', fontSize: 16.7, fontWeight: 'bold' }}>RUC: 1708753056001</Text>
            <Text style={{ position: 'absolute', left: 198, top: 79, color: '#fff', fontSize: 15.1, fontStyle: 'italic' }}>A-003-026</Text>
            <Text style={{ position: 'absolute', left: 165, top: 91, color: '#fff', fontSize: 24.4, fontWeight: 'bold' }}>{numero}</Text>
          </View>
        </View>

        {/* ===== DATOS DEL CLIENTE ===== */}
        <View style={{ position: 'absolute', left: 34, top: 157, right: 21, height: 90 }}>
          {/* Fila 1: CLIENTE (x=34) | RUC (x=351) */}
          <View style={{ position: 'absolute', left: 0, top: 0, flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', color: AZUL }}>CLIENTE: </Text>
            <Text style={{ fontSize: 12, color: TEXTO }}>{cliente.nombre || ''}</Text>
          </View>
          <View style={{ position: 'absolute', left: 317, top: 0, flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', color: AZUL }}>RUC: </Text>
            <Text style={{ fontSize: 12, color: TEXTO }}>{cliente.ruc || ''}</Text>
          </View>
          {/* Fila 2: FECHA (y=184 → offset 27) */}
          <View style={{ position: 'absolute', left: 0, top: 27, flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', color: AZUL }}>FECHA: </Text>
            <Text style={{ fontSize: 12, color: TEXTO }}>{fecha}</Text>
          </View>
          {/* Fila 3: TELÉFONO (y=209 → offset 52) | CORREO (x=232 → offset 198) */}
          <View style={{ position: 'absolute', left: 0, top: 52, flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', color: AZUL }}>TELÉFONO: </Text>
            <Text style={{ fontSize: 12, color: TEXTO }}>{cliente.telefono || ''}</Text>
          </View>
          <View style={{ position: 'absolute', left: 198, top: 53, flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', color: AZUL }}>CORREO: </Text>
            <Text style={{ fontSize: 12, color: TEXTO }}>{cliente.correo || ''}</Text>
          </View>
        </View>

        {/* ===== TABLA ===== */}
        <View style={{ paddingHorizontal: 20, marginTop: 88 }}>
          {/* Header fila */}
          <View style={{ flexDirection: 'row', backgroundColor: AZUL, height: 36, alignItems: 'center' }}>
            <Text style={{ width: colCantWidth, color: '#fff', fontSize: 15, fontWeight: 'bold', paddingLeft: 16 }}>Cant.</Text>
            <Text style={{ width: colDescWidth, color: '#fff', fontSize: 15, fontWeight: 'bold', textAlign: 'center' }}>DESCRIPCIÓN</Text>
            <Text style={{ width: colUnitWidth, color: '#fff', fontSize: 15, fontWeight: 'bold', paddingLeft: 8 }}>V. Unit.</Text>
            <Text style={{ width: colTotalWidth, color: '#fff', fontSize: 15, fontWeight: 'bold', paddingLeft: 6 }}>V. TOTAL.</Text>
          </View>
          {/* Cuerpo */}
          {rowsToRender.map((it, i) => (
            <View key={i} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e8ebf2', minHeight: 20, alignItems: 'center', paddingVertical: 2 }}>
              <Text style={{ width: colCantWidth, fontSize: 12, paddingLeft: 16 }}>{it.cantidad !== '' ? Number(it.cantidad).toLocaleString('es-EC') : ''}</Text>
              <Text style={{ width: colDescWidth, fontSize: 12, paddingRight: 8 }}>{it.descripcion}</Text>
              <Text style={{ width: colUnitWidth, fontSize: 12, textAlign: 'right', paddingRight: 8 }}>{it.valorUnitario !== '' ? money(it.valorUnitario) : ''}</Text>
              <Text style={{ width: colTotalWidth, fontSize: 12, textAlign: 'right', paddingRight: 8 }}>{it.valorTotal !== '' ? money(it.valorTotal) : ''}</Text>
            </View>
          ))}
        </View>

        {/* ===== OBSERVACIONES ===== */}
        <View style={{ position: 'absolute', left: 34, top: 725 }}>
          <Text style={{ fontSize: 19.3, fontFamily: 'Caveat', color: ROSA }}>OBSERVACIONES:</Text>
          <Text style={{ fontSize: 11, marginTop: 4, lineHeight: 1.4, color: TEXTO }}>{observaciones || ''}</Text>
        </View>

        {/* ===== CONDICIONES (izquierda) ===== */}
        <View style={{ position: 'absolute', left: 34, top: 745, maxWidth: 350 }}>
          <Text style={{ fontSize: 13.2, fontWeight: 'bold', color: TEXTO }}>Forma de pago: {formaPago || ''}</Text>
          <Text style={{ fontSize: 13.2, fontWeight: 'bold', color: TEXTO, marginTop: 14 }}>Plazo de entrega: {plazoEntrega || ''}</Text>
        </View>

        {/* ===== TOTALES (derecha) ===== */}
        <View style={{ position: 'absolute', left: 424, top: 722 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 155 }}>
            <Text style={{ fontSize: 13.5, fontWeight: 'bold', color: '#000' }}>SUBTOTAL</Text>
            <Text style={{ fontSize: 13.5, color: TEXTO }}>{money(subtotal)}</Text>
          </View>
          <View style={{ width: 155, height: 1, backgroundColor: AZUL, marginVertical: 5 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 155 }}>
            <Text style={{ fontSize: 13.5, fontWeight: 'bold', color: '#000' }}>IVA 15%</Text>
            <Text style={{ fontSize: 13.5, color: TEXTO }}>{money(iva)}</Text>
          </View>
          <View style={{ width: 155, height: 2, backgroundColor: AZUL, marginVertical: 5 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 155 }}>
            <Text style={{ fontSize: 13.5, fontWeight: 'bold', color: AZUL }}>TOTAL</Text>
            <Text style={{ fontSize: 13.5, fontWeight: 'bold', color: AZUL }}>{money(total)}</Text>
          </View>
        </View>

        {/* ===== FOOTER ===== */}
        <View style={{ position: 'absolute', left: 34, right: 21, bottom: 24, flexDirection: 'row' }}>
          <View style={{ width: 32 }} />
          <View style={{ width: 80, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: AZUL, marginRight: 4 }} />
            <Text style={{ fontSize: 11.3, fontWeight: 'bold', color: AZUL }}>0998349359</Text>
          </View>
          <View style={{ width: 118, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: AZUL, marginRight: 4 }} />
            <Text style={{ fontSize: 9.7, fontWeight: 'bold', color: AZUL }}>www.edipatriaec.com</Text>
          </View>
          <View style={{ width: 130, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: AZUL, marginRight: 4 }} />
            <Text style={{ fontSize: 9.7, fontWeight: 'bold', color: AZUL }}>mariscal@edipatriaec.com</Text>
          </View>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: AZUL, marginRight: 4 }} />
            <Text style={{ fontSize: 9.1, fontWeight: 'bold', color: AZUL }}>VC Roca E6-26 y Reina Victoria</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default ProformaPdf
export { registerFonts }