const nodemailer = require("nodemailer");

async function sendReportEmail({ config, pdfPath, recipients }) {
  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS
    }
  });

  return transporter.sendMail({
    from: config.REPORT_FROM,
    to: recipients.join(","),
    subject: "Better Bodies Gym – Weekly KPI Report",
    text: "Attached is the weekly KPI report.",
    attachments: [
      {
        filename: "weekly-report.pdf",
        path: pdfPath
      }
    ]
  });
}

module.exports = {
  sendReportEmail
};
