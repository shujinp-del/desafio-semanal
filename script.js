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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

let usuarioAtual = null;
let dadosUsuario = null;

let ranking = [];
let corridasFirebase = [];
let rankingMetas = [];

let grafico;
let graficoLinha;

let editandoId = null;
let pararSincronia = null;

function usuarioEhAdmin() {
  return (
    dadosUsuario &&
    (
      dadosUsuario.papel === "admin" ||
      dadosUsuario.status === "admin"
    )
  );
}

function aplicarPrivacidadeMenus() {
  let botaoGeral = document.getElementById("botaoGeral");
  let botaoAdmin = document.getElementById("botaoAdmin");

  if (botaoGeral) {
    botaoGeral.style.display =
      usuarioEhAdmin() ? "block" : "none";
  }

  if (botaoAdmin) {
    botaoAdmin.style.display =
      usuarioEhAdmin() ? "block" : "none";
  }
}

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
    .value.trim();

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

    alert("Conta criada! Aguarde aprovação.");

  } catch (erro) {

    alert(erro.message);
  }
}

function entrar() {

  let email =
    document.getElementById("emailLogin")
    .value.trim();

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

onAuthStateChanged(auth, async usuario => {

  usuarioAtual = usuario;

  let menu =
    document.getElementById("menuApp");

  let usuarioLogado =
    document.getElementById("usuarioLogado");

  if (pararSincronia) {

    pararSincronia();

    pararSincronia = null;
  }

  if (!usuario) {

    if (menu) menu.style.display = "none";

    aplicarPrivacidadeMenus();

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

    if (menu) menu.style.display = "none";

    aplicarPrivacidadeMenus();

    mostrarStatusLogin(
      "⏳ Sua conta está aguardando aprovação."
    );

    abrirTela("loginTela");

    return;
  }

  if (menu) menu.style.display = "flex";

  aplicarPrivacidadeMenus();

  if (usuarioLogado) {

    usuarioLogado.innerText =
      `Logado como: ${usuario.email}`;
  }

  mostrarStatusLogin("");

  abrirTela("home");

  iniciarSincronia();
});

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

      atualizarRankingMetas();

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
      valor: Number(item.valor),
      corridas: Number(item.corridas || 0)
    });
  });

  let lista = Object.values(mapa);

  lista.sort((a, b) => b.valor - a.valor);

  return lista;
}

async function atualizarRankingMetas() {

  let lista =
    document.getElementById("rankingMetas");

  if (!lista) return;

  lista.innerHTML = "";

  let usuariosSnap =
    await getDocs(collection(db, "usuarios"));

  let rankingTemp = [];

  usuariosSnap.forEach(docSnap => {

    let usuario = docSnap.data();

    if (
      !usuario.metaSemanal ||
      usuario.metaSemanal <= 0
    ) {
      return;
    }

    let minhas =
      corridasFirebase.filter(
        item =>
          item.email === usuario.email &&
          estaNaSemanaAtual(item.data)
      );

    let total = minhas.reduce(
      (soma, item) =>
        soma + Number(item.valor),
      0
    );

    let progresso = Math.round(
      (total / usuario.metaSemanal) * 100
    );

    rankingTemp.push({
      email: usuario.email,
      progresso,
      total,
      meta: usuario.metaSemanal
    });
  });

  rankingTemp.sort(
    (a, b) => b.progresso - a.progresso
  );

  rankingMetas = rankingTemp;

  rankingTemp.forEach((item, index) => {

    let medalha = `${index + 1}º`;

    if (index === 0) medalha = "🥇";
    if (index === 1) medalha = "🥈";
    if (index === 2) medalha = "🥉";

    lista.innerHTML += `
      <li>

        <div class="posicao">
          ${medalha} ${item.email}
        </div>

        <br>

        <div class="valor">
          🎯 ${item.progresso}%
        </div>

        <div>
          💰 R$ ${item.total}
          de R$ ${item.meta}
        </div>

      </li>
    `;
  });
}
async function adicionar() {

  if (!usuarioAtual) {
    alert("Faça login primeiro");
    return;
  }

  if (
    !dadosUsuario ||
    (
      dadosUsuario.status !== "ativo" &&
      dadosUsuario.status !== "admin"
    )
  ) {
    alert("Sua conta ainda não foi aprovada");
    return;
  }

  let nome = document.getElementById("nome").value.trim();
  let valor = Number(document.getElementById("valor").value);
  let corridas = Number(document.getElementById("corridas").value);
  let data = document.getElementById("data").value;

  if (!nome || valor <= 0 || !data) {
    alert("Preencha nome, valor e data");
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

      alert("✏️ Corrida editada!");

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
    corridasFirebase.find(item => item.id === id);

  if (!corrida) return;

  document.getElementById("nome").value = corrida.nome;
  document.getElementById("valor").value = corrida.valor;
  document.getElementById("corridas").value = corrida.corridas;
  document.getElementById("data").value = corrida.data;

  editandoId = id;

  abrirTela("home");
}

async function excluirCorrida(id) {

  if (!confirm("Deseja excluir esta corrida?")) return;

  try {

    await deleteDoc(doc(db, "corridas", id));

  } catch (erro) {

    console.error(erro);

    alert("Erro ao excluir");
  }
}

async function salvarMeta() {

  if (!usuarioAtual) return;

  let meta =
    Number(document.getElementById("metaSemanal").value);

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
    atualizarRankingMetas();
    atualizarMelhorDia();
    atualizarPiorDia();

    alert("🎯 Meta salva!");

  } catch (erro) {

    console.error(erro);

    alert("Erro ao salvar meta");
  }
}

function atualizarMetas() {

  if (!usuarioAtual) return;

  let atualEl = document.getElementById("valorMetaAtual");
  let totalEl = document.getElementById("valorMetaTotal");
  let progressoEl = document.getElementById("progressoMeta");
  let inputMeta = document.getElementById("metaSemanal");
  let badgeEl = document.getElementById("badgeMeta");
  let notificacaoEl = document.getElementById("notificacaoMeta");

  if (!atualEl || !totalEl || !progressoEl) return;

  let minhasSemana =
    corridasFirebase.filter(item =>
      (
        item.uid === usuarioAtual.uid ||
        item.email === usuarioAtual.email
      ) &&
      estaNaSemanaAtual(item.data)
    );

  let totalAtual =
    minhasSemana.reduce(
      (soma, item) => soma + Number(item.valor),
      0
    );

 let meta = Number(
  (dadosUsuario && dadosUsuario.metaSemanal) || 0
);

  if (inputMeta && meta > 0) {
    inputMeta.value = meta;
  }

  atualEl.innerText = `R$ ${totalAtual}`;
  totalEl.innerText = `R$ ${meta}`;

  let progresso = 0;

  if (meta > 0) {
    progresso =
      Math.min(
        150,
        Math.round((totalAtual / meta) * 100)
      );
  }

  progressoEl.innerText =
    `${Math.min(progresso, 100)}%`;

  if (badgeEl) {

    if (meta <= 0) {
      badgeEl.innerHTML =
        "😴 Defina uma meta para ganhar badges";
    } else if (progresso >= 120) {
      badgeEl.innerHTML =
        "🔥 Ultra Meta — passou de 120%";
    } else if (progresso >= 100) {
      badgeEl.innerHTML =
        "🏆 Meta Batida — desafio concluído";
    } else if (progresso >= 75) {
      badgeEl.innerHTML =
        "🥇 Ouro — 75% da meta";
    } else if (progresso >= 50) {
      badgeEl.innerHTML =
        "🥈 Prata — 50% da meta";
    } else if (progresso >= 25) {
      badgeEl.innerHTML =
        "🥉 Bronze — 25% da meta";
    } else {
      badgeEl.innerHTML =
        "🚀 Começando — siga lançando corridas";
    }
  }

  if (notificacaoEl) {

    let faltam = meta - totalAtual;

    if (meta <= 0) {
      notificacaoEl.innerHTML =
        "🚀 Defina uma meta para começar";
    } else if (faltam <= 0) {
      notificacaoEl.innerHTML =
        "🏆 Parabéns! Você bateu sua meta semanal!";
    } else if (faltam <= meta * 0.1) {
      notificacaoEl.innerHTML =
        `🔥 Falta pouco! Só R$ ${faltam} para bater sua meta.`;
    } else {
      notificacaoEl.innerHTML =
        `🔔 Faltam R$ ${faltam} para sua meta semanal.`;
    }
  }
let totalCorridasSemana =
  minhasSemana.reduce(
    (soma, item) =>
      soma + Number(item.corridas || 0),
    0
  );

let mediaCorrida = 0;

if (totalCorridasSemana > 0) {
  mediaCorrida =
    totalAtual / totalCorridasSemana;
}

let totalCorridasEl =
  document.getElementById("insightTotalCorridas");

let mediaCorridaEl =
  document.getElementById("insightMediaCorrida");

if (totalCorridasEl) {
  totalCorridasEl.innerText =
    totalCorridasSemana;
}

if (mediaCorridaEl) {
  mediaCorridaEl.innerText =
    `R$ ${mediaCorrida.toFixed(2)}`;

}
let diasTrabalhados = new Set(
  minhasSemana.map(item => item.data)
).size;

let mediaDiaria = 0;

if (diasTrabalhados > 0) {
  mediaDiaria =
    totalAtual / diasTrabalhados;
}

let mediaDiariaEl =
  document.getElementById("insightMediaDiaria");

if (mediaDiariaEl) {
  mediaDiariaEl.innerText =
    `R$ ${mediaDiaria.toFixed(2)}`;
}
}

function atualizarMelhorDia() {

  let nomeEl = document.getElementById("melhorDiaNome");
  let valorEl = document.getElementById("melhorDiaValor");

  if (!nomeEl || !valorEl || !usuarioAtual) return;

  let mapa = {};

  corridasFirebase
    .filter(item =>
      (
        item.uid === usuarioAtual.uid ||
        item.email === usuarioAtual.email
      ) &&
      estaNaSemanaAtual(item.data)
    )
    .forEach(item => {

      if (!mapa[item.data]) {
        mapa[item.data] = {
          valor: 0
        };
      }

      mapa[item.data].valor += Number(item.valor);
    });

  let melhorData = null;

  Object.keys(mapa).forEach(data => {

    if (
      !melhorData ||
      mapa[data].valor > mapa[melhorData].valor
    ) {
      melhorData = data;
    }
  });

  if (!melhorData) {
    nomeEl.innerText = "-";
    valorEl.innerText = "R$ 0";
    return;
  }

  let dataObj = new Date(melhorData + "T00:00:00");

  nomeEl.innerText =
    dataObj.toLocaleDateString(
      "pt-BR",
      { weekday: "long" }
    );

  valorEl.innerText =
    `R$ ${mapa[melhorData].valor}`;
}

function atualizarFechamentoMensal() {

  if (!usuarioAtual) return;

  let totalEl =
    document.getElementById("fechamentoTotalMes");

  let corridasEl =
    document.getElementById("fechamentoCorridasMes");

  let mediaEl =
    document.getElementById("fechamentoMediaDiariaMes");

  let melhorDiaEl =
    document.getElementById("fechamentoMelhorDiaMes");

  if (
    !totalEl ||
    !corridasEl ||
    !mediaEl ||
    !melhorDiaEl
  ) return;

  let hoje = new Date();

  let mesAtual = hoje.getMonth();
  let anoAtual = hoje.getFullYear();

  let minhasMes =
    corridasFirebase.filter(item => {

      if (!item.data) return false;

      let data =
        new Date(item.data + "T00:00:00");

      return (
        (
          item.uid === usuarioAtual.uid ||
          item.email === usuarioAtual.email
        ) &&
        data.getMonth() === mesAtual &&
        data.getFullYear() === anoAtual
      );
    });

  let totalMes =
    minhasMes.reduce(
      (soma, item) =>
        soma + Number(item.valor),
      0
    );

  let totalCorridas =
    minhasMes.reduce(
      (soma, item) =>
        soma + Number(item.corridas || 0),
      0
    );

  let diasTrabalhados = new Set(
    minhasMes.map(item => item.data)
  ).size;

  let mediaDiaria = 0;

  if (diasTrabalhados > 0) {
    mediaDiaria =
      totalMes / diasTrabalhados;
  }

  let mapaDias = {};

  minhasMes.forEach(item => {

    if (!mapaDias[item.data]) {
      mapaDias[item.data] = 0;
    }

    mapaDias[item.data] +=
      Number(item.valor);
  });

  let melhorDia = "-";
  let maiorValor = 0;

  Object.keys(mapaDias).forEach(data => {

    if (mapaDias[data] > maiorValor) {

      maiorValor = mapaDias[data];

      let dataObj =
        new Date(data + "T00:00:00");

      melhorDia =
        dataObj.toLocaleDateString(
          "pt-BR",
          { weekday: "long" }
        );
    }
  });

  totalEl.innerText =
    `R$ ${totalMes.toFixed(2)}`;

  corridasEl.innerText =
    totalCorridas;

  mediaEl.innerText =
    `R$ ${mediaDiaria.toFixed(2)}`;

  melhorDiaEl.innerText =
    melhorDia;
}