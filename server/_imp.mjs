const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc4NjI2MzUxOSwiZXhwIjoxNzg2MjY3MTE5fQ.Zcng-aETVw2RS2_JyzgISfdNgpFTn_vRc5LvkYvMEqQ";
const QUIZ_ID = 8;
const BASE = "http://localhost:5000/api/quiz";

(async () => {
  const payload = {
    questions: [
      {
        type: "multiple_select",
        question_text: "TEST multi-select prime numbers",
        options: ["2", "3", "4", "5"],
        correct_answer: ["2", "3", "5"],
        points: 3,
      },
    ],
  };
  const res = await fetch(`${BASE}/${QUIZ_ID}/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  console.log("IMPORT STATUS:", res.status, "success:", data.success, "imported:", data?.data?.imported);

  // Read back
  const getRes = await fetch(`${BASE}/${QUIZ_ID}/questions`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const getBody = await getRes.json();
  const imported = (getBody.data || []).filter((q) => q.question_text === "TEST multi-select prime numbers");
  const last = imported[imported.length - 1];
  console.log("STORED correct_answer:", JSON.stringify(last?.correct_answer));
  console.log("STORED options:", JSON.stringify(last?.options));
  console.log("STORED type:", last?.type);
})().catch((e) => { console.error(e.message); process.exit(1); });
