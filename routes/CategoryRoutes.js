const express = require("express");
const router = express.Router();
const asyncHandler = require("../helpers/asyncHandler")

const {
  addCategory,
  addCategoryV2,
  getCategoriesByPartnerId,
  deleteCategory,
  deleteAllCategoriesOfPartner,
  updateCategory,
  reorderCategoryIndex,
  deleteCategoryV2
} = require("../controllers/CategoryController");

router.post("/", asyncHandler(addCategoryV2));
router.post("/reorder", reorderCategoryIndex);
router.get("/:partnerId", getCategoriesByPartnerId);
// router.delete("/:id", deleteAllCategoriesOfPartner);
router.delete("/:id", asyncHandler(deleteCategoryV2));
router.delete("/deleteAll/:partnerId", deleteAllCategoriesOfPartner);
router.put("/:categoryId", updateCategory);

module.exports = router;
