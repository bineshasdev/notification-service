import { Router } from 'express'
import { notificationController } from '../controllers/notification.controller'
import { authMiddleware } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

router.get('/',               notificationController.list)
router.post('/',              notificationController.create)
router.get('/unread-count',   notificationController.unreadCount)
router.patch('/:id/read',     notificationController.markRead)
router.post('/mark-all-read', notificationController.markAllRead)

export default router
