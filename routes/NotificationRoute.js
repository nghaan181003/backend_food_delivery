const express = require("express");
const router = express.Router();
const NotificationController = require("../controllers/NotificationController");

// Route for creating a new notification
router.post("/", NotificationController.createNotification);
router.patch("/read/:id", NotificationController.markAsRead);
router.get("/:userId", NotificationController.getNotificationByUserId);
router.delete("/delete/:id", NotificationController.deleteNotification);
module.exports = router;