import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


export const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"Peer Connect" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email — Peer Connect",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0f; border-radius: 16px; overflow: hidden; border: 1px solid #1e1e2e;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
          <h1 style="margin: 0; color: #fff; font-size: 24px; font-weight: 700;">Peer Connect</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Email Verification</p>
        </div>
        <div style="padding: 32px; text-align: center;">
          <p style="color: #a0a0b8; font-size: 14px; margin: 0 0 24px;">
            Use the code below to verify your email address. It expires in <strong style="color: #c4b5fd;">10 minutes</strong>.
          </p>
          <div style="background: #12121a; border: 1px solid #2a2a3e; border-radius: 12px; padding: 20px; display: inline-block;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #c4b5fd; font-family: monospace;">
              ${otp}
            </span>
          </div>
          <p style="color: #6b6b80; font-size: 12px; margin: 24px 0 0;">
            If you didn't create a Peer Connect account, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
