import { Router } from 'express';
import { ForecastingController } from '../controllers/forecastingController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, ForecastingController.getForecasts);
router.post('/generate', authenticate, ForecastingController.generateForecast);
router.get('/:productId', authenticate, ForecastingController.getProductForecastAnalytics);

export default router;
