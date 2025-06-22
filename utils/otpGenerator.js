const crypto = require("crypto");
const generateOtp = () => {
  const otp = crypto.randomInt(1000, 9999).toString(); // Random 6-digit OTP
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);  // Hết hạn sau 10 phút
  return { otp, otpExpires };
};

module.exports = { generateOtp };