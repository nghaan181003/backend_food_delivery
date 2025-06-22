const crypto = require('crypto');

function hmacHexEncode(key, data) {
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  return hmac.digest('hex');
}
