const categoryMeta = {
  "Organic": ["🍃", "Compostable"],
  "Plastic": ["🧴", "Dry waste"],
  "Paper": ["📄", "Dry waste"],
  "Glass": ["🍶", "Special collection"],
  "Metal": ["🥫", "Dry waste"],
  "E-waste": ["🔌", "Special collection"],
  "Hazardous": ["⚠️", "Special collection"]
};
let categoryData = {};
let selectedCategory = "";
const $ = id => document.getElementById(id);

async function api(url, options={}) {
  const response = await fetch(url, {
    headers: {"Content-Type":"application/json", ...(options.headers||{})},
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
function safe(text) {
  return String(text ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
async function loadCategories() {
  categoryData = await api("/api/categories");
  const grid = $("category-grid");
  const select = $("category");
  Object.keys(categoryData).forEach(name => {
    const [emoji, label] = categoryMeta[name];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "category-card";
    card.innerHTML = `<span class="category-emoji">${emoji}</span><b>${safe(name)}</b><small>${safe(label)}</small>`;
    card.addEventListener("click", () => showGuide(name));
    grid.appendChild(card);
    select.add(new Option(name, name));
  });
}
function showGuide(name) {
  selectedCategory = name;
  document.querySelectorAll(".category-card").forEach((el, i) => {
    el.classList.toggle("active", Object.keys(categoryData)[i] === name);
  });
  const d = categoryData[name];
  $("guide-detail").innerHTML = `<div class="guide-content">
    <div><span class="guide-pill">${safe(d.bin)}</span><h3 style="margin-top:10px">${safe(name)} waste</h3><p>${safe(d.method)}</p></div>
    <div><h3>Common examples</h3><ul>${d.items.map(x=>`<li>${safe(x)}</li>`).join("")}</ul></div>
    <div><h3>Remember</h3><p>${safe(d.avoid)}</p></div>
  </div>`;
  $("category").value = name;
}
async function loadDashboard() {
  const data = await api("/api/stats");
  $("stat-records").textContent = data.total_records;
  $("stat-quantity").textContent = Number(data.total_quantity).toLocaleString();
  $("stat-quizzes").textContent = data.quiz_attempts;
  const recent = $("recent-list");
  if (!data.recent.length) {
    recent.innerHTML = '<div class="empty-state">No records yet. Add your first entry.</div>';
    return;
  }
  recent.innerHTML = data.recent.map(r => {
    const emoji = (categoryMeta[r.category] || ["♻"])[0];
    const date = new Date(r.created_at).toLocaleString();
    return `<div class="recent-item"><div class="recent-left"><span class="recent-emoji">${emoji}</span><div><b>${safe(r.item_name)}</b><small>${safe(r.category)} · ${safe(date)}</small></div></div><span class="recent-qty">${safe(r.quantity)} ${safe(r.unit)}</span></div>`;
  }).join("");
}
$("waste-form").addEventListener("submit", async e => {
  e.preventDefault();
  const message = $("form-message");
  message.className = "form-message";
  message.textContent = "Saving...";
  try {
    const result = await api("/api/records", {method:"POST", body:JSON.stringify({
      category:$("category").value, item_name:$("item-name").value.trim(),
      quantity:$("quantity").value, unit:$("unit").value, notes:$("notes").value.trim()
    })});
    message.textContent = result.message;
    $("waste-form").reset();
    await loadDashboard();
  } catch(err) {
    message.className = "form-message error";
    message.textContent = err.message;
  }
});

const questions = [
  {q:"Where should clean, dry newspapers usually go?", a:["Organic waste","Paper recycling","E-waste","Hazardous waste"], correct:1, explain:"Clean, dry newspapers can usually be sent for paper recycling."},
  {q:"What is a good way to handle fruit and vegetable peels?", a:["Put them with glass","Burn them","Compost them","Put them with batteries"], correct:2, explain:"Fruit and vegetable peels are organic waste and can be composted."},
  {q:"Where should an old mobile phone be taken?", a:["Regular food-waste bin","Authorised e-waste collection","Paper bin","Compost pit"], correct:1, explain:"Phones contain materials that need specialist e-waste handling."},
  {q:"Why should recyclable containers be empty and clean?", a:["To reduce contamination","To make them heavier","To change their colour","It does not matter"], correct:0, explain:"Food residue can contaminate other recyclable materials."},
  {q:"What should you do with unknown household chemicals?", a:["Pour them into a drain","Mix them together","Put them in the compost","Follow local hazardous-waste guidance"], correct:3, explain:"Unknown chemicals should never be mixed or poured into drains."}
];
let qIndex=0, score=0, chosen=null, answered=false;
function renderQuestion() {
  const q=questions[qIndex];
  $("quiz-progress").textContent=`QUESTION ${qIndex+1} OF ${questions.length}`;
  $("progress-fill").style.width=`${(qIndex+1)/questions.length*100}%`;
  $("question-text").textContent=q.q;
  $("quiz-feedback").textContent="";
  $("next-question").disabled=true;
  $("next-question").textContent=qIndex===questions.length-1?"See result →":"Next question →";
  $("answer-options").innerHTML="";
  chosen=null; answered=false;
  q.a.forEach((answer,i)=>{
    const b=document.createElement("button");
    b.type="button"; b.className="answer-option"; b.textContent=answer;
    b.addEventListener("click",()=>{
      if(answered)return;
      answered=true; chosen=i;
      document.querySelectorAll(".answer-option").forEach((el,j)=>{
        el.disabled=true;
        if(j===q.correct)el.classList.add("selected");
      });
      if(i===q.correct){score++;$("quiz-feedback").textContent="Correct! "+q.explain;}
      else $("quiz-feedback").textContent="Not quite. "+q.explain;
      $("next-question").disabled=false;
    });
    $("answer-options").appendChild(b);
  });
}
$("next-question").addEventListener("click",async()=>{
  if(qIndex<questions.length-1){qIndex++;renderQuestion();return;}
  $("answer-options").innerHTML="";
  $("question-text").textContent="Quiz completed!";
  $("quiz-bottom")?.remove();
  const result=$("quiz-result");
  result.hidden=false;
  result.innerHTML=`<strong>${score} / ${questions.length}</strong><p>${score===5?"Excellent! You know your recycling basics.":score>=3?"Good effort! Keep learning and sorting carefully.":"Keep practising. Every new fact helps you sort waste better."}</p><label style="display:block;text-align:left;font-size:11px;font-weight:700;margin:14px 0 6px">Your name (optional)</label><input id="quiz-name" maxlength="60" placeholder="Enter your name" style="width:100%;padding:11px;border:1px solid #dce7dc;border-radius:7px"><button id="save-quiz" class="btn primary" style="margin-top:12px">Save quiz result</button><span id="quiz-save-message" style="display:block;font-size:11px;margin-top:8px"></span><button id="retry-quiz" class="btn" style="margin-top:8px;background:#edf5ed;color:#286d42">Try again</button>`;
  $("save-quiz").addEventListener("click",async()=>{
    const msg=$("quiz-save-message");msg.textContent="Saving...";
    try{const r=await api("/api/quiz",{method:"POST",body:JSON.stringify({name:$("quiz-name").value||"Guest",score,total:questions.length})});msg.textContent=r.message;await loadDashboard();}
    catch(e){msg.textContent=e.message;}
  });
  $("retry-quiz").addEventListener("click",()=>{qIndex=0;score=0;result.hidden=true;renderQuestion();});
});
loadCategories().then(()=>Promise.all([loadDashboard(),renderQuestion()])).catch(err=>{
  console.error(err);
  $("recent-list").textContent="Could not connect to the application server. Please restart the server and refresh.";
});
