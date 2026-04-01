import { Router } from 'express'
import { preferenceController } from '../controllers/preference.controller'
import { authMiddleware } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

router.get('/',          preferenceController.list)
router.put('/:channel',  preferenceController.upsert)

export default router
