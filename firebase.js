// Importa os módulos necessários do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

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

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Função para buscar recados e exibir no site
async function carregarRecados() {
  const recadosRef = collection(db, "recados");
  const snapshot = await getDocs(recadosRef);
  const container = document.getElementById("recadoList");
  container.innerHTML = "";
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    const el = document.createElement("div");
    el.className = "recado";
    el.innerHTML = `<strong>${data.titulo}</strong><br>${data.mensagem}`;
    container.appendChild(el);
  });
}

// Chama a função assim que o script carregar
carregarRecados();