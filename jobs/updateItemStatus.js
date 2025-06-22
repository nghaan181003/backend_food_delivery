const itemService = require("../services/ItemServices");
const Item = require("../models/Item");
const cron = require('node-cron');

async function checkAndUpdateItemStatus() {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const day = now.toLocaleDateString("en-US", { weekday: "long" }); 

  const items = await Item.find({ schedule: { $exists: true, $not: { $size: 0 } } });

  for (const item of items) {
    const todaySchedule = item.schedule.find((sch) => sch.day === day);

    if (!todaySchedule) continue;

    for (const slot of todaySchedule.timeSlots) {
      if (slot.open === currentTime) {
        await itemService.openItem(item._id);
        console.log(`Partner ${item._id} opened at ${currentTime}`);
      }
      if (slot.close === currentTime) {
        await itemService.closeItem(item._id);
        console.log(`Partner ${item._id} closed at ${currentTime}`);
      }
    }
  }
}

cron.schedule("* * * * *", async () => {
  console.log("Cron job (item) chạy lúc", new Date());
  try {
    await checkAndUpdateItemStatus();
  } catch (error) {
    console.error("Lỗi khi chạy cron job (item):", error);
  }
});

