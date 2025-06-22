const transporter = require('../config/nodemailer');
const { Result, AppError } = require('../utils/result');

class EmailService {
  async sendOtpEmail(to, otp) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: 'Xác thực OTP',
      text: `Mã OTP của bạn là: ${otp}`,
    };

    try {
      const info = await transporter.sendMail(mailOptions);

      return Result.success(info);
    } catch (error) {
      return Result.failure(new AppError('Failed to send OTP email', 500));
    }
  }
}

module.exports = new EmailService();