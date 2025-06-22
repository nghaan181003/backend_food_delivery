const partnerService = require("../services/PartnerServices");
const UpdatedPartner = require("../models/UpdatedPartner");
const cron = require('node-cron');

async function checkAndUpdatePartnerStatus() {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const day = now.toLocaleDateString("en-US", { weekday: "long" }); 

  const partners = await UpdatedPartner.find({ schedule: { $exists: true, $not: { $size: 0 } } });

  for (const partner of partners) {
    const todaySchedule = partner.schedule.find((sch) => sch.day === day);

    if (!todaySchedule) continue;

    for (const slot of todaySchedule.timeSlots) {
      if (slot.open === currentTime) {
        await partnerService.openPartner(partner._id);
        console.log(`Partner ${partner._id} opened at ${currentTime}`);
      }
      if (slot.close === currentTime) {
        await partnerService.closePartner(partner._id);
        console.log(`Partner ${partner._id} closed at ${currentTime}`);
      }
    }
  }
}

cron.schedule("* * * * *", async () => {
  console.log("Cron job chạy lúc", new Date());
  try {
    await checkAndUpdatePartnerStatus();
  } catch (error) {
    console.error("Lỗi khi chạy cron job:", error);
  }
});

