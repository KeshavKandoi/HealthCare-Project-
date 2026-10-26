import { express } from '../serverDependencies.js';
import { randomUUID } from 'node:crypto';
import { getPool } from '../config/db.js';
import { patientAuth } from '../middlewares/ecgAuth.js';
const router = express.Router();
function operator(req: any, res: any, next: any) { if (!process.env.CLINICIAN_OPERATOR_KEY || req.headers['x-operator-key'] !== process.env.CLINICIAN_OPERATOR_KEY) return res.status(403).json({message:'Operator access required'}); next(); }
router.get('/operator/inbox', operator, async (_req: any, res: any) => {
  try { const {rows}=await getPool().query(`select q.id,q.plan_id,q.contact_phone,q.note,q.status,q.created_at,u.data->>'name' patient_name,u.data->>'email' patient_email from plan_inquiries q join app_users u on u.id=q.patient_id order by q.created_at desc limit 200`); res.json({inquiries:rows}); }
  catch { res.status(500).json({message:'Could not load purchase requests'}); }
});
router.patch('/operator/:id', operator, async (req: any, res: any) => {
  if (!['contacted','quoted','closed'].includes(req.body?.status)) return res.status(400).json({message:'Invalid status'});
  try { const {rows}=await getPool().query('update plan_inquiries set status=$2 where id=$1 returning id,plan_id,status,created_at',[req.params.id,req.body.status]); if (!rows[0]) return res.status(404).json({message:'Request unavailable'}); res.json({inquiry:rows[0]}); }
  catch { res.status(500).json({message:'Could not update purchase request'}); }
});
router.use(patientAuth);
router.get('/mine', async (req: any, res: any) => {
  try { const { rows } = await getPool().query('select id,plan_id,contact_phone,note,status,created_at from plan_inquiries where patient_id=$1 order by created_at desc limit 30',[req.patientId]); res.json({inquiries:rows}); }
  catch { res.status(500).json({message:'Could not load plan requests'}); }
});
router.post('/', async (req: any, res: any) => {
  const { planId, contactPhone, note } = req.body || {};
  if (!['holter-device','holter-care'].includes(planId) || typeof contactPhone !== 'string' || !/^\+?[0-9 ()-]{8,20}$/.test(contactPhone.trim()) || typeof note !== 'string' || note.length > 500) return res.status(400).json({message:'Choose a plan and enter a valid contact number'});
  try { const {rows} = await getPool().query('insert into plan_inquiries(id,patient_id,plan_id,contact_phone,note) values($1,$2,$3,$4,$5) returning id,plan_id,status,created_at',[randomUUID(),req.patientId,planId,contactPhone.trim(),note.trim()||null]); res.status(201).json({inquiry:rows[0]}); }
  catch { res.status(500).json({message:'Could not save plan request'}); }
});
export default router;
