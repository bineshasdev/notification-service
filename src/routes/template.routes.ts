import { Router } from 'express'
import { templateController } from '../controllers/template.controller'
import { authMiddleware, requireRole } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

router.get('/',                    templateController.list)
router.get('/event/:eventCode',    templateController.listByEvent)
router.get('/:id',                 templateController.getById)

// Live preview — render template with supplied variables (any authenticated role)
router.post('/preview',            templateController.preview)

// Tenant admin: customize a template (copy-on-write)
router.post('/customize',          requireRole('tenantadmin', 'superadmin'), templateController.customize)

// Tenant admin: reset customization to system default
router.post('/reset',              requireRole('tenantadmin', 'superadmin'), templateController.resetToDefault)

// Superadmin only: edit system templates
router.patch('/system/:id',        requireRole('superadmin'), templateController.updateSystem)

export default router
