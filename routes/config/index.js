const express = require('express');
const router = express.Router();
const ConfigController = require('../../controllers/config.controller');

router.get('/', ConfigController.getConfigs);
router.get('/delivery-fee', ConfigController.getDeliveryFeeConfig);
router.post('/', ConfigController.createConfig);
router.put('/:id', ConfigController.updateConfig);
router.delete('/:id', ConfigController.deleteConfig);

module.exports = router;