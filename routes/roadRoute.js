import express from 'express';
import * as controller from '../controllers/roadController';

const router = express.Router();

router.post('/', controller.createRoad);
router.get('/', controller.getRoads);
router.get('/:id', controller.getRoad);
router.put('/:id', controller.updateRoad);
router.put('/:id/locations/csv', controller.updateLocationsCsv);
router.delete('/:id', controller.deleteRoad);

export default router;
