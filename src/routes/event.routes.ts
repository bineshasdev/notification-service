import { Router } from 'express'
import { eventController } from '../controllers/event.controller'
import { authMiddleware } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

router.get('/',           eventController.list)
router.get('/:code',      eventController.getByCode)

export default router
