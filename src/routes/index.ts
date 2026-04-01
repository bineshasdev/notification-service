import { Router } from 'express'
import notificationRoutes from './notification.routes'
import templateRoutes     from './template.routes'
import preferenceRoutes   from './preference.routes'
import eventRoutes        from './event.routes'

const router = Router()

router.use('/notifications', notificationRoutes)
router.use('/templates',     templateRoutes)
router.use('/preferences',   preferenceRoutes)
router.use('/events',        eventRoutes)

export default router
