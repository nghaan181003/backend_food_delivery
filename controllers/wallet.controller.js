const walletService = require('../services/wallet.service');

const getWalletInfo = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { balance, transactions } = await walletService.getWalletInfo(userId);

    res.status(200).json({
      success: "Lấy thông tin ví thành công",
      balance,
      transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lấy thông tin ví thất bại',
    });
  }
};

module.exports = { getWalletInfo };
