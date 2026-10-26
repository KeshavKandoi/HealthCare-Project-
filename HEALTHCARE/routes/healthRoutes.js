import express from 'express';import {patientAuth} from '../middlewares/ecgAuth.js';import {getPool} from '../config/db.js';
const router=express.Router();router.use(patientAuth);
router.post('/add',(_req,res)=>res.status(410).json({message:'Use /api/v1/my-health/measurements; unsupported risk scores were removed.'}));
router.get('/:userId',async(req,res)=>{if(req.params.userId!==req.patientId)return res.status(403).json({message:'Forbidden'});try{const {rows}=await getPool().query('select * from patient_health_measurements where patient_id=$1 order by measured_at desc limit 500',[req.patientId]);res.json({success:true,data:rows})}catch{res.status(500).json({message:'Could not load history'})}});export default router;
