
// Configuração do Firebase (adicione suas credenciais aqui)
import {{ initializeApp }} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import {{ getFirestore, collection, getDocs }} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const firebaseConfig = {{
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_BUCKET",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
}};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function carregarRecados() {{
  const recadosRef = collection(db, "recados");
  const snapshot = await getDocs(recadosRef);
  const container = document.getElementById("recadoList");
  container.innerHTML = "";
  snapshot.forEach((doc) => {{
    const data = doc.data();
    const el = document.createElement("div");
    el.className = "recado";
    el.innerHTML = `<strong>${{data.titulo}}</strong><br>${{data.mensagem}}`;
    container.appendChild(el);
  }});
}}

carregarRecados();
