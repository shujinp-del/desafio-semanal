import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBrfxwL7BCUQSInVnP7Mx4jnmhNFazABfE",
  authDomain: "desafio-semanal.firebaseapp.com",
  projectId: "desafio-semanal",
  storageBucket: "desafio-semanal.firebasestorage.app",
  messagingSenderId: "948247090731",
  appId: "1:948247090731:web:fb36df17768ce636f07c6e"
};

const app =
  getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

const db = getFirestore(app);

const auth = getAuth(app);

let usuarioAtual = null;

let dadosUsuario = null;

let ranking = [];

let corridasFirebase = [];

let grafico;

let graficoLinha;

let editandoId = null;

let pararSincronia = null;

// ================================
// LOGIN
// ================================

function mostrarStatusLogin(texto) {

  let card =
    document.querySelector("#loginTela .card");

  if (!card) return;

  let status =
    document.getElementById("statusLogin");

  if (!status) {

    status = document.createElement("p");

    status.id = "statusLogin";

    status.className = "subtitulo";

    card.appendChild(status);
  }

  status.innerText = texto;
}

async function cadastrar() {

  let email =
    document.getElementById("emailLogin")
      .value
      .trim();

  let senha =
    document.getElementById("senhaLogin")
      .value;

  if (!email || !senha) {

    alert("Digite email e senha");

    return;
  }

  try {

    let credencial =
      await createUserWithEmailAndPassword(
        auth,
        email,
        senha
      );

    await setDoc(
      doc(db, "usuarios", credencial.user.uid),
      {
        email,
        status: "pendente",
        papel: "motorista",
        metaSemanal: 0,
        criadoEm: serverTimestamp()
      }
    );

    alert(
      "Conta criada! Aguarde aprovação."
    );

  } catch (erro) {

    alert(erro.message);
  }
}

function entrar() {

  let email =
    document.getElementById("emailLogin")
      .value
      .trim();

  let senha =
    document.getElementById("senhaLogin")
      .value;

  signInWithEmailAndPassword(
    auth,
    email,
    senha
  )
    .catch(erro => alert(erro.message));
}

function sair() {

  signOut(auth);
}

onAuthStateChanged(
  auth,
  async usuario => {

    usuarioAtual = usuario;

    let menu =
      document.getElementById("menuApp");

    let botaoAdmin =
      document.getElementById("botaoAdmin");

    let usuarioLogado =
      document.getElementById("usuarioLogado");

    if (pararSincronia) {

      pararSincronia();

      pararSincronia = null;
    }

    if (!usuario) {

      if (menu) {
        menu.style.display = "none";
      }

      if (botaoAdmin) {
        botaoAdmin.style.display = "none";
      }

      abrirTela("loginTela");

      return;
    }

    let usuarioRef =
      doc(db, "usuarios", usuario.uid);

    let usuarioSnap =
      await getDoc(usuarioRef);

    if (!usuarioSnap.exists()) {

      await setDoc(usuarioRef, {
        email: usuario.email,
        status: "pendente",
        papel: "motorista",
        metaSemanal: 0,
        criadoEm: serverTimestamp()
      });

      dadosUsuario = {
        email: usuario.email,
        status: "pendente",
        papel: "motorista",
        metaSemanal: 0
      };

    } else {

      dadosUsuario = usuarioSnap.data();
    }

    if (
      dadosUsuario.status !== "ativo" &&
      dadosUsuario.status !== "admin"
    ) {

      if (menu) {
        menu.style.display = "none";
      }

      if (botaoAdmin) {
        botaoAdmin.style.display = "none";
      }

      mostrarStatusLogin(
        "⏳ Sua conta está aguardando aprovação."
      );

      abrirTela("loginTela");

      return;
    }

    if (menu) {
      menu.style.display = "flex";
    }

    if (botaoAdmin) {

      botaoAdmin.style.display =
        dadosUsuario.papel === "admin"
          ? "block"
          : "none";
    }

    if (usuarioLogado) {

      usuarioLogado.innerText =
        `Logado como: ${usuario.email}`;
    }

    mostrarStatusLogin("");

    abrirTela("home");

    iniciarSincronia();
  }
);

// ================================
// FIREBASE
// ================================

function iniciarSincronia() {

  pararSincronia = onSnapshot(
    collection(db, "corridas"),
    snapshot => {

      let todasCorridas = [];

      let corridasSemana = [];

      snapshot.forEach(docSnap => {

        let item = docSnap.data();

        let corrida = {
          id: docSnap.id,
          ...item
        };

        if (
          corrida.nome &&
          corrida.valor &&
          corrida.data
        ) {

          todasCorridas.push(corrida);

          if (
            estaNaSemanaAtual(corrida.data)
          ) {

            corridasSemana.push(corrida);
          }
        }
      });

      corridasFirebase = todasCorridas;

      ranking =
        montarRanking(corridasSemana);

      atualizarTudo();
    }
  );
}

function montarRanking(corridas) {

  let mapa = {};

  corridas.forEach(item => {

    let chave =
      item.nome.toLowerCase();

    if (!mapa[chave]) {

      mapa[chave] = {
        nome: item.nome,
        valor: 0,
        corridas: 0,
        historico: []
      };
    }

    mapa[chave].valor +=
      Number(item.valor);

    mapa[chave].corridas +=
      Number(item.corridas || 0);

    mapa[chave].historico.push({
      id: item.id,
      data: item.data,
      valor: Number(item.valor)
    });
  });

  let lista =
    Object.values(mapa);

  lista.sort(
    (a, b) => b.valor - a.valor
  );

  return lista;
}
// ================================
// CORRIDAS
// ================================

async function adicionar() {

  if (!usuarioAtual) {
    alert("Faça login");
    return;
  }

  let nome =
    document.getElementById("nome").value.trim();

  let valor =
    Number(
      document.getElementById("valor").value
    );

  let corridas =
    Number(
      document.getElementById("corridas").value
    );

  let data =
    document.getElementById("data").value;

  if (!nome || valor <= 0 || !data) {

    alert("Preencha os campos");

    return;
  }

  try {

    if (editandoId) {

      await updateDoc(
        doc(db, "corridas", editandoId),
        {
          nome,
          valor,
          corridas,
          data,
          uid: usuarioAtual.uid,
          email: usuarioAtual.email
        }
      );

      alert("✏️ Corrida editada");

      editandoId = null;

    } else {

      await addDoc(
        collection(db, "corridas"),
        {
          nome,
          valor,
          corridas,
          data,
          uid: usuarioAtual.uid,
          email: usuarioAtual.email,
          criadoEm: new Date().toISOString()
        }
      );
    }

    limparCampos();

  } catch (erro) {

    console.error(erro);

    alert("Erro ao salvar");
  }
}

function editarCorrida(id) {

  let corrida =
    corridasFirebase.find(
      item => item.id === id
    );

  if (!corrida) return;

  document.getElementById("nome").value =
    corrida.nome;

  document.getElementById("valor").value =
    corrida.valor;

  document.getElementById("corridas").value =
    corrida.corridas;

  document.getElementById("data").value =
    corrida.data;

  editandoId = id;

  abrirTela("home");
}

async function excluirCorrida(id) {

  if (
    !confirm(
      "Deseja excluir esta corrida?"
    )
  ) {
    return;
  }

  try {

    await deleteDoc(
      doc(db, "corridas", id)
    );

  } catch (erro) {

    console.error(erro);

    alert("Erro ao excluir");
  }
}

// ================================
// METAS
// ================================

async function salvarMeta() {

  if (!usuarioAtual) return;

  let meta =
    Number(
      document.getElementById("metaSemanal")
        .value
    );

  if (!meta || meta <= 0) {

    alert("Digite uma meta válida");

    return;
  }

  try {

    await updateDoc(
      doc(db, "usuarios", usuarioAtual.uid),
      {
        metaSemanal: meta
      }
    );

    dadosUsuario.metaSemanal = meta;

    atualizarMetas();

    alert("🎯 Meta salva!");

  } catch (erro) {

    console.error(erro);

    alert("Erro ao salvar meta");
  }
}

function atualizarMetas() {

  if (!usuarioAtual) return;

  let atualEl =
    document.getElementById("valorMetaAtual");

  let totalEl =
    document.getElementById("valorMetaTotal");

  let progressoEl =
    document.getElementById("progressoMeta");

  let inputMeta =
    document.getElementById("metaSemanal");

  if (
    !atualEl ||
    !totalEl ||
    !progressoEl
  ) {
    return;
  }

  let minhas =
    corridasFirebase.filter(
      item =>
        item.uid === usuarioAtual.uid &&
        estaNaSemanaAtual(item.data)
    );

  let totalAtual =
    minhas.reduce(
      (soma, item) =>
        soma + Number(item.valor),
      0
    );

  let meta =
    Number(
      dadosUsuario.metaSemanal || 0
    );

  if (inputMeta && meta > 0) {
    inputMeta.value = meta;
  }

  atualEl.innerText =
    `R$ ${totalAtual}`;

  totalEl.innerText =
    `R$ ${meta}`;

  let progresso = 0;

  if (meta > 0) {

    progresso =
      Math.min(
        100,
        Math.round(
          (totalAtual / meta) * 100
        )
      );
  }

  progressoEl.innerText =
    `${progresso}%`;
}

// ================================
// ADMIN
// ================================

async function atualizarAdmin() {

  let lista =
    document.getElementById(
      "listaAdminUsuarios"
    );

  if (!lista) return;

  if (
    !dadosUsuario ||
    dadosUsuario.papel !== "admin"
  ) {

    lista.innerHTML =
      "<li>Acesso restrito.</li>";

    return;
  }

  lista.innerHTML = "";

  let usuariosSnap =
    await getDocs(
      collection(db, "usuarios")
    );

  usuariosSnap.forEach(docSnap => {

    let usuario = docSnap.data();

    let id = docSnap.id;

    lista.innerHTML += `
      <li>

        <div class="posicao">
          👤 ${usuario.email}
        </div>

        <br>

        <div>
          Status:
          <strong>
            ${usuario.status}
          </strong>
        </div>

        <div>
          Papel:
          <strong>
            ${usuario.papel}
          </strong>
        </div>

        <br>

        <button
          onclick="aprovarUsuario('${id}')"
        >
          ✅ Aprovar
        </button>

        <button
          onclick="bloquearUsuario('${id}')"
        >
          🚫 Bloquear
        </button>

      </li>
    `;
  });
}

async function aprovarUsuario(id) {

  await updateDoc(
    doc(db, "usuarios", id),
    {
      status: "ativo"
    }
  );

  atualizarAdmin();
}

async function bloquearUsuario(id) {

  await updateDoc(
    doc(db, "usuarios", id),
    {
      status: "bloqueado"
    }
  );

  atualizarAdmin();
}

// ================================
// TELA
// ================================

function abrirTela(id) {

  document
    .querySelectorAll(".tela")
    .forEach(tela => {
      tela.classList.remove("ativa");
    });

  let tela =
    document.getElementById(id);

  if (tela) {
    tela.classList.add("ativa");
  }

  if (id === "metasTela") {
    atualizarMetas();
  }

  if (id === "adminTela") {
    atualizarAdmin();
  }

  if (id === "graficoTela") {
    atualizarGrafico();
    atualizarGraficoLinha();
  }
}

function atualizarTudo() {

  atualizarRanking();

  atualizarLider();

  atualizarMetricas();

  atualizarGrafico();

  atualizarGraficoLinha();

  atualizarHistoricoMensal();

  atualizarMinhasCorridas();

  atualizarMetas();
}

// ================================
// FINAL
// ================================

window.entrar = entrar;
window.cadastrar = cadastrar;
window.sair = sair;
window.adicionar = adicionar;
window.editarCorrida = editarCorrida;
window.excluirCorrida = excluirCorrida;
window.abrirTela = abrirTela;
window.salvarMeta = salvarMeta;
window.aprovarUsuario = aprovarUsuario;
window.bloquearUsuario = bloquearUsuario;
window.salvarMeta = salvarMeta;