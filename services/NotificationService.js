const Notification = require("../models/Notification")

const createNotification = async (data) => {
    const notification = new Notification(data);
    return await notification.save();
  };

const markAsRead = async (notificationId) => {
    return await Notification.findByIdAndUpdate(
        notificationId,
        { isRead: true},
        { new: true}
    );
};
const getNotificationByUserId = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ recipientId: userId })
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limit);

  const totalCount = await Notification.countDocuments({ recipientId: userId });

  return {
      notifications,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
  };
};
const deleteNotification = async (id) => {
  try {
    const notification = await Notification.findByIdAndDelete(id);

    if (!id) {
      return null;
    }
    return notification;
  } catch (e) {
    throw new Error("Error delete notification");
  }
}

module.exports = {
    createNotification,
    markAsRead,
    getNotificationByUserId,
    deleteNotification
  };