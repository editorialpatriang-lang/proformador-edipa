// Emisores (locales) de la proforma.
// Define el RUC y los datos que salen en el encabezado y el pie del PDF.
// El selector del formulario elige cuál se usa; la elección se guarda en proformas.emisor.

export const EMISORES = [
  {
    id: 'mariscal',
    nombre: 'Local Mariscal',
    ruc: '1708753056001',
    codigoEstablecimiento: 'A-003-026',
    telefono: '0998349359',
    web: 'www.edipatriaec.com',
    correo: 'mariscal@edipatriaec.com',
    direccion: 'VC Roca E6-26 y Reina Victoria',
  },
  {
    id: 'santaclara',
    nombre: 'Santa Clara',
    ruc: '1722300132001',
    codigoEstablecimiento: 'A-003-026',
    telefono: '0984217112',
    web: 'www.edipatriaec.com',
    correo: 'santaclara@edipatriaec.com',
    direccion: 'Ramírez Dávalos Oe 3-91 y Antonio de Ulloa',
  },
]

export const EMISOR_DEFAULT = 'mariscal'

export function getEmisor(id) {
  return EMISORES.find(e => e.id === id) || EMISORES[0]
}

// Forma de pago: menú desplegable. '__otro__' abre un campo libre.
export const FORMA_PAGO_OTRO = '__otro__'
export const FORMAS_PAGO = [
  '60% anticipo, 40% entrega',
  '50% anticipo, 50% entrega',
  FORMA_PAGO_OTRO,
]
export const FORMA_PAGO_LABELS = {
  [FORMA_PAGO_OTRO]: 'Otra (especificar)',
}
export const FORMA_PAGO_DEFAULT = FORMAS_PAGO[0]

// Plazo de entrega: opciones fijas en días hábiles.
export const PLAZOS_ENTREGA = [
  '3 días hábiles',
  '5 días hábiles',
  '8 días hábiles',
  '10 días hábiles',
  '15 días hábiles',
]

// Devuelve el texto final de forma de pago (resuelve "Otra" -> texto libre)
export function resolveFormaPago(seleccion, otroTexto) {
  return seleccion === FORMA_PAGO_OTRO ? (otroTexto || '').trim() : seleccion
}
