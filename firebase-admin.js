// Firebase imports (Atualizado para versão 10.12.4 para maior estabilidade)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Sua configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCuqY257lxJixrEv4teEgzrjjK8RS9esjk",
  authDomain: "colegio-general-carneiro.firebaseapp.com",
  projectId: "colegio-general-carneiro",
  storageBucket: "colegio-general-carneiro.firebasestorage.app",
  messagingSenderId: "290028500174",
  appId: "1:290028500174:web:aa96bf74f6a08aa9d9cc9f",
  measurementId: "G-6WJ2YNTVPP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Função de login
window.login = async function () {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const erroEl = document.getElementById("erro");

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    window.location.href = "admin.html";
  } catch (error) {
    erroEl.textContent = "Erro no login: " + error.message;
  }
};

// Protege admin.html (redireciona se não estiver logado)
if (window.location.pathname.includes("admin.html")) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
    } else {
      // Carrega recados na admin se logado
      carregarRecadosAdmin();
    }
  });
}

// Função para publicar recado (Consertado: Adicionada checagem de auth e Timestamp)
window.publicarRecado = async function () {
  const titulo = document.getElementById("titulo").value;
  const mensagem = document.getElementById("mensagem").value;
  const status = document.getElementById("status");

  if (!titulo || !mensagem) {
    status.textContent = "❌ Preencha todos os campos para publicar o recado.";
    setTimeout(() => { status.textContent = ""; }, 5000);
    return;
  }

  if (!auth.currentUser) {
    status.textContent = "❌ Você precisa estar logado para publicar.";
    return;
  }

  try {
    await addDoc(collection(db, "recados"), {
      titulo,
      mensagem,
      data: Timestamp.now(), // Usa Timestamp para datas precisas
      usuarioId: auth.currentUser.uid
    });
    status.textContent = "✅ Recado publicado com sucesso!";
    document.getElementById("titulo").value = "";
    document.getElementById("mensagem").value = "";
    setTimeout(() => { status.textContent = ""; }, 5000);
    carregarRecadosAdmin(); // Atualiza a lista na admin
  } catch (e) {
    status.textContent = "❌ Erro ao publicar: " + e.message;
    setTimeout(() => { status.textContent = ""; }, 5000);
  }
};

// Função para carregar recados na admin (Nova: Lista com opção de remoção)
async function carregarRecadosAdmin() {
  const container = document.getElementById("recadoListAdmin");
  if (!container) return; // Evita erro se não existir

  container.innerHTML = "Carregando recados...";

  try {
    const recadosRef = collection(db, "recados");
    const snapshot = await getDocs(recadosRef);
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = "Nenhum recado encontrado.";
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const el = document.createElement("div");
      el.className = "recado";
      el.innerHTML = `
        <strong>${data.titulo}</strong><br>${data.mensagem}
      `;
      const btn = document.createElement("button");
      btn.textContent = "🗑️ Remover";
      btn.style.marginTop = "0.5rem";
      btn.onclick = () => removerRecado(docSnap.id);
      el.appendChild(document.createElement("br"));
      el.appendChild(btn);
      container.appendChild(el);
    });
  } catch (e) {
    container.innerHTML = "Erro ao carregar recados: " + e.message;
  }
}

// Função para remover um recado (Unificada e otimizada)
window.removerRecado = async function (id) {
  const confirmar = confirm("Tem certeza que deseja apagar este recado?");
  if (confirmar) {
    try {
      await deleteDoc(doc(db, "recados", id));
      carregarRecadosAdmin(); // Atualiza na admin
      if (window.location.pathname.includes("index.html")) {
        carregarRecadosComAuth(); // Atualiza na index se aplicável
      }
    } catch (e) {
      alert("Erro ao remover: " + e.message);
    }
  }
};

// Função para carregar recados na index (Mantida e otimizada)
window.carregarRecadosComAuth = async function () {
  const container = document.getElementById("recadoList");
  if (!container) return;

  container.innerHTML = "Carregando recados...";

  onAuthStateChanged(auth, async (user) => {
    container.innerHTML = "";

    try {
      const recadosRef = collection(db, "recados");
      const snapshot = await getDocs(recadosRef);

      if (snapshot.empty) {
        container.innerHTML = "Nenhum recado encontrado.";
        return;
      }

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const el = document.createElement("div");
        el.className = "recado";
        el.innerHTML = `
          <strong>${data.titulo}</strong><br>${data.mensagem}
        `;

        if (user) { // Mostra remoção se logado
          const btn = document.createElement("button");
          btn.textContent = "🗑️ Remover";
          btn.style.marginTop = "0.5rem";
          btn.onclick = () => removerRecado(docSnap.id);
          el.appendChild(document.createElement("br"));
          el.appendChild(btn);
        }

        container.appendChild(el);
      });
    } catch (e) {
      container.innerHTML = "Erro ao carregar recados: " + e.message;
    }
  });
};

// Função de logout (Nova: Para sair da admin)
window.logout = function () {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  }).catch((error) => {
    alert("Erro ao sair: " + error.message);
  });
};

// Executa carregamento automático na index
if (window.location.pathname.includes("index.html")) {
  carregarRecadosComAuth();
}