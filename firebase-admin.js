// Firebase imports (Versão 10.12.4)
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
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js"; // Novo: Para Storage

// Configuração Firebase
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
const storage = getStorage(app); // Novo: Instância de Storage

// Função de login (sem alterações)
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

// Protege admin.html
if (window.location.pathname.includes("admin.html")) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
    } else {
      carregarRecadosAdmin();
    }
  });
}

// Função para publicar recado (Modificado: Adicionado upload de arquivo)
window.publicarRecado = async function () {
  const titulo = document.getElementById("titulo").value;
  const mensagem = document.getElementById("mensagem").value;
  const arquivo = document.getElementById("arquivo").files[0];
  const status = document.getElementById("status");

  if (!titulo || !mensagem) {
    status.textContent = "❌ Preencha título e mensagem.";
    setTimeout(() => { status.textContent = ""; }, 5000);
    return;
  }

  if (!auth.currentUser) {
    status.textContent = "❌ Você precisa estar logado.";
    return;
  }

  try {
    status.textContent = "📤 Publicando...";
    const recadoRef = await addDoc(collection(db, "recados"), {
      titulo,
      mensagem,
      data: Timestamp.now(),
      usuarioId: auth.currentUser.uid,
      arquivoURL: null, // Inicial
      arquivoTipo: null
    });

    let arquivoURL = null;
    let arquivoTipo = null;

    if (arquivo) {
      if (arquivo.size > 5 * 1024 * 1024) { // Máx 5MB
        throw new Error("Arquivo muito grande (máx 5MB).");
      }
      if (!arquivo.type.startsWith('image/') && arquivo.type !== 'application/pdf') {
        throw new Error("Apenas imagens ou PDFs permitidos.");
      }

      const fileRef = storageRef(storage, `recados/${recadoRef.id}/${arquivo.name}`);
      await uploadBytes(fileRef, arquivo);
      arquivoURL = await getDownloadURL(fileRef);
      arquivoTipo = arquivo.type;

      // Atualiza o doc com URL
      await doc(db, "recados", recadoRef.id).update({ arquivoURL, arquivoTipo });
    }

    status.textContent = "✅ Publicado com sucesso!";
    document.getElementById("titulo").value = "";
    document.getElementById("mensagem").value = "";
    document.getElementById("arquivo").value = "";
    setTimeout(() => { status.textContent = ""; }, 5000);
    carregarRecadosAdmin();
  } catch (e) {
    status.textContent = "❌ Erro: " + e.message;
    setTimeout(() => { status.textContent = ""; }, 5000);
  }
};

// Função para carregar recados na admin (Modificado: Suporte a arquivos)
async function carregarRecadosAdmin() {
  const container = document.getElementById("recadoListAdmin");
  if (!container) return;

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

      if (data.arquivoURL) {
        el.appendChild(document.createElement("br"));
        if (data.arquivoTipo.startsWith('image/')) {
          const img = document.createElement("img");
          img.src = data.arquivoURL;
          img.alt = "Anexo";
          img.className = "anexo-img";
          el.appendChild(img);
        } else {
          const link = document.createElement("a");
          link.href = data.arquivoURL;
          link.textContent = "Baixar Arquivo (PDF)";
          link.target = "_blank";
          el.appendChild(link);
        }
      }

      const btn = document.createElement("button");
      btn.textContent = "🗑️ Remover";
      btn.style.marginTop = "0.5rem";
      btn.onclick = () => removerRecado(docSnap.id);
      el.appendChild(document.createElement("br"));
      el.appendChild(btn);
      container.appendChild(el);
    });
  } catch (e) {
    container.innerHTML = "Erro ao carregar: " + e.message;
  }
}

// Função para remover recado (sem alterações)
window.removerRecado = async function (id) {
  const confirmar = confirm("Tem certeza que deseja apagar este recado?");
  if (confirmar) {
    try {
      await deleteDoc(doc(db, "recados", id));
      carregarRecadosAdmin();
      if (window.location.pathname.includes("index.html")) {
        carregarRecadosComAuth();
      }
    } catch (e) {
      alert("Erro ao remover: " + e.message);
    }
  }
};

// Função para carregar recados na index (Modificado: Suporte a arquivos)
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

        if (data.arquivoURL) {
          el.appendChild(document.createElement("br"));
          if (data.arquivoTipo.startsWith('image/')) {
            const img = document.createElement("img");
            img.src = data.arquivoURL;
            img.alt = "Anexo";
            img.className = "anexo-img";
            el.appendChild(img);
          } else {
            const link = document.createElement("a");
            link.href = data.arquivoURL;
            link.textContent = "Baixar Arquivo (PDF)";
            link.target = "_blank";
            el.appendChild(link);
          }
        }

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
    } catch (e) {
      container.innerHTML = "Erro ao carregar: " + e.message;
    }
  });
};

// Função de logout (sem alterações)
window.logout = function () {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  }).catch((error) => {
    alert("Erro ao sair: " + error.message);
  });
};

// Executa carregamento na index
if (window.location.pathname.includes("index.html")) {
  carregarRecadosComAuth();
}