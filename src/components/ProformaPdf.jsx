import React from 'react'
import { Document, Page, Text, View, Image, Font } from '@react-pdf/renderer'

// Importar fuentes y logo
import robotoRegularData from '../fonts/Roboto-Regular.ttf'
import robotoBoldData from '../fonts/Roboto-Bold.ttf'
import robotoItalicData from '../fonts/Roboto-Italic.ttf'
import robotoBoldItalicData from '../fonts/Roboto-BoldItalic.ttf'
import caveatRegularData from '../fonts/Caveat-Regular.ttf'
import logoUrl from '../assets/logo-edipa.png'

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
      Font.register({ family: 'Caveat', fonts: [{ src: caveat, fontWeight: 400 }] })
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
const GRIS_SECCION = '#eef1f6'   // fondo gris suave para secciones
const GRIS_BORDE = '#d5dbe6'     // borde de la rejilla
const GRIS_FILA = '#f7f9fc'      // zebra alternada muy suave

const colCantWidth = 62
const colDescWidth = 338
const colUnitWidth = 76
const colTotalWidth = 78

function Section({ children }) {
  return (
    <View style={{
      backgroundColor: GRIS_SECCION,
      borderRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginHorizontal: 20,
    }}>
      {children}
    </View>
  )
}

function ProformaPdf({ data }) {
  const { numero, fecha, cliente, observaciones, formaPago, plazoEntrega, subtotal, iva, total, items } = data
  const maxRows = 18
  const visibleItems = (items || []).slice(0, maxRows)
  const rowsToRender = visibleItems.length > 0 ? visibleItems : [{ cantidad: '', descripcion: '', valorUnitario: '', valorTotal: '' }]

  return (
    <Document>
      <Page size="A4" style={{ fontFamily: 'Roboto', color: TEXTO, paddingBottom: 70 }}>
        {/* ===== HEADER: azul izq + rosa der ===== */}
        <View style={{ flexDirection: 'row', height: 155, backgroundColor: AZUL, position: 'relative' }}>
          <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 366, backgroundColor: ROSA }} />
          <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 34, zIndex: 2 }}>
            {logoDataUri ? (
              <Image src={logoDataUri} style={{ width: 200, height: 70, objectFit: 'contain' }} />
            ) : (
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>EDITORIAL PATRIA</Text>
            )}
          </View>
          <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 366, zIndex: 3 }}>
            <Text style={{ position: 'absolute', left: 146, top: 23, color: '#fff', fontSize: 31.5, fontWeight: 'bold' }}>PROFORMA</Text>
            <Text style={{ position: 'absolute', left: 147, top: 61, color: '#fff', fontSize: 16.7, fontWeight: 'bold' }}>RUC: 1708753056001</Text>
            <Text style={{ position: 'absolute', left: 198, top: 79, color: '#fff', fontSize: 15.1, fontStyle: 'italic' }}>A-003-026</Text>
            <Text style={{ position: 'absolute', left: 165, top: 91, color: '#fff', fontSize: 24.4, fontWeight: 'bold' }}>{numero}</Text>
          </View>
        </View>

        {/* ===== SECCIÓN CLIENTE (fondo gris) ===== */}
        <View style={{ marginTop: 16 }}>
          <Section>
            <View style={{ flexDirection: 'row' }}>
              <Text style={{ width: 290, fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', color: AZUL }}>
                CLIENTE: <Text style={{ fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', color: TEXTO }}>{cliente.nombre || ''}</Text>
              </Text>
              <Text style={{ width: 220, fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', color: AZUL }}>
                RUC: <Text style={{ fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', color: TEXTO }}>{cliente.ruc || ''}</Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <Text style={{ width: 290, fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', color: AZUL }}>
                FECHA: <Text style={{ fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', color: TEXTO }}>{fecha}</Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <Text style={{ width: 200, fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', color: AZUL }}>
                TELÉFONO: <Text style={{ fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', color: TEXTO }}>{cliente.telefono || ''}</Text>
              </Text>
              <Text style={{ fontSize: 15, fontWeight: 'bold', fontStyle: 'italic', color: AZUL }}>
                CORREO: <Text style={{ fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', color: TEXTO }}>{cliente.correo || ''}</Text>
              </Text>
            </View>
          </Section>
        </View>

        {/* ===== TABLA CON REJILLA ===== */}
        <View style={{ marginHorizontal: 20, marginTop: 14, borderWidth: 1, borderColor: GRIS_BORDE, borderRadius: 6, overflow: 'hidden' }}>
          {/* Header fila */}
          <View style={{ flexDirection: 'row', backgroundColor: AZUL, height: 34, alignItems: 'center' }}>
            <Text style={{ width: colCantWidth, color: '#fff', fontSize: 14, fontWeight: 'bold', paddingLeft: 12 }}>Cant.</Text>
            <Text style={{ width: colDescWidth, color: '#fff', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>DESCRIPCIÓN</Text>
            <Text style={{ width: colUnitWidth, color: '#fff', fontSize: 14, fontWeight: 'bold', paddingLeft: 8 }}>V. Unit.</Text>
            <Text style={{ width: colTotalWidth, color: '#fff', fontSize: 14, fontWeight: 'bold', paddingLeft: 6 }}>V. TOTAL.</Text>
          </View>
          {/* Cuerpo con rejilla (zebra) */}
          {rowsToRender.map((it, i) => (
            <View key={i} style={{
              flexDirection: 'row',
              minHeight: 22,
              alignItems: 'center',
              backgroundColor: i % 2 === 1 ? GRIS_FILA : '#ffffff',
              borderBottomWidth: i < rowsToRender.length - 1 ? 1 : 0,
              borderBottomColor: GRIS_BORDE,
            }}>
              <Text style={{ width: colCantWidth, fontSize: 12, paddingLeft: 12 }}>{it.cantidad !== '' ? Number(it.cantidad).toLocaleString('es-EC') : ''}</Text>
              <Text style={{ width: colDescWidth, fontSize: 12, paddingRight: 8, borderRightWidth: 1, borderRightColor: GRIS_BORDE }}>{it.descripcion}</Text>
              <Text style={{ width: colUnitWidth, fontSize: 12, textAlign: 'right', paddingRight: 6, borderRightWidth: 1, borderRightColor: GRIS_BORDE }}>{it.valorUnitario !== '' ? money(it.valorUnitario) : ''}</Text>
              <Text style={{ width: colTotalWidth, fontSize: 12, textAlign: 'right', paddingRight: 8 }}>{it.valorTotal !== '' ? money(it.valorTotal) : ''}</Text>
            </View>
          ))}
        </View>

        {/* ===== OBSERVACIONES + CONDICIONES + TOTALES (fondo gris) ===== */}
        <View style={{ marginTop: 16 }}>
          <Section>
            <View style={{ flexDirection: 'row' }}>
              {/* Izquierda: observaciones y condiciones */}
              <View style={{ flex: 1, paddingRight: 20 }}>
                <Text style={{ fontSize: 19.3, fontFamily: 'Caveat', color: ROSA }}>OBSERVACIONES:</Text>
                <Text style={{ fontSize: 11, marginTop: 4, lineHeight: 1.4, color: TEXTO }}>{observaciones || ''}</Text>
                <Text style={{ fontSize: 13.2, fontWeight: 'bold', color: TEXTO, marginTop: 14 }}>Forma de pago: <Text style={{ fontWeight: 'normal' }}>{formaPago || ''}</Text></Text>
                <Text style={{ fontSize: 13.2, fontWeight: 'bold', color: TEXTO, marginTop: 10 }}>Plazo de entrega: <Text style={{ fontWeight: 'normal' }}>{plazoEntrega || ''}</Text></Text>
              </View>
              {/* Derecha: totales */}
              <View style={{ width: 165, justifyContent: 'flex-start', paddingTop: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 165 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: 'bold', color: '#000' }}>SUBTOTAL</Text>
                  <Text style={{ fontSize: 13.5, color: TEXTO }}>{money(subtotal)}</Text>
                </View>
                <View style={{ width: 165, height: 1, backgroundColor: AZUL, marginVertical: 5 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 165 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: 'bold', color: '#000' }}>IVA 15%</Text>
                  <Text style={{ fontSize: 13.5, color: TEXTO }}>{money(iva)}</Text>
                </View>
                <View style={{ width: 165, height: 2, backgroundColor: AZUL, marginVertical: 5 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 165 }}>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: AZUL }}>TOTAL</Text>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: AZUL }}>{money(total)}</Text>
                </View>
              </View>
            </View>
          </Section>
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