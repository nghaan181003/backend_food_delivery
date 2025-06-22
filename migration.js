const mongoose = require('mongoose');
const Order = require('./models/Order'); // đường dẫn tới model Order của bạn

async function updateOrderFields() {
    await mongoose.connect('mongodb+srv://root:u9Kw2FvLUSJFpAJw@fooddelivery.cso1x.mongodb.net/prod?retryWrites=true&w=majority&appName=FoodDelivery');

    const result = await Order.updateMany(
        {
            $or: [
                { isRestaurantPaid: { $exists: false } },
                { isDriverPaid: { $exists: false } }
            ]
        },
        {
            $set: {
                isRestaurantPaid: false,
                isDriverPaid: false
            }
        }
    );

    console.log(`✅ Đã cập nhật ${result.modifiedCount} đơn hàng`);
    await mongoose.disconnect();
}

updateOrderFields();
