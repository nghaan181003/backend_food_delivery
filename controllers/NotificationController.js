const NotificationService = require("../services/NotificationService");
const {SuccessResponse, PAGINATED} = require("../core/success.response")

class NotificationController {
  createNotification = async (req, res, next) => {
    new SuccessResponse({
      message: "Tạo thông báo thành công!",
      data: await NotificationService.createNotification(req.body),
    }).send(res);
  };

  markAsRead = async (req, res, next) => {
    const updated = await NotificationService.markAsRead(req.params.id);

    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    new SuccessResponse({
      message: "Đánh dấu đã đọc thành công!",
      data: updated,
    }).send(res);
  };
  getNotificationByUserId = async (req, res, next) => {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const { notifications, totalCount, totalPages } = await NotificationService.getNotificationByUserId(
        userId,
        parseInt(page),
        parseInt(limit)
    );

    new PAGINATED({
        message: "Lấy danh sách thông báo thành công",
        data: notifications,
        totalPages,
        currentPage: parseInt(page),
        pageSize: parseInt(limit),
        totalItems: totalCount,
    }).send(res);
  };

  deleteNotification = async (req, res) => {
    const notification = await NotificationService.deleteNotification(req.params.id);
      
    if (!notification) {
      return res.status(404).json({message: "Không tìm thấy thông báo"});
    }
    new SuccessResponse({
      message: "Đã xóa thông báo",
    }).send(res)
  }

}

module.exports = new NotificationController();
