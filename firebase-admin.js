// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js"; // Adicionado para Storage

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
const auth = getAuth();
const db = getFirestore(app);
const storage = getStorage(app); // Adicionado

// Função de login
window.login = async function () {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const erroEl = document.getElementById("erro");

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    // Garantir que o redirecionamento ocorre após o login completo
    window.location.href = "admin.html";
  } catch (error) {
    erroEl.textContent = "Erro no login: " + error.message;
  }
};

// Protege admin.html (redireciona se não estiver logado)
if (window.location.pathname.includes("admin.html")) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // Se não estiver logado, redireciona para a página de login
      window.location.href = "login.html";
    }
  });
}

// Função para publicar recado
window.publicarRecado = async function () {
  const titulo = document.getElementById("titulo").value;
  const mensagem = document.getElementById("mensagem").value;
  const anexo = document.getElementById("anexo").files[0]; // Adicionado
  const status = document.getElementById("status");

  if (!titulo || !mensagem) {
    status.textContent = "❌ Preencha todos os campos para publicar o recado.";
    return;
  }

  try {
    let anexoUrl = null;
    let anexoNome = null;
    let anexoPath = null;

    // Upload do anexo se existir
    if (anexo) {
      anexoPath = `anexos/${Date.now()}_${anexo.name}`; // Path único
      const storageRef = ref(storage, anexoPath);
      await uploadBytes(storageRef, anexo);
      anexoUrl = await getDownloadURL(storageRef);
      anexoNome = anexo.name;
    }

    await addDoc(collection(db, "recados"), {
      titulo,
      mensagem,
      data: new Date(),
      usuarioId: auth.currentUser.uid,
      anexoUrl, // Adicionado
      anexoNome, // Adicionado
      anexoPath // Adicionado para deleção futura
    });
    status.textContent = "✅ Recado publicado com sucesso!";
    document.getElementById("titulo").value = "";
    document.getElementById("mensagem").value = "";
    document.getElementById("anexo").value = ""; // Limpa o input de file
  } catch (e) {
    status.textContent = "❌ Erro ao publicar: " + e.message;
  }
};