const cron = require('node-cron');
const Discount = require('../models/Discount');
const Voucher = require('../models/Voucher');


async function updateDiscountStatuses() {
    const now = new Date();

    console.log(`${now.getTimezoneOffset()}] Updating discount statuses...`);

    // update from scheduled to running
    await Discount.updateMany({
        discount_start_date: { $lte: now },
        discount_end_date: { $gte: now },
        discount_status: 'scheduled',
    }, {
        $set: { discount_status: 'running' },
    });

    //  update from scheduled to finished
    await Discount.updateMany({
        discount_end_date: { $lt: now },
        discount_status: 'running',
    }, {
        $set: { discount_status: 'finished' },
    });

    await Voucher.updateMany({
        voucher_start_date: { $lte: now },
        voucher_end_date: { $gte: now },
        voucher_status: 'scheduled',
    }, {
        $set: { voucher_status: 'running' },
    });

    //  update from scheduled to finished
    await Voucher.updateMany({
        voucher_end_date: { $lt: now },
        voucher_status: 'running',
    }, {
        $set: { voucher_status: 'finished' },
    });



}



// Run this job every minute
cron.schedule('* * * * *', () => {
    console.log('Running discount status update job...');
    updateDiscountStatuses().catch(console.error);
});
