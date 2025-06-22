const AsyncHandler = require("express-async-handler");
const express = require("express");
const router = express.Router();
const ApiResponse = require("../controllers/response/ApiResponse");
const { StatusCodes } = require("http-status-codes");
const AuthMiddleWare = require("../middlewares/AuthMiddleWare");

// importing all routes
const AuthRoutes = require("./AuthRoutes");
const DriverRoutes = require("./DriverRoutes");
const PartnerRoutes = require("./PartnerRoutes");
const CategoryRoutes = require("./CategoryRoutes");
const UserRoutes = require("./UserRoutes");
const ItemRoutes = require("./ItemRoutes");
const OrderRoutes = require("./OrderRoutes");
const MapRoutes = require("./MapRoutes");
const ProductRoute = require("./product")
const ToppingGroupRoute = require("./topping_group")
const ToppingRoute = require("./topping")
const UploadRoute = require("./upload")
const PaymentRoutes = require("./payment")
const NotificationRoutes = require("./NotificationRoute")
const ConfigRoutes = require("./config")
const DiscountRoutes = require("./discount")
const WalletRoutes = require("./WalletRoute")
const VoucherRoutes = require("./voucher")


// assign prefix - to routes
router.use("/auth", AuthRoutes);
router.use("/driver", DriverRoutes);
router.use("/partner", PartnerRoutes);
router.use("/category", CategoryRoutes);
router.use("/user", UserRoutes);
router.use("/item", ItemRoutes);
router.use("/order", OrderRoutes);
router.use("/map", MapRoutes);
router.use("/product", ProductRoute)
router.use("/upload", UploadRoute)
router.use("/toppingGroup", ToppingGroupRoute)
router.use("/topping", ToppingRoute)
router.use("/payment", PaymentRoutes)
router.use("/notification", NotificationRoutes)
router.use("/config", ConfigRoutes)
router.use("/discount", DiscountRoutes)
router.use("/wallet", WalletRoutes)
router.use("/voucher", VoucherRoutes)

module.exports = router;
