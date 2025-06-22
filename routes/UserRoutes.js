const express = require("express");
const { loadListUser, loadListUserByRoleAndStatus, approveUser, updateUser, deleteUser, deleteApprove, getUserByUserId, getAllUserInAdmin } = require("../controllers/UserController");
const OrderController = require("../controllers/OrderController");

const router = express.Router();

router.get("/", loadListUser);
router.get("/approve", loadListUserByRoleAndStatus);
router.put("/approve/:userId", approveUser);
router.put("/:userId", updateUser)
router.put("/delete/:userId", deleteUser);
router.delete("/:userId", deleteApprove);
router.get("/:id", getUserByUserId);
router.get("/rating/:customerId", OrderController.getAllRatingByCustomer);
router.get("/admin/all", getAllUserInAdmin);
module.exports = router;
