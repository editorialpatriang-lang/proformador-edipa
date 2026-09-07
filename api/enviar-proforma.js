// Vercel Serverless Function: enviar proforma por correo
// Usa las credenciales SMTP de edipo@edipatriaec.com (cPanel)
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const { to, clienteNombre, numero, pdfBase64 } = req.body

  if (!to || !clienteNombre || !numero || !pdfBase64) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }

  const smtpUser = process.env.EDIPO_EMAIL || 'edipo@edipatriaec.com'
  const smtpPass = process.env.EDIPO_EMAIL_PASS
  const smtpHost = process.env.SMTP_HOST || 'mail.edipatriaec.com'
  const smtpPort = parseInt(process.env.SMTP_PORT || '465')

  if (!smtpPass) {
    return res.status(500).json({ error: 'SMTP no configurado en el servidor' })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })

    const pdfBuffer = Buffer.from(pdfBase64, 'base64')

    const info = await transporter.sendMail({
      from: `"Edipo — Editorial Patria" <${smtpUser}>`,
      to,
      subject: `Proforma Nro. ${numero} — Editorial Patria (EDIPA)`,
      text: `Estimado/a ${clienteNombre},\n\nAdjunto encontrará la proforma Nro. ${numero} de Editorial Patria (EDIPA).\n\nSi tiene alguna consulta, no dude en contactarnos:\n- WhatsApp: 0998349359\n- Correo: mariscal@edipatriaec.com\n- Dirección: VC Roca E6-26 y Reina Victoria, La Mariscal, Quito\n\nwww.edipatriaec.com\n\nSaludos cordiales,\nEdipo — Editorial Patria`,
      attachments: [
        {
          filename: `Proforma_${numero}_${clienteNombre.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    res.json({ success: true, messageId: info.messageId })
  } catch (e) {
    res.status(500).json({ error: e.message, name: e.name, code: e.code || undefined })
  }
}