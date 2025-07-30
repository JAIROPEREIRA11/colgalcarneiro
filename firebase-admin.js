<DOCUMENT filename="firebase-admin.js">
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
  Timestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

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
const storage = getStorage(app);

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
      carregarRecadosAdmin();
    }
  });
}

// Função para publicar recado
window.publicarRecado = async function () {
  const titulo = document.getElementById("titulo").value;
  const mensagem = document.getElementById("mensagem").value;
  const arquivo = document.getElementById("arquivo").files[0];
  const externalLink = document.getElementById("externalLink").value;
  const linkType = document.getElementById("linkType").value;
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

  if (arquivo && externalLink) {
    status.textContent = "❌ Use apenas um: arquivo local ou link externo.";
    setTimeout(() => { status.textContent = ""; }, 5000);
    return;
  }

  if (externalLink && !linkType) {
    status.textContent = "❌ Selecione o tipo do link externo.";
    setTimeout(() => { status.textContent = ""; }, 5000);
    return;
  }

  try {
    status.textContent = "📤 Publicando recado...";
    console.log("Iniciando publicação...");

    let arquivoURL = null;
    let arquivoTipo = null;

    if (externalLink) {
      // Extrai o ID do link do Google Drive
      const match = externalLink.match(/\/file\/d\/([^\/]+)/);
      if (!match) {
        throw new Error("Link do Google Drive inválido. Use o formato de compartilhamento padrão.");
      }
      const id = match[1];

      if (linkType === "image") {
        arquivoURL = `https://drive.google.com/uc?export=view&id=${id}`;
        arquivoTipo = "image/jpeg"; // Pode ser qualquer 'image/' para a lógica de exibição
      } else if (linkType === "pdf") {
        arquivoURL = `https://drive.google.com/uc?export=download&id=${id}`;
        arquivoTipo = "application/pdf";
      }
    }

    const recadoRef = await addDoc(collection(db, "recados"), {
      titulo,
      mensagem,
      data: Timestamp.now(),
      usuarioId: auth.currentUser.uid,
      arquivoURL,
      arquivoTipo
    });
    console.log("Recado criado com ID:", recadoRef.id);

    if (arquivo) {
      status.textContent = "📁 Fazendo upload do arquivo...";
      console.log("Arquivo selecionado:", arquivo.name, arquivo.type);

      if (arquivo.size > 5 * 1024 * 1024) {
        throw new Error("Arquivo muito grande (máx 5MB).");
      }
      if (!arquivo.type.startsWith('image/') && arquivo.type !== 'application/pdf') {
        throw new Error("Apenas imagens ou PDFs permitidos.");
      }

      const fileRef = storageRef(storage, `recados/${recadoRef.id}/${arquivo.name}`);
      await uploadBytes(fileRef, arquivo);
      console.log("Upload concluído no Storage.");

      arquivoURL = await getDownloadURL(fileRef);
      arquivoTipo = arquivo.type;
      console.log("URL gerada:", arquivoURL);

      try {
        await updateDoc(doc(db, "recados", recadoRef.id), { arquivoURL, arquivoTipo });
        console.log("Documento atualizado com URL.");
      } catch (updateError) {
        console.error("Erro no update do Firestore:", updateError);
        throw new Error("Falha ao salvar URL no banco: " + updateError.message);
      }
    }

    status.textContent = "✅ Publicado com sucesso! Recarregue se necessário.";
    document.getElementById("titulo").value = "";
    document.getElementById("mensagem").value = "";
    document.getElementById("arquivo").value = "";
    document.getElementById("externalLink").value = "";
    document.getElementById("linkType").value = "";
    setTimeout(() => { status.textContent = ""; }, 5000);
    carregarRecadosAdmin();
  } catch (e) {
    console.error("Erro geral na publicação:", e);
    status.textContent = "❌ Erro: " + e.message + " (Verifique o console para detalhes)";
    setTimeout(() => { status.textContent = ""; }, 5000);
  }
};

// Função para carregar recados na admin
async function carregarRecadosAdmin() {
  const container = document.getElementById("recadoListAdmin");
  if (!container) return;

  container.innerHTML = "Carregando recados...";
  console.log("Carregando recados na admin...");

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
      console.log("Recado carregado:", data.titulo, "Arquivo URL:", data.arquivoURL);

      const el = document.createElement("div");
      el.className = "recado";
      el.innerHTML = `
        <strong>${data.titulo}</strong><br>${data.mensagem}
      `;

      if (data.arquivoURL) {
        el.appendChild(document.createElement("br"));
        if (data.arquivoTipo && data.arquivoTipo.startsWith('image/')) {
          const img = document.createElement("img");
          img.src = data.arquivoURL;
          img.alt = "Anexo";
          img.className = "anexo-img";
          img.onerror = () => { img.src = ''; img.alt = 'Erro ao carregar imagem (verifique permissões)'; };
          el.appendChild(img);
        } else {
          const link = document.createElement("a");
          link.href = data.arquivoURL;
          link.textContent = "Baixar Arquivo (PDF)";
          link.target = "_blank";
          link.onerror = () => { link.textContent = 'Erro ao carregar arquivo'; };
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
    console.error("Erro ao carregar recados:", e);
    container.innerHTML = "Erro ao carregar: " + e.message;
  }
}

// Função para remover um recado
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

// Função para carregar recados na index
window.carregarRecadosComAuth = async function () {
  const container = document.getElementById("recadoList");
  if (!container) return;

  container.innerHTML = "Carregando recados...";
  console.log("Carregando recados na index...");

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
        console.log("Recado carregado:", data.titulo, "Arquivo URL:", data.arquivoURL);

        const el = document.createElement("div");
        el.className = "recado";
        el.innerHTML = `
          <strong>${data.titulo}</strong><br>${data.mensagem}
        `;

        if (data.arquivoURL) {
          el.appendChild(document.createElement("br"));
          if (data.arquivoTipo && data.arquivoTipo.startsWith('image/')) {
            const img = document.createElement("img");
            img.src = data.arquivoURL;
            img.alt = "Anexo";
            img.className = "anexo-img";
            img.onerror = () => { img.src = ''; img.alt = 'Erro ao carregar imagem (verifique permissões)'; };
            el.appendChild(img);
          } else {
            const link = document.createElement("a");
            link.href = data.arquivoURL;
            link.textContent = "Baixar Arquivo (PDF)";
            link.target = "_blank";
            link.onerror = () => { link.textContent = 'Erro ao carregar arquivo'; };
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
      console.error("Erro ao carregar recados:", e);
      container.innerHTML = "Erro ao carregar: " + e.message;
    }
  });
};

// Função de logout
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
</DOCUMENT>