// Importa os módulos do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";

// Configurações do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCuqY257lxJixrEv4teEgzrjjK8RS9esjk",
  authDomain: "colegio-general-carneiro.firebaseapp.com",
  projectId: "colegio-general-carneiro",
  storageBucket: "colegio-general-carneiro.firebasestorage.app",
  messagingSenderId: "290028500174",
  appId: "1:290028500174:web:aa96bf74f6a08aa9d9cc9f",
  measurementId: "G-6WJ2YNTVPP"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Função principal
function carregarRecadosComAuth() {
  const container = document.getElementById("recadoList");
  const loadingMessage = "Carregando recados..."; // Mensagem de carregamento

  // Exibe a mensagem de carregamento
  container.innerHTML = loadingMessage;

  // Verifica autenticação
  onAuthStateChanged(auth, async (user) => {
    // Limpa o conteúdo da lista de recados
    container.innerHTML = "";

    if (!user) {
      // Caso não esteja logado, exibe mensagem
      container.innerHTML = "Você precisa estar logado para visualizar os recados.";
      console.log("Usuário não autenticado – modo leitura.");
      return;
    }

    // Se estiver logado, carrega os recados
    const recadosRef = collection(db, "recados");
    const snapshot = await getDocs(recadosRef);

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const el = document.createElement("div");
      el.className = "recado";
      el.innerHTML = `
        <strong>${data.titulo}</strong><br>${data.mensagem}
      `;

      // Se o usuário estiver logado, mostra botão de remover
      if (user) {
        const btn = document.createElement("button");
        btn.textContent = "🗑️ Remover";
        btn.style.marginTop = "0.5rem";
        btn.onclick = () => removerRecado(docSnap.id);
        el.appendChild(document.createElement("br"));
        el.appendChild(btn);
      }

      container.appendChild(el);
    });
  });
}

// Função para remover um recado
window.removerRecado = async function (id) {
  const confirmar = confirm("Tem certeza que deseja apagar este recado?");
  if (confirmar) {
    await deleteDoc(doc(db, "recados", id));
    carregarRecadosComAuth(); // Atualiza a lista de recados
  }
};

// Executa ao carregar
carregarRecadosComAuth();
