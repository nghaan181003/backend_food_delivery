const ConfigService = require('../services/config.service');
const { SuccessResponse } = require('../core/success.response');
class ConfigController {
  async getConfigs(req, res) {
    try {
      const configs = await ConfigService.getConfigs();
      new SuccessResponse({
        message: `Lấy danh sách cấu hình thành công!`,
        data: configs,
      }).send(res);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        status: 'ERROR',
        message: error.message,
      });
    }
  }

  async getDeliveryFeeConfig(req, res) {
    try {
      const config = await ConfigService.getDeliveryFeeConfig();
      new SuccessResponse({
        message: 'Lấy cấu hình phí vận chuyển thành công!',
        data: config,
      }).send(res);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        status: 'ERROR',
        message: error.message,
      });
    }
  }

  async createConfig(req, res) {
    try {
      const config = await ConfigService.createConfig(req.body);
      new SuccessResponse({
        message: 'Lưu cấu hình thành công!',
        data: config,
      }).send(res);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        status: 'ERROR',
        message: error.message,
      });
    }
  }

  async updateConfig(req, res) {
    try {
      const config = await ConfigService.updateConfig({
        id: req.params.id,
        ...req.body,
      });
      new SuccessResponse({
        message: 'Cập nhật cấu hình thành công!',
        data: config,
      }).send(res);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        status: 'ERROR',
        message: error.message,
      });
    }
  }

  async deleteConfig(req, res) {
    try {
      const config = await ConfigService.deleteConfig(req.params.id);
      new SuccessResponse({
        message: 'Xóa cấu hình thành công!',
        data: config,
      }).send(res);
    } catch (error) {
      res.status(error.statusCode || 500).json({
        status: 'ERROR',
        message: error.message,
      });
    }
  }
}

module.exports = new ConfigController();