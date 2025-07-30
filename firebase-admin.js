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
  setDoc,
  getDoc
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
      carregarHorarioAdmin();
    }
  });
}

// Função para atualizar o horário
window.atualizarHorario = async function () {
  const arquivo = document.getElementById("horarioArquivo").files[0];
  const externalLink = document.getElementById("horarioLink").value;
  const linkType = document.getElementById("horarioLinkType").value;
  const status = document.getElementById("horarioStatus");

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
    status.textContent = "📤 Atualizando horário...";
    let arquivoURL = null;
    let arquivoTipo = null;

    if (externalLink) {
      const match = externalLink.match(/\/file\/d\/([^\/]+)/);
      if (!match) {
        throw new Error("Link do Google Drive inválido. Use o formato de compartilhamento padrão.");
      }
      const id = match[1];
      if (linkType === "image") {
        arquivoURL = `https://drive.google.com/uc?export=view&id=${id}`;
        arquivoTipo = "image/jpeg";
      } else if (linkType === "pdf") {
        arquivoURL = `https://drive.google.com/file/d/${id}/preview`;
        arquivoTipo = "application/pdf";
      }
    }

    if (arquivo) {
      if (arquivo.size > 5 * 1024 * 1024) {
        throw new Error("Arquivo muito grande (máx 5MB).");
      }
      if (!arquivo.type.startsWith('image/') && arquivo.type !== 'application/pdf') {
        throw new Error("Apenas imagens ou PDFs permitidos.");
      }

      const fileRef = storageRef(storage, `horario/horario.${arquivo.name.split('.').pop()}`);
      await uploadBytes(fileRef, arquivo);
      arquivoURL = await getDownloadURL(fileRef);
      arquivoTipo = arquivo.type;
    }

    await setDoc(doc(db, "horario", "current"), {
      arquivoURL,
      arquivoTipo,
      data: Timestamp.now()
    });

    status.textContent = "✅ Horário atualizado com sucesso!";
    setTimeout(() => { status.textContent = ""; }, 5000);
    carregarHorarioAdmin();
    if (window.location.pathname.includes("index.html")) {
      carregarHorario();
    }
  } catch (e) {
    console.error("Erro ao atualizar horário:", e);
    status.textContent = "❌ Erro: " + e.message;
    setTimeout(() => { status.textContent = ""; }, 5000);
  }
};

// Função para carregar horário no admin
async function carregarHorarioAdmin() {
  const container = document.getElementById("horarioContainer");
  if (!container) return;

  try {
    const horarioDoc = await getDoc(doc(db, "horario", "current"));
    container.innerHTML = "";

    if (!horarioDoc.exists()) {
      container.innerHTML = "Nenhum horário configurado.";
      return;
    }

    const data = horarioDoc.data();
    container.innerHTML = "<strong>Horário Atual:</strong><br>";

    if (data.arquivoURL) {
      if (data.arquivoTipo && data.arquivoTipo.startsWith('image/')) {
        const img = document.createElement("img");
        img.src = data.arquivoURL;
        img.alt = "Horário da Escola";
        img.className = "anexo-img";
        img.onerror = () => { img.src = ''; img.alt = 'Erro ao carregar imagem'; };
        container.appendChild(img);
      } else {
        const iframe = document.createElement("iframe");
        iframe.src = data.arquivoURL;
        iframe.style.width = "100%";
        iframe.style.height = "500px";
        iframe.style.border = "none";
        container.appendChild(iframe);
      }
    }
  } catch (e) {
    console.error("Erro ao carregar horário:", e);
    container.innerHTML = "Erro ao carregar: " + e.message;
  }
}

// Função para carregar horário na index
window.carregarHorario = async function () {
  const container = document.getElementById("horarioContainer");
  if (!container) return;

  container.innerHTML = "Carregando horário...";

  try {
    const horarioDoc = await getDoc(doc(db, "horario", "current"));
    container.innerHTML = "";

    if (!horarioDoc.exists()) {
      container.innerHTML = "Nenhum horário configurado.";
      return;
    }

    const data = horarioDoc.data();
    if (data.arquivoURL) {
      if (data.arquivoTipo && data.arquivoTipo.startsWith('image/')) {
        const img = document.createElement("img");
        img.src = data.arquivoURL;
        img.alt = "Horário da Escola";
        img.className = "anexo-img";
        img.onerror = () => { img.src = ''; img.alt = 'Erro ao carregar imagem'; };
        container.appendChild(img);
      } else {
        const iframe = document.createElement("iframe");
        iframe.src = data.arquivoURL;
        iframe.style.width = "100%";
        iframe.style.height = "500px";
        iframe.style.border = "none";
        container.appendChild(iframe);
      }
    }
  } catch (e) {
    console.error("Erro ao carregar horário:", e);
    container.innerHTML = "Erro ao carregar: " + e.message;
  }
};

// Função para publicar recado (mantida como antes, sem link externo)
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
    status.textContent = "📤 Publicando recado...";
    let arquivoURL = null;
    let arquivoTipo = null;

    const recadoRef = await addDoc(collection(db, "recados"), {
      titulo,
      mensagem,
      data: Timestamp.now(),
      usuarioId: auth.currentUser.uid,
      arquivoURL,
      arquivoTipo
    });

    if (arquivo) {
      status.textContent = "📁 Fazendo upload do arquivo...";
      if (arquivo.size > 5 * 1024 * 1024) {
        throw new Error("Arquivo muito grande (máx 5MB).");
      }
      if (!arquivo.type.startsWith('image/') && arquivo.type !== 'application/pdf') {
        throw new Error("Apenas imagens ou PDFs permitidos.");
      }

      const fileRef = storageRef(storage, `recados/${recadoRef.id}/${arquivo.name}`);
      await uploadBytes(fileRef, arquivo);
      arquivoURL = await getDownloadURL(fileRef);
      arquivoTipo = arquivo.type;

      await updateDoc(doc(db, "recados", recadoRef.id), { arquivoURL, arquivoTipo });
    }

    status.textContent = "✅ Publicado com sucesso!";
    document.getElementById("titulo").value = "";
    document.getElementById("mensagem").value = "";
    document.getElementById("arquivo").value = "";
    setTimeout(() => { status.textContent = ""; }, 5000);
    carregarRecadosAdmin();
  } catch (e) {
    console.error("Erro na publicação:", e);
    status.textContent = "❌ Erro: " + e.message;
    setTimeout(() => { status.textContent = ""; }, 5000);
  }
};

// Função para carregar recados na admin
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
        if (data.arquivoTipo && data.arquivoTipo.startsWith('image/')) {
          const img = document.createElement("img");
          img.src = data.arquivoURL;
          img.alt = "Anexo";
          img.className = "anexo-img";
          img.onerror = () => { img.src = ''; img.alt = 'Erro ao carregar imagem'; };
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
    console.error("Erro ao carregar recados:", e);
    container.innerHTML = "Erro ao carregar: " + e.message;
  }
}

// Função para carregar recados na index
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
          if (data.arquivoTipo && data.arquivoTipo.startsWith('image/')) {
            const img = document.createElement("img");
            img.src = data.arquivoURL;
            img.alt = "Anexo";
            img.className = "anexo-img";
            img.onerror = () => { img.src = ''; img.alt = 'Erro ao carregar imagem'; };
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
      console.error("Erro ao carregar recados:", e);
      container.innerHTML = "Erro ao carregar: " + e.message;
    }
  });
};

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

// Função de logout
window.logout = function () {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  }).catch((error) => {
    alert("Erro ao sair: " + error.message);
  });
};

// Executa carregamento automático
if (window.location.pathname.includes("index.html")) {
  carregarRecadosComAuth();
  carregarHorario();
}
if (window.location.pathname.includes("admin.html")) {
  carregarHorarioAdmin();
}
</DOCUMENT>