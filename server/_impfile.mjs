const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc4NjI2MzUxOSwiZXhwIjoxNzg2MjY3MTE5fQ.Zcng-aETVw2RS2_JyzgISfdNgpFTn_vRc5LvkYvMEqQ";
const QUIZ_ID = 8;
const BASE = "http://localhost:5000/api/quiz";

const csv = `question_text,type,options,correct_answer,points
"TEST file multi-select","multiple_select","2|3|4|5","2|3|5",3`;

(async () => {
  const res = await fetch(`${BASE}/${QUIZ_ID}/import-file`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ format: "csv", content: csv }),
  });
  const data = await res.json();
  console.log("FILE IMPORT success:", data.success, "imported:", data?.data?.imported, "errors:", JSON.stringify(data?.data?.errors || data?.errors || []));

  const getRes = await fetch(`${BASE}/${QUIZ_ID}/questions`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const getBody = await getRes.json();
  const imported = (getBody.data || []).filter((q) => q.question_text === "TEST file multi-select");
  const last = imported[imported.length - 1];
  console.log("STORED correct_answer:", JSON.stringify(last?.correct_answer));
})().catch((e) => { console.error(e.message); process.exit(1); });
