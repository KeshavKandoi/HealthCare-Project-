import Health from "../models/healthModel.js"

export const checkMentalHealth = async (req,res)=>{

try{

const {answers,userId}=req.body

let score=answers.reduce((a,b)=>a+b,0)

let level="Minimal"

if(score>=5 && score<=9) level="Mild"
if(score>=10 && score<=14) level="Moderate"
if(score>=15 && score<=19) level="Moderately Severe"
if(score>=20) level="Severe"

await Health.create({

user:userId,
mentalScore:score,
mentalLevel:level

})

res.json({

success:true,
score,
level

})

}catch(error){

console.log(error)
res.status(500).json({success:false})

}

}