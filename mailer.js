import nodemailer from 'nodemailer';

let transport = null;
if (process.env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// Without SMTP settings the email is printed to the console (handy for development).
export async function sendMail({ to, subject, text }) {
  if (!transport) {
    console.log(`\n--- EMAIL (not sent, no SMTP configured) ---\nTo: ${to}\nSubject: ${subject}\n${text}\n--------------------------------------------\n`);
    return;
  }
  await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
}
