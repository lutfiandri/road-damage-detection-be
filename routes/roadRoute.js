import express from 'express';
import * as controller from '../controllers/roadController';

const router = express.Router();

router.post('/', controller.createRoad);
router.get('/', controller.getRoads);
router.get('/:id', controller.getRoad);
router.put('/', controller.updateRoad);
router.delete('/', controller.deleteRoad);

export default router;
