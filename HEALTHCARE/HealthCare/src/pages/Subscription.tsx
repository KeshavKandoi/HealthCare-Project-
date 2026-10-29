import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import axios from 'axios';
import API from '../Api/API';
import { isDemoSession } from '../demo/demoSession';
import { useLanguage } from '../i18n/LanguageContext';
import './Subscription.css';
import { moveSpotlight } from '../ui/spotlight';

type PlanId = 'holter-device' | 'holter-care';
type Inquiry = { id: string; plan_id: PlanId; status: string; created_at: string };
const plans: { id: PlanId; label: string; price: string; suffix: string; description: string; items: string[] }[] = [
  { id:'holter-device', label:'Holter device', price:'₹4,999', suffix:'proposed one-time price', description:'Own the recorder and manage your clinical follow-up independently.', items:['Holter recorder and starter accessories','App pairing, recording timeline and technical reports','Symptom markers and health history','Device setup guidance','Doctor appointments charged separately'] },
  { id:'holter-care', label:'Holter + care', price:'₹7,999', suffix:'proposed first-year package', description:'Device ownership with one year of supported monitoring and planned clinician access.', items:['Everything in Holter device','Four remote cardiology reviews during year one, subject to confirmed availability','One year of device maintenance and service support','One year of Heartline app access and sync services','Chat and video around confirmed appointments'] },
];
export default function Subscription(){
  const signedIn = useSelector((state: RootState) => Boolean(state.auth.user));
  const demo = isDemoSession();
  const { locale, tr } = useLanguage();
  const [choice,setChoice]=useState<PlanId|null>(null);const [phone,setPhone]=useState('');const [note,setNote]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [inquiries,setInquiries]=useState<Inquiry[]>([]);const [sent,setSent]=useState(false);
  useEffect(()=>{if(isDemoSession())return;API.get('/plan-inquiries/mine').then(r=>setInquiries(r.data.inquiries)).catch(()=>{});},[]);
  const submit=async(event:React.FormEvent)=>{event.preventDefault();if(!choice)return;setBusy(true);setError('');try{const {data}=await API.post('/plan-inquiries',{planId:choice,contactPhone:phone,note});setInquiries(old=>[data.inquiry,...old]);setChoice(null);setSent(true)}catch(cause){setError(axios.isAxiosError(cause)?cause.response?.data?.message||'Could not save your request':'Could not save your request')}finally{setBusy(false)}};
  return <main className="plan-page"><header className="plan-intro"><span>HEARTLINE HOLTER</span><h1>{tr('Choose how you want to monitor.')}</h1><p>{tr('Two ways to own your Holter recorder. The care package adds doctor reviews, service and app access for the first year.')}</p><div className="plan-note">{tr('Prices below are proposed launch estimates in INR. Hardware specifications, doctor availability, taxes, delivery and final terms are confirmed in a written quote before any payment.')}</div></header>
    <div className="plan-grid">{plans.map((plan,index)=><article className={`plan-card hl-spotlight hl-reveal ${index===1?'featured':''}`} onPointerMove={moveSpotlight} key={plan.id}><div className="plan-card-top"><span className="plan-mark" aria-hidden="true"><i className="fa-solid fa-heart-pulse" /></span><span>{tr(index===1?'SUPPORTED CARE':'DEVICE OWNERSHIP')}</span>{index===1&&<strong>{tr('Most complete')}</strong>}</div><h2>{tr(plan.label)}</h2><p className="plan-description">{tr(plan.description)}</p><div className="plan-price">{plan.price}<small>{tr(plan.suffix)}</small></div><button className="hl-button" onClick={()=>{setChoice(plan.id);setSent(false);document.getElementById('plan-request')?.scrollIntoView({behavior:'smooth'})}}>{tr('Request purchase quote →')}</button><ul>{plan.items.map(item=><li key={item}><span aria-hidden="true">✓</span>{tr(item)}</li>)}</ul></article>)}</div>
    <section className="plan-request" id="plan-request"><div><span>{tr('YOUR REQUEST')}</span><h2>{tr('Talk with our team before buying')}</h2><p>{tr('Tell us which package you want. We will confirm the device model, delivery, service scope and payment details in writing.')}</p>{sent&&<p className="plan-success" role="status">{tr(demo?'Sample request saved in this demo session. No team receives it.':'Request saved. Your plan request is shown below.')}</p>}</div>{signedIn ? <form onSubmit={submit}><label>{tr('Program')}<select required value={choice||''} onChange={event=>setChoice(event.target.value as PlanId)}><option value="">{tr('Select a program')}</option>{plans.map(plan=><option value={plan.id} key={plan.id}>{tr(plan.label)}</option>)}</select></label><label>{tr('Phone number')}<input required type="tel" autoComplete="tel" value={phone} onChange={event=>setPhone(event.target.value)} placeholder="+91 98765 43210" /></label><label>{tr('Questions or delivery city (optional)')}<textarea value={note} maxLength={500} onChange={event=>setNote(event.target.value)} /></label>{error&&<p role="alert" className="plan-error">{error}</p>}<button className="hl-button" disabled={busy} type="submit">{tr(busy?'Saving request…':'Send purchase request')}</button><small>{tr(demo?'Demo requests stay on this device. No payment is collected.':'No payment is collected here.')}</small></form> : <div className="plan-signin"><h3>{tr('Sign in to request a quote')}</h3><p>{tr('Your contact details and selected plan will be saved to your account.')}</p><Link to="/login">{tr('Sign in or explore the demo →')}</Link></div>}</section>
    {inquiries.length>0&&<section className="plan-history"><h2>{tr('Your plan requests')}</h2>{inquiries.map(item=><div key={item.id}><strong>{plans.find(p=>p.id===item.plan_id)?.label}</strong><span>{new Date(item.created_at).toLocaleDateString(locale)} · {item.status}</span></div>)}</section>}
  </main>;
}
