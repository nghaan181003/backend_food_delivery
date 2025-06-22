const express = require("express");
const router = express.Router();

const AuthController = require("../controllers/AuthController");
const fileUploader = require("../config/cloudinary.config");
const PartnerUpdateController = require("../controllers/AuthController")

router.post("/login", AuthController.login);

router.post("/register", AuthController.register);

router.post(
  "/driverRegister",
  fileUploader.fields([
    { name: "profileUrl", maxCount: 1 },
    { name: "licenseFrontUrl", maxCount: 1 },
    { name: "licenseBackUrl", maxCount: 1 },
  ]),
  AuthController.driverRegister
);

router.post(
  "/partnerRegister",
  fileUploader.fields([
    { name: "avatarUrl", maxCount: 1 },
    { name: "storeFront", maxCount: 1 },
    { name: "CCCDFrontUrl", maxCount: 1 },
    { name: "CCCDBackUrl", maxCount: 1 },
  ]),
  AuthController.partnerRegister
);

router.post("/verifyOTP", AuthController.verifyOtp);
router.post("/resendOTP", AuthController.resendOTP);
router.post("/resetPassword", AuthController.resetPassword);
router.post("/changePassword", AuthController.changePassword);

// Test
router.post(
  "/cloudinary-upload",
  fileUploader.single("file"),
  (req, res, next) => {
    if (!req.file) {
      next(new Error("No file uploaded!"));
      return;
    }
    res.json({ secure_url: req.file.path });
  }
);
router.post(
  "/partner/update/:userId",
  fileUploader.fields([
    { name: "avatarUrl", maxCount: 1 },
    { name: "storeFront", maxCount: 1 },
    { name: "CCCDFrontUrl", maxCount: 1 },
    { name: "CCCDBackUrl", maxCount: 1 },
  ]),
  AuthController.createPartnerUpdateRequest
);

router.get(
  "/update/requests",
  AuthController.getAllPartnerUpdateRequests
);

router.put("/partner/approve/:requestId", AuthController.handleApproveRequest);
router.patch("/partner/reject/:id", AuthController.rejectPartnerUpdateRequest);

router.post(
  "/driver/update/:userId",
  fileUploader.fields([
    { name: "profileUrl", maxCount: 1 },
    { name: "licenseFrontUrl", maxCount: 1 },
    { name: "licenseBackUrl", maxCount: 1 },

  ]),
  AuthController.createDriverUpdatedRequest
);

router.get(
  "/update/driver/requests",
  AuthController.getAllDriverUpdatedRequests
);

router.put("/driver/approve/:requestId", AuthController.handleDriverApproveRequest);
router.patch("/driver/reject/:id", AuthController.handleRejectDriverUpdateRequest);
module.exports = router;
