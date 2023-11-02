import express from 'express';
import * as controller from '../controllers/roadController.js';

const router = express.Router();

router.get('/csv', controller.downloadRoadsCsv);
router.get('/:id/csv', controller.downloadRoadCsv);

router.post('/', controller.createRoad);
router.get('/', controller.getRoads);
router.get('/:id', controller.getRoad);
router.put('/:id', controller.updateRoad);
router.put('/:id/locations/csv', controller.updateLocationsCsv);
router.delete('/:id', controller.deleteRoad);

export default router;
