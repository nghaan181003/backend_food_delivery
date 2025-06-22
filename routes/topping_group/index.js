const express = require("express");
const router = express.Router();

const toppingGroupController = require('../../controllers/toppingGroup.controller')

const asyncHandler = require('../../helpers/asyncHandler')


// Thêm nhóm topping
router.post('/create', asyncHandler(toppingGroupController.createToppingGroup))

// Danh sách các nhóm topping cho shop
router.get('/all', asyncHandler(toppingGroupController.getAllToppingGroupsForShop))

router.delete('/delete/:id', asyncHandler(toppingGroupController.deleteToppingGroup))


router.get('/', asyncHandler(async (req, res, next) => {
    return res.status(200).json({
        message: "Topping Group" // for testing
    });
}));
module.exports = router