const axios = require('axios');
require('dotenv').config();
const AppInfo = {
  appId: process.env.ZALOPAY_APP_ID,
  macKey: process.env.ZALOPAY_MAC_KEY,
  createOrderUrl: process.env.ZALOPAY_CREATE_ORDER_URL,
};

function getAppTransId() {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replace('-', '').replace('-', '');  // ddMMyy
  const randomId = now.getMilliseconds() % 1000000;
  return `${date}${randomId}`;
}

async function createOrder(amount) {
  const appTime = Date.now().toString();
  const appTransId = getAppTransId();
  const embedData = '{}';
  const items = '[]';
  const appUser = 'Node_Demo';

  const inputHMac = [
    AppInfo.appId,
    appTransId,
    appUser,
    amount,
    appTime,
    embedData,
    items
  ].join('|');

  const mac = hmacHexEncode(AppInfo.macKey, inputHMac);

  const body = {
    app_id: AppInfo.appId.toString(),
    app_user: appUser,
    app_time: appTime,
    amount: amount,
    app_trans_id: appTransId,
    embed_data: embedData,
    item: items,
    bank_code: 'zalopayapp',
    description: `Merchant pay for order #${appTransId}`,
    mac: mac
  };

  try {
    const response = await axios.post(AppInfo.createOrderUrl, new URLSearchParams(body).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (response.status === 200) {
      return response.data;
    } else {
      console.error("Failed:", response.status, response.data);
      return null;
    }
  } catch (error) {
    console.error("Exception:", error);
    return null;
  }
}
