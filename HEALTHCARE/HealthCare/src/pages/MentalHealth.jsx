import React,{useState} from "react"
import axios from "axios"

const questions=[

"Little interest in doing things",
"Feeling depressed",
"Trouble sleeping",
"Feeling tired",
"Poor appetite",
"Feeling bad about yourself",
"Trouble concentrating",
"Moving slowly",
"Thoughts of self harm",

"Work pressure",
"Financial stress",
"Sleep problems",
"Work hour stress",
"Family support issues"

]

function MentalHealth(){

const [answers,setAnswers]=useState(Array(questions.length).fill(0))
const [result,setResult]=useState(null)

const handleChange=(index,value)=>{

const updated=[...answers]
updated[index]=Number(value)
setAnswers(updated)

}

const submit=async()=>{

try{

const res=await axios.post(

"http://localhost:4000/api/v1/mental-health/check",

{answers}

)

setResult(res.data)

}catch(error){

console.log(error)

}

}

return(

<div className="container mt-5">

<h2>Mental Health Test</h2>

{questions.map((q,i)=>(

<div key={i} className="mb-3">

<label>{q}</label>

<select
className="form-control"
onChange={(e)=>handleChange(i,e.target.value)}
>

<option value="0">Not at all</option>
<option value="1">Several days</option>
<option value="2">More than half the days</option>
<option value="3">Nearly every day</option>

</select>

</div>

))}

<button
className="btn btn-primary mt-3"
onClick={submit}
>

Check Mental Health

</button>

{result &&(

<div className="mt-4">

<h4>Total Score: {result.score}</h4>

<h5>Depression Level: {result.level}</h5>

</div>

)}

</div>

)

}

export default MentalHealth