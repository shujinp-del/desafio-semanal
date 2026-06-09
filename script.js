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
let metaRecomendadaAtual = 0;
let metaConservadoraAtual = 0;
let metaDesafioAtual = 0;

let grafico;
let graficoLinha;

let editandoId = null;
let pararSincronia = null;

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

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
  let botaoAdminMais = document.getElementById("botaoAdminMais");

  if (botaoGeral) {
    botaoGeral.style.display = usuarioEhAdmin() ? "block" : "none";
  }

  if (botaoAdmin) {
    botaoAdmin.style.display = usuarioEhAdmin() ? "block" : "none";
  }

  if (botaoAdminMais) {
    botaoAdminMais.style.display = usuarioEhAdmin() ? "block" : "none";
  }
}

function mostrarStatusLogin(texto) {
  let card = document.querySelector("#loginTela .card");

  if (!card) return;

  let status = document.getElementById("statusLogin");

  if (!status) {
    status = document.createElement("p");
    status.id = "statusLogin";
    status.className = "subtitulo";
    card.appendChild(status);
  }

  status.innerText = texto;
}

async function cadastrar() {
  let email = document.getElementById("emailLogin").value.trim();
  let senha = document.getElementById("senhaLogin").value;

  if (!email || !senha) {
    alert("Digite email e senha");
    return;
  }

  try {
    let credencial = await createUserWithEmailAndPassword(
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
  let email = document.getElementById("emailLogin").value.trim();
  let senha = document.getElementById("senhaLogin").value;

  signInWithEmailAndPassword(auth, email, senha)
    .catch(erro => alert(erro.message));
}

function sair() {
  signOut(auth);
}

onAuthStateChanged(auth, async usuario => {
  usuarioAtual = usuario;

  let menu = document.getElementById("menuApp");
  let usuarioLogado = document.getElementById("usuarioLogado");

  if (pararSincronia) {
    pararSincronia();
    pararSincronia = null;
  }

  if (!usuario) {
    if (menu) {
      menu.style.display = "none";
    }

    aplicarPrivacidadeMenus();
    abrirTela("loginTela");
    return;
  }

  let usuarioRef = doc(db, "usuarios", usuario.uid);
  let usuarioSnap = await getDoc(usuarioRef);

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

    aplicarPrivacidadeMenus();

    mostrarStatusLogin("⏳ Sua conta está aguardando aprovação.");

    abrirTela("loginTela");

    return;
  }

  if (menu) {
    menu.style.display = "flex";
  }

  aplicarPrivacidadeMenus();

  if (usuarioLogado) {
    let nome = usuario.email.split("@")[0];

usuarioLogado.innerText =
  `👋 Bem-vindo, ${nome}`;
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

          if (estaNaSemanaAtual(corrida.data)) {
            corridasSemana.push(corrida);
          }
        }
      });

      corridasFirebase = todasCorridas;

      ranking = montarRanking(corridasSemana);

      atualizarRankingMetas();

      atualizarTudo();
    }
  );
}

function montarRanking(corridas) {
  let mapa = {};

  corridas.forEach(item => {
    let chave = item.nome.toLowerCase();

    if (!mapa[chave]) {
      mapa[chave] = {
        nome: item.nome,
        valor: 0,
        corridas: 0,
        historico: []
      };
    }

    mapa[chave].valor += Number(item.valor);
    mapa[chave].corridas += Number(item.corridas || 0);

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
  let lista = document.getElementById("rankingMetas");

  if (!lista) return;

  lista.innerHTML = "";

  let usuariosSnap = await getDocs(collection(db, "usuarios"));

  let rankingTemp = [];

  usuariosSnap.forEach(docSnap => {
    let usuario = docSnap.data();

    if (!usuario.metaSemanal || usuario.metaSemanal <= 0) {
      return;
    }

    let minhas = corridasFirebase.filter(
      item =>
        item.email === usuario.email &&
        estaNaSemanaAtual(item.data)
    );

    let total = minhas.reduce(
      (soma, item) => soma + Number(item.valor),
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

  rankingTemp.sort((a, b) => b.progresso - a.progresso);

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
          💰 ${formatarMoeda(item.total)} de ${formatarMoeda(item.meta)}
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
  let origem = document.getElementById("origem").value;
  let data = document.getElementById("data").value;

  if (!nome || valor <= 0 || !data) {
    alert("Preencha nome, valor e data");
    return;
  }

  try {
    if (editandoId) {
      await updateDoc(doc(db, "corridas", editandoId), {
        nome,
        valor,
        corridas,
        data,
        origem,
        uid: usuarioAtual.uid,
        email: usuarioAtual.email
      });

      alert("✏️ Corrida editada!");
      editandoId = null;
    } else {
      await addDoc(collection(db, "corridas"), {
        nome,
        valor,
        corridas,
        data,
        origem,
        uid: usuarioAtual.uid,
        email: usuarioAtual.email,
        criadoEm: new Date().toISOString()
      });
    }

    limparCampos();
  } catch (erro) {
    console.error(erro);
    alert("Erro ao salvar");
  }
}

function editarCorrida(id) {
  let corrida = corridasFirebase.find(item => item.id === id);

  if (!corrida) return;

  document.getElementById("nome").value = corrida.nome;
  document.getElementById("valor").value = corrida.valor;
  document.getElementById("corridas").value = corrida.corridas || 0;
  document.getElementById("origem").value = corrida.origem || "Uber";
  document.getElementById("data").value = corrida.data;

  editandoId = id;
  let botaoSalvarCorrida =
  document.getElementById("botaoSalvarCorrida");

if (botaoSalvarCorrida) {
  botaoSalvarCorrida.innerText =
    "Salvar edição";
}

  abrirTela("novaCorridaTela");
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

  let meta = Number(document.getElementById("metaSemanal").value);

  if (!meta || meta <= 0) {
    alert("Digite uma meta válida");
    return;
  }

  try {
    await updateDoc(doc(db, "usuarios", usuarioAtual.uid), {
      metaSemanal: meta
    });

    dadosUsuario.metaSemanal = meta;

    atualizarMetas();
    atualizarRankingMetas();
    atualizarMelhorDia();
    atualizarPiorDia();
    atualizarFechamentoMensal();

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
  let barraMetaTela = document.getElementById("barraMetaTela");
  let faltaMetaTexto = document.getElementById("faltaMetaTexto");

  if (!atualEl || !totalEl || !progressoEl) return;

  let minhasSemana = corridasFirebase.filter(item =>
    (
      item.uid === usuarioAtual.uid ||
      item.email === usuarioAtual.email
    ) &&
    estaNaSemanaAtual(item.data)
  );

  let totalAtual = minhasSemana.reduce(
    (soma, item) => soma + Number(item.valor || 0),
    0
  );

  let meta = Number((dadosUsuario && dadosUsuario.metaSemanal) || 0);

  if (inputMeta && meta > 0) {
    inputMeta.value = meta;
  }

  atualEl.innerText = formatarMoeda(totalAtual);
  totalEl.innerText = formatarMoeda(meta);

  let progresso = 0;

  if (meta > 0) {
    progresso = Math.min(
      150,
      Math.round((totalAtual / meta) * 100)
    );
  }

  let progressoVisual = Math.min(progresso, 100);

  progressoEl.innerText = `${progressoVisual}%`;

  if (barraMetaTela) {
    barraMetaTela.style.width = `${progressoVisual}%`;
  }

  if (faltaMetaTexto) {
    if (meta > 0) {
      let falta = Math.max(0, meta - totalAtual);

      faltaMetaTexto.innerText =
        falta > 0
          ? `Faltam ${formatarMoeda(falta)} para atingir sua meta`
          : "🎉 Meta semanal alcançada!";
    } else {
      faltaMetaTexto.innerText = "Defina uma meta para começar";
    }
  }

  if (badgeEl) {
    if (meta <= 0) {
      badgeEl.innerHTML = "😴 Defina uma meta para ganhar badges";
    } else if (progresso >= 120) {
      badgeEl.innerHTML = "🔥 Ultra Meta — passou de 120%";
    } else if (progresso >= 100) {
      badgeEl.innerHTML = "🏆 Meta Batida — desafio concluído";
    } else if (progresso >= 75) {
      badgeEl.innerHTML = "🥇 Ouro — 75% da meta";
    } else if (progresso >= 50) {
      badgeEl.innerHTML = "🥈 Prata — 50% da meta";
    } else if (progresso >= 25) {
      badgeEl.innerHTML = "🥉 Bronze — 25% da meta";
    } else {
      badgeEl.innerHTML = "🚀 Começando — siga lançando corridas";
    }
  }

  if (notificacaoEl) {
    let faltam = meta - totalAtual;

    if (meta <= 0) {
      notificacaoEl.innerHTML = "🚀 Defina uma meta para começar";
    } else if (faltam <= 0) {
      notificacaoEl.innerHTML = "🏆 Parabéns! Você bateu sua meta semanal!";
    } else if (faltam <= meta * 0.1) {
      notificacaoEl.innerHTML =
        `🔥 Falta pouco! Só ${formatarMoeda(faltam)} para bater sua meta.`;
    } else {
      notificacaoEl.innerHTML =
        `🔔 Faltam ${formatarMoeda(faltam)} para sua meta semanal.`;
    }
  }

  let totalCorridasSemana = minhasSemana.reduce(
    (soma, item) => soma + Number(item.corridas || 0),
    0
  );

  let mediaCorrida = 0;

  if (totalCorridasSemana > 0) {
    mediaCorrida = totalAtual / totalCorridasSemana;
  }

  let totalCorridasEl = document.getElementById("insightTotalCorridas");
  let mediaCorridaEl = document.getElementById("insightMediaCorrida");

  if (totalCorridasEl) {
    totalCorridasEl.innerText = totalCorridasSemana;
  }

  if (mediaCorridaEl) {
    mediaCorridaEl.innerText = formatarMoeda(mediaCorrida);
  }

  let diasTrabalhados = new Set(
    minhasSemana.map(item => item.data)
  ).size;

  let mediaDiaria = 0;

  if (diasTrabalhados > 0) {
    mediaDiaria = totalAtual / diasTrabalhados;
  }

  let mediaDiariaEl = document.getElementById("insightMediaDiaria");

  if (mediaDiariaEl) {
    mediaDiariaEl.innerText = formatarMoeda(mediaDiaria);
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
        mapa[item.data] = { valor: 0 };
      }

      mapa[item.data].valor += Number(item.valor || 0);
    });

  let melhorData = null;

  Object.keys(mapa).forEach(data => {
    if (!melhorData || mapa[data].valor > mapa[melhorData].valor) {
      melhorData = data;
    }
  });

  if (!melhorData) {
    nomeEl.innerText = "-";
    valorEl.innerText = formatarMoeda(0);
    return;
  }

  let dataObj = new Date(melhorData + "T00:00:00");

  nomeEl.innerText = dataObj.toLocaleDateString("pt-BR", {
    weekday: "long"
  });

  valorEl.innerText = formatarMoeda(mapa[melhorData].valor);
}

function atualizarPiorDia() {
  let nomeEl = document.getElementById("piorDiaNome");
  let valorEl = document.getElementById("piorDiaValor");

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
        mapa[item.data] = { valor: 0 };
      }

      mapa[item.data].valor += Number(item.valor);
    });

  let piorData = null;

  Object.keys(mapa).forEach(data => {
    if (!piorData || mapa[data].valor < mapa[piorData].valor) {
      piorData = data;
    }
  });

  if (!piorData) {
    nomeEl.innerText = "-";
    valorEl.innerText = formatarMoeda(0);
    return;
  }

  let dataObj = new Date(piorData + "T00:00:00");

  nomeEl.innerText = dataObj.toLocaleDateString("pt-BR", {
    weekday: "long"
  });

  valorEl.innerText = formatarMoeda(mapa[piorData].valor);
}

function atualizarFechamentoMensal() {
  if (!usuarioAtual) return;

  let totalEl = document.getElementById("fechamentoTotalMes");
  let corridasEl = document.getElementById("fechamentoCorridasMes");
  let mediaEl = document.getElementById("fechamentoMediaDiariaMes");
  let melhorDiaEl = document.getElementById("fechamentoMelhorDiaMes");

  if (!totalEl || !corridasEl || !mediaEl || !melhorDiaEl) return;

  let hoje = new Date();

  let mesAtual = hoje.getMonth();
  let anoAtual = hoje.getFullYear();

  let minhasMes = corridasFirebase.filter(item => {
    if (!item.data) return false;

    let data = new Date(item.data + "T00:00:00");

    return (
      (
        item.uid === usuarioAtual.uid ||
        item.email === usuarioAtual.email
      ) &&
      data.getMonth() === mesAtual &&
      data.getFullYear() === anoAtual
    );
  });

  let totalMes = minhasMes.reduce(
    (soma, item) => soma + Number(item.valor),
    0
  );

  let totalCorridas = minhasMes.reduce(
    (soma, item) => soma + Number(item.corridas || 0),
    0
  );

  let diasTrabalhados = new Set(
    minhasMes.map(item => item.data)
  ).size;

  let mediaDiaria = 0;

  if (diasTrabalhados > 0) {
    mediaDiaria = totalMes / diasTrabalhados;
  }

  let mapaDias = {};

  minhasMes.forEach(item => {
    if (!mapaDias[item.data]) {
      mapaDias[item.data] = 0;
    }

    mapaDias[item.data] += Number(item.valor);
  });

  let melhorDia = "-";
  let maiorValor = 0;

  Object.keys(mapaDias).forEach(data => {
    if (mapaDias[data] > maiorValor) {
      maiorValor = mapaDias[data];

      let dataObj = new Date(data + "T00:00:00");

      melhorDia = dataObj.toLocaleDateString("pt-BR", {
        weekday: "long"
      });
    }
  });

  totalEl.innerText = formatarMoeda(totalMes);
  corridasEl.innerText = totalCorridas;
  mediaEl.innerText = formatarMoeda(mediaDiaria);
  melhorDiaEl.innerText = melhorDia;
}

async function atualizarAdmin() {
  let lista = document.getElementById("listaAdminUsuarios");

  if (!lista) return;

  if (!usuarioEhAdmin()) {
    lista.innerHTML = "<li>Acesso restrito.</li>";
    return;
  }

  lista.innerHTML = "";

  let usuariosSnap = await getDocs(collection(db, "usuarios"));

  usuariosSnap.forEach(docSnap => {
    let usuario = docSnap.data();
    let id = docSnap.id;

    lista.innerHTML += `
      <li>
        <div class="posicao">👤 ${usuario.email || "sem email"}</div>
        <br>
        <div>Status: <strong>${usuario.status}</strong></div>
        <div>Papel: <strong>${usuario.papel}</strong></div>
        <br>
        <button onclick="aprovarUsuario('${id}')">✅ Aprovar</button>
        <button onclick="bloquearUsuario('${id}')">🚫 Bloquear</button>
        <button onclick="tornarAdmin('${id}')">👑 Tornar admin</button>
        <button onclick="removerAdmin('${id}')">⬇️ Remover admin</button>
        <button onclick="excluirConta('${id}', '${usuario.email}')">🗑️ Excluir conta</button>
      </li>
    `;
  });
}
async function removerAdmin(id) {
  if (!confirm("Deseja remover o acesso admin deste usuário?")) {
    return;
  }

  await updateDoc(doc(db, "usuarios", id), {
    status: "ativo",
    papel: "motorista"
  });

  alert("Admin removido!");

  atualizarAdmin();
}

async function aprovarUsuario(id) {
  await updateDoc(doc(db, "usuarios", id), { status: "ativo" });

  alert("Usuário aprovado!");

  atualizarAdmin();
  atualizarRankingMetas();
}

async function bloquearUsuario(id) {
  await updateDoc(doc(db, "usuarios", id), { status: "bloqueado" });

  alert("Usuário bloqueado!");

  atualizarAdmin();
  atualizarRankingMetas();
}

async function tornarAdmin(id) {
  await updateDoc(doc(db, "usuarios", id), {
    status: "ativo",
    papel: "admin"
  });

  alert("Usuário virou admin!");

  atualizarAdmin();
  atualizarRankingMetas();
}

function estaNaSemanaAtual(data) {
  let hoje = new Date();
  let inicioSemana = new Date(hoje);
  let diaSemana = hoje.getDay();

  let diferenca = diaSemana === 0 ? -6 : 1 - diaSemana;

  inicioSemana.setDate(hoje.getDate() + diferenca);
  inicioSemana.setHours(0, 0, 0, 0);

  let fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);
  fimSemana.setHours(23, 59, 59, 999);

  let dataCorrida = new Date(data + "T00:00:00");

  return dataCorrida >= inicioSemana && dataCorrida <= fimSemana;
}

function formatarData(data) {
  if (!data) return "sem data";

  let partes = data.split("-");

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function abrirTela(id) {
  if (id === "historicoTela" && !usuarioEhAdmin()) {
    alert("Acesso restrito ao admin.");
    abrirTela("home");
    return;
  }

  if (id === "adminTela" && !usuarioEhAdmin()) {
    alert("Acesso restrito ao admin.");
    abrirTela("home");
    return;
  }

  document.querySelectorAll(".tela").forEach(tela => {
    tela.classList.remove("ativa");
  });

  let tela = document.getElementById(id);

  if (tela) {
    tela.classList.add("ativa");
  }

 if (id === "metasTela") {
  atualizarMetas();
  atualizarRankingMetas();
  atualizarMelhorDia();
  atualizarPiorDia();
  atualizarFechamentoMensal();
  atualizarMetaInteligente();
}

  if (id === "adminTela") {
    atualizarAdmin();
  }

 if (id === "graficoTela") {
  atualizarHistoricoMensalCards();
  atualizarInsightSemana();
  atualizarComparativoSemanal();
  atualizarGrafico();
  atualizarGraficoLinha();
}

if (id === "historicoTela") {
  atualizarHistoricoMensalCards();
}

  if (id === "minhasTela") {
    atualizarMinhasCorridas();
  }

  if (id === "rankingTela") {
    atualizarRankingMetas();
  }
}

function atualizarTudo() {
  aplicarPrivacidadeMenus();
  let totalHojeCorrida =
  document.getElementById("totalHojeCorrida");

let corridasHojeCorrida =
  document.getElementById("corridasHojeCorrida");

let hoje = new Date().toISOString().split("T")[0];

let corridasHoje = corridasFirebase.filter(item =>
  item.data === hoje &&
  (
    item.uid === usuarioAtual?.uid ||
    item.email === usuarioAtual?.email
  )
);

let totalHoje = corridasHoje.reduce(
  (soma, item) =>
    soma + Number(item.valor || 0),
  0
);

let qtdHoje = corridasHoje.reduce(
  (soma, item) =>
    soma + Number(item.corridas || 0),
  0
);

if (totalHojeCorrida) {
  totalHojeCorrida.innerText =
    formatarMoeda(totalHoje);
}

if (corridasHojeCorrida) {
  corridasHojeCorrida.innerText =
    qtdHoje;
}

  atualizarRanking();
  atualizarLider();
  atualizarMetricas();
  atualizarGrafico();
  atualizarGraficoLinha();
  atualizarHistoricoMensal();
  atualizarRecordes();
  atualizarComparativoMensal();
  //atualizarMelhorSemana();
  atualizarMinhasCorridas();
  atualizarMetas();
  atualizarRankingMetas();
  atualizarMelhorDia();
  atualizarPiorDia();
  atualizarFechamentoMensal();
  atualizarMetaInteligente();
  
}

function atualizarRanking() {
  let lista = document.getElementById("ranking");

  if (!lista) return;

  lista.innerHTML = "";

  let totalGeral = ranking.reduce(
    (soma, item) => soma + item.valor,
    0
  );

  ranking.forEach((m, index) => {

    let medalha = `${index + 1}º`;

    if (index === 0) medalha = "🥇";
    if (index === 1) medalha = "🥈";
    if (index === 2) medalha = "🥉";

    let porcentagem = totalGeral > 0
      ? Math.round((m.valor / totalGeral) * 100)
      : 0;

    lista.innerHTML += `
      <li class="ranking-card">

        <div class="ranking-topo">
          <span class="ranking-medalha">
            ${medalha}
          </span>

          <span class="ranking-nome">
            ${m.nome}
          </span>
        </div>

        ${
          usuarioEhAdmin()
            ? `
              <div class="ranking-valor">
                💰 ${formatarMoeda(m.valor)}
              </div>
            `
            : `
              <div class="ranking-valor">
                📊 ${porcentagem}% do total
              </div>
            `
        }

        <div class="ranking-corridas">
          🚗 ${m.corridas} corridas
        </div>

      </li>
    `;
  });
}

function atualizarMinhasCorridas() {
  let lista = document.getElementById("listaMinhas");
  let totalEl = document.getElementById("meuTotal");

  if (!lista || !totalEl || !usuarioAtual) return;

  lista.innerHTML = "";

  let minhas = corridasFirebase.filter(
    item =>
      item.uid === usuarioAtual.uid ||
      item.email === usuarioAtual.email
  );

  let total = minhas.reduce(
    (soma, item) => soma + Number(item.valor),
    0
  );

  minhas.sort((a, b) => new Date(b.data) - new Date(a.data));

  minhas.forEach(item => {
    lista.innerHTML += `
      <li>
        <div class="posicao">🚗 ${item.nome}</div>
        <br>
        <div class="valor">💰 ${formatarMoeda(item.valor)}</div>
        <div>
  📅 ${formatarData(item.data)}
</div>

<div>
  🏷️ ${item.origem || "Sem origem"}
</div>

<div>
  🛣️ ${item.corridas || 0} corridas
</div>
        <br>
        <button onclick="editarCorrida('${item.id}')">✏️ Editar</button>
        <button onclick="excluirCorrida('${item.id}')">🗑️ Excluir</button>
      </li>
    `;
  });

  totalEl.innerText = formatarMoeda(total);
}

function atualizarHistoricoMensal() {
  let lista = document.getElementById("listaHistorico");
  let totalEl = document.getElementById("totalHistoricoMensal");

  if (!lista || !totalEl) return;

  lista.innerHTML = "";

  let total = 0;
  let hoje = new Date();
  let mesAtual = hoje.getMonth();
  let anoAtual = hoje.getFullYear();

  let corridasMes = corridasFirebase.filter(item => {
    if (!item.data) return false;

    let data = new Date(item.data + "T00:00:00");

    return (
      data.getMonth() === mesAtual &&
      data.getFullYear() === anoAtual
    );
  });

  corridasMes.sort((a, b) => new Date(b.data) - new Date(a.data));

  corridasMes.forEach(item => {
    total += Number(item.valor);

    lista.innerHTML += `
      <li>
        <div class="posicao">🚗 ${item.nome}</div>
        <br>
        <div class="valor">💰 ${formatarMoeda(item.valor)}</div>
    
<div>📅 ${formatarData(item.data)}</div>
<div>🏷️ ${item.origem || "Sem origem"}</div>
<div>🛣️ ${item.corridas || 0} corridas</div><div class="dashboard-cards">
        <br>
        <button onclick="editarCorrida('${item.id}')">✏️ Editar</button>
        <button onclick="excluirCorrida('${item.id}')">🗑️ Excluir</button>
      </li>
    `;
  });

  totalEl.innerText = formatarMoeda(total);
}
function atualizarComparativoMensal() {

  let atualEl =
    document.getElementById("mesAtualAteHoje");

  let projecaoEl =
    document.getElementById("projecaoMensal");

  let anteriorEl =
    document.getElementById("mesAnteriorComparativo");

  let tendenciaEl =
    document.getElementById("tendenciaMensal");

  if (
    !atualEl ||
    !projecaoEl ||
    !anteriorEl ||
    !tendenciaEl ||
    !usuarioAtual
  ) return;

  let hoje = new Date();

  let mesAtual = hoje.getMonth();
  let anoAtual = hoje.getFullYear();

  let mesAnterior =
    mesAtual === 0 ? 11 : mesAtual - 1;

  let anoAnterior =
    mesAtual === 0
      ? anoAtual - 1
      : anoAtual;

  let totalAtual = 0;
  let totalAnterior = 0;

  let diasTrabalhados = new Set();

  corridasFirebase.forEach(item => {

    if (
      item.uid !== usuarioAtual.uid &&
      item.email !== usuarioAtual.email
    ) return;

    if (!item.data) return;

    let data =
      new Date(item.data + "T00:00:00");

    if (
      data.getMonth() === mesAtual &&
      data.getFullYear() === anoAtual
    ) {
      totalAtual += Number(item.valor || 0);

      diasTrabalhados.add(item.data);
    }

    if (
      data.getMonth() === mesAnterior &&
      data.getFullYear() === anoAnterior
    ) {
      totalAnterior += Number(item.valor || 0);
    }

  });

  let mediaDiaria = 0;

  if (diasTrabalhados.size > 0) {
    mediaDiaria =
      totalAtual / diasTrabalhados.size;
  }

  let diasNoMes =
    new Date(
      anoAtual,
      mesAtual + 1,
      0
    ).getDate();

  let projecao =
    mediaDiaria * diasNoMes;

  let tendencia = 0;

  if (totalAnterior > 0) {
    tendencia =
      (
        (projecao - totalAnterior)
        / totalAnterior
      ) * 100;
  }

  atualEl.innerText =
    formatarMoeda(totalAtual);

  projecaoEl.innerText =
    formatarMoeda(projecao);

  anteriorEl.innerText =
    formatarMoeda(totalAnterior);

  let emoji =
    tendencia >= 0
      ? "🔥"
      : "📉";

  let sinal =
    tendencia >= 0
      ? "+"
      : "";

  tendenciaEl.innerText =
    `${emoji} ${sinal}${tendencia.toFixed(1)}%`;
}
function atualizarRecordes() {
  if (!usuarioAtual) return;

  let melhorDiaEl = document.getElementById("recordeMelhorDia");
  let melhorSemanaEl = document.getElementById("recordeMelhorSemana");
  let melhorMesEl = document.getElementById("recordeMelhorMes");
  let corridasEl = document.getElementById("recordeCorridas");

  if (!melhorDiaEl || !melhorSemanaEl || !melhorMesEl || !corridasEl) return;

  let dias = {};
  let semanas = {};
  let meses = {};

  corridasFirebase.forEach(item => {
    if (
      item.uid !== usuarioAtual.uid &&
      item.email !== usuarioAtual.email
    ) return;

    if (!item.data) return;

    let valor = Number(item.valor || 0);
    let qtdCorridas = Number(item.corridas || 0);
    let dataObj = new Date(item.data + "T00:00:00");

    let chaveDia = item.data;
    let inicioSemana = obterInicioSemana(dataObj);
    let chaveSemana = inicioSemana.toISOString().slice(0, 10);
    let chaveMes = `${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, "0")}`;

    if (!dias[chaveDia]) dias[chaveDia] = { total: 0, corridas: 0 };
    if (!semanas[chaveSemana]) semanas[chaveSemana] = 0;
    if (!meses[chaveMes]) meses[chaveMes] = 0;

    dias[chaveDia].total += valor;
    dias[chaveDia].corridas += qtdCorridas;
    semanas[chaveSemana] += valor;
    meses[chaveMes] += valor;
  });

  let melhorDia = 0;
  let melhorSemana = 0;
  let melhorMes = 0;
  let maiorCorridas = 0;

  Object.values(dias).forEach(dia => {
    melhorDia = Math.max(melhorDia, dia.total);
    maiorCorridas = Math.max(maiorCorridas, dia.corridas);
  });

  Object.values(semanas).forEach(total => {
    melhorSemana = Math.max(melhorSemana, total);
  });

  Object.values(meses).forEach(total => {
    melhorMes = Math.max(melhorMes, total);
  });

  melhorDiaEl.innerText = formatarMoeda(melhorDia);
  melhorSemanaEl.innerText = formatarMoeda(melhorSemana);
  melhorMesEl.innerText = formatarMoeda(melhorMes);
  corridasEl.innerText = `${maiorCorridas} corridas`;
}
function atualizarLider() {
  let lider = document.getElementById("liderSemana");

  if (!lider || !usuarioAtual) return;

  let rankingSemana = montarRanking(
    corridasFirebase.filter(item => estaNaSemanaAtual(item.data))
  );

  let minhasSemana = corridasFirebase.filter(
    item =>
      (
        item.uid === usuarioAtual.uid ||
        item.email === usuarioAtual.email
      ) &&
      estaNaSemanaAtual(item.data)
  );

  let totalUsuario = minhasSemana.reduce(
    (soma, item) => soma + Number(item.valor || 0),
    0
  );

  let corridasUsuario = minhasSemana.reduce(
    (soma, item) => soma + Number(item.corridas || 0),
    0
  );

  if (minhasSemana.length === 0) {
    lider.innerHTML = "";
    return;
  }

  let posicao = rankingSemana.findIndex(
    item => item.valor === totalUsuario
  ) + 1;

  if (posicao <= 0) posicao = "-";

  let liderGeral = rankingSemana[0];
  let falta = 0;

  if (liderGeral && liderGeral.valor > totalUsuario) {
    falta = liderGeral.valor - totalUsuario;
  }

  let medalha = "🥉";

  if (posicao === 1) medalha = "🥇";
  if (posicao === 2) medalha = "🥈";
  if (posicao === 3) medalha = "🥉";

  let mensagem =
    posicao === 1
      ? "👑 Você está liderando a semana!"
      : `🔥 Faltam ${formatarMoeda(falta)} para alcançar o líder`;

  lider.innerHTML = `
    <div class="card card-posicao-v2">
      <div class="posicao-medalha">${medalha}</div>

      <div>
        <small>Meu desempenho</small>

        <h2>Você está em ${posicao}º lugar</h2>

        <p>${mensagem}</p>

        <div class="linha-posicao">
          <span>${formatarMoeda(totalUsuario)}</span>
          <strong>${corridasUsuario} corridas</strong>
        </div>
      </div>
    </div>
  `;
}

function atualizarMetricas() {
  if (!usuarioAtual) return;

  let minhasSemana = corridasFirebase.filter(
    item =>
      (
        item.uid === usuarioAtual.uid ||
        item.email === usuarioAtual.email
      ) &&
      estaNaSemanaAtual(item.data)
  );

  let totalSemanaValor = minhasSemana.reduce(
    (soma, item) => soma + Number(item.valor),
    0
  );

  let corridasSemana = minhasSemana.reduce(
    (soma, item) => soma + Number(item.corridas || 0),
    0
  );

  let hoje = new Date();
  let mesAtual = hoje.getMonth();
  let anoAtual = hoje.getFullYear();

  let minhasMes = corridasFirebase.filter(item => {
    if (!item.data) return false;

    let data = new Date(item.data + "T00:00:00");

    return (
      (
        item.uid === usuarioAtual.uid ||
        item.email === usuarioAtual.email
      ) &&
      data.getMonth() === mesAtual &&
      data.getFullYear() === anoAtual
    );
  });

  let totalMesValor = minhasMes.reduce(
    (soma, item) => soma + Number(item.valor),
    0
  );
  let totalUber = minhasSemana
  .filter(item => item.origem === "Uber")
  .reduce((soma, item) => soma + Number(item.valor), 0);

let total99 = minhasSemana
  .filter(item => item.origem === "99")
  .reduce((soma, item) => soma + Number(item.valor), 0);

let totalParticular = minhasSemana
  .filter(item => item.origem === "Particular")
  .reduce((soma, item) => soma + Number(item.valor), 0);

  let homeTotal = document.getElementById("homeTotal");
  let homeMensal = document.getElementById("homeMensal");
  let totalSemana = document.getElementById("totalSemana");
  let totalCorridas = document.getElementById("totalCorridas");
  let mediaCorridaGrafico = document.getElementById("mediaCorridaGrafico");
let melhorDiaGrafico = document.getElementById("melhorDiaGrafico");
  let totalUberEl = document.getElementById("totalUber");
let total99El = document.getElementById("total99");
let totalParticularEl = document.getElementById("totalParticular");
let porcentagemUberEl = document.getElementById("porcentagemUber");
let porcentagem99El = document.getElementById("porcentagem99");
let porcentagemParticularEl = document.getElementById("porcentagemParticular");

 let totalCorridasHome = document.getElementById("totalCorridasHome");
let statusMetaHome = document.getElementById("statusMetaHome");
let barraMetaHome = document.getElementById("barraMetaHome");
let metaHomeValor = document.getElementById("metaHomeValor");
let metaHomePorcentagem = document.getElementById("metaHomePorcentagem");

let metaSemanal = Number((dadosUsuario && dadosUsuario.metaSemanal) || 0);

let progressoMeta = 0;

if (metaSemanal > 0) {
  progressoMeta = Math.min(
    100,
    Math.round((totalSemanaValor / metaSemanal) * 100)
  );
}

if (homeTotal) homeTotal.innerText = formatarMoeda(totalSemanaValor);
if (homeMensal) homeMensal.innerText = formatarMoeda(totalMesValor);
if (totalSemana) totalSemana.innerText = formatarMoeda(totalSemanaValor);
if (totalCorridas) totalCorridas.innerText = corridasSemana;
let mediaGrafico =
  corridasSemana > 0 ? totalSemanaValor / corridasSemana : 0;

if (mediaCorridaGrafico) {
  mediaCorridaGrafico.innerText = formatarMoeda(mediaGrafico);
}

let mapaDiasGrafico = {};

minhasSemana.forEach(item => {
  if (!mapaDiasGrafico[item.data]) {
    mapaDiasGrafico[item.data] = 0;
  }

  mapaDiasGrafico[item.data] += Number(item.valor || 0);
});

let melhorDataGrafico = null;

Object.keys(mapaDiasGrafico).forEach(data => {
  if (
    !melhorDataGrafico ||
    mapaDiasGrafico[data] > mapaDiasGrafico[melhorDataGrafico]
  ) {
    melhorDataGrafico = data;
  }
});

if (melhorDiaGrafico) {
  melhorDiaGrafico.innerText = melhorDataGrafico
    ? formatarData(melhorDataGrafico)
    : "-";
}

if (totalCorridasHome) totalCorridasHome.innerText = corridasSemana;
if (statusMetaHome) statusMetaHome.innerText = `${progressoMeta}%`;
let nivelXp = document.getElementById("nivelXp");
let xpAtual = document.getElementById("xpAtual");
let barraXp = document.getElementById("barraXp");

let xp = corridasSemana * 10;

let nivel = Math.floor(xp / 1000) + 1;

let xpNivelAtual = xp % 1000;

if (nivelXp) nivelXp.innerText = nivel;

if (xpAtual) {
  xpAtual.innerText = `${xpNivelAtual} / 1000 XP`;
}

if (barraXp) {
  barraXp.style.width = `${(xpNivelAtual / 1000) * 100}%`;
}
let conquistaSequencia =
  document.getElementById("conquistaSequencia");

let conquistaFaturamento =
  document.getElementById("conquistaFaturamento");

let conquistaCorridas =
  document.getElementById("conquistaCorridas");

let conquistaMeta =
  document.getElementById("conquistaMeta");

let corridasMes = minhasMes.reduce(
  (soma, item) => soma + Number(item.corridas || 0),
  0
);

let diasMes = new Set(
  minhasMes.map(item => item.data)
).size;

// 🔥 Consistência
let tituloConsistencia = "Em progresso";

if (diasMes >= 30) {
  tituloConsistencia = "Motorista Lendário";
} else if (diasMes >= 21) {
  tituloConsistencia = "Incansável";
} else if (diasMes >= 14) {
  tituloConsistencia = "Determinado";
} else if (diasMes >= 7) {
  tituloConsistencia = "Persistente";
}

// 🚗 Corridas
let tituloCorridas = "Em progresso";

if (corridasMes >= 600) {
  tituloCorridas = "Rei da Estrada";
} else if (corridasMes >= 500) {
  tituloCorridas = "Mestre das Corridas";
} else if (corridasMes >= 250) {
  tituloCorridas = "Estradeiro";
} else if (corridasMes >= 100) {
  tituloCorridas = "Rodador";
}

// 💰 Faturamento
let tituloFaturamento = "Em progresso";

if (totalMesValor >= 10000) {
  tituloFaturamento = "Mestre do Faturamento";
} else if (totalMesValor >= 7500) {
  tituloFaturamento = "Magnata";
} else if (totalMesValor >= 5000) {
  tituloFaturamento = "Empresário";
} else if (totalMesValor >= 2500) {
  tituloFaturamento = "Faturador";
}

// 🎯 Meta
let tituloMeta = "Em progresso";

if (progressoMeta >= 120) {
  tituloMeta = "Além da Meta";
} else if (progressoMeta >= 100) {
  tituloMeta = "Meta Cumprida";
} else if (progressoMeta >= 75) {
  tituloMeta = "Disciplinado";
} else if (progressoMeta >= 50) {
  tituloMeta = "Focado";
}

// Próximo nível - Consistência
let proximoConsistencia = "👑 Completo";

if (diasMes < 7) {
  proximoConsistencia = `7 dias`;
} else if (diasMes < 14) {
  proximoConsistencia = `14 dias`;
} else if (diasMes < 21) {
  proximoConsistencia = `21 dias`;
} else if (diasMes < 30) {
  proximoConsistencia = `30 dias`;
}

// Próximo nível - Corridas
let proximoCorridas = "👑 Completo";

if (corridasMes < 100) {
  proximoCorridas = `100`;
} else if (corridasMes < 250) {
  proximoCorridas = `250`;
} else if (corridasMes < 500) {
  proximoCorridas = `500`;
} else if (corridasMes < 600) {
  proximoCorridas = `600`;
}

// Próximo nível - Faturamento
let proximoFaturamento = "👑 Completo";

if (totalMesValor < 2500) {
  proximoFaturamento = formatarMoeda(2500);
} else if (totalMesValor < 5000) {
  proximoFaturamento = formatarMoeda(5000);
} else if (totalMesValor < 7500) {
  proximoFaturamento = formatarMoeda(7500);
} else if (totalMesValor < 10000) {
  proximoFaturamento = formatarMoeda(10000);
}

// Próximo nível - Meta
let proximoMeta = "👑 Completo";

if (progressoMeta < 50) {
  proximoMeta = "50%";
} else if (progressoMeta < 75) {
  proximoMeta = "75%";
} else if (progressoMeta < 100) {
  proximoMeta = "100%";
} else if (progressoMeta < 120) {
  proximoMeta = "120%";
}

if (conquistaSequencia) {
  conquistaSequencia.innerText =
    `${tituloConsistencia}\n${diasMes}/${proximoConsistencia}`;
}

if (conquistaFaturamento) {
  conquistaFaturamento.innerText =
    `${tituloFaturamento}\n${formatarMoeda(totalMesValor)}`;
}

if (conquistaCorridas) {
  conquistaCorridas.innerText =
    `${tituloCorridas}\n${corridasMes}/${proximoCorridas}`;
}

if (conquistaMeta) {
  conquistaMeta.innerText =
    `${tituloMeta}\n${progressoMeta}%/${proximoMeta}`;
}
// LIMPA CORES ANTIGAS
document.querySelectorAll(".conquista-box").forEach(card => {
  card.classList.remove(
    "raro-verde",
    "raro-azul",
    "raro-roxo",
    "raro-dourado"
  );
});

let cardsConquista =
  document.querySelectorAll(".conquista-box");

// 🔥 Consistência
if (cardsConquista[0]) {

  if (diasMes >= 30) {
    cardsConquista[0].classList.add("raro-dourado");
  } else if (diasMes >= 21) {
    cardsConquista[0].classList.add("raro-roxo");
  } else if (diasMes >= 14) {
    cardsConquista[0].classList.add("raro-azul");
  } else {
    cardsConquista[0].classList.add("raro-verde");
  }

}

// 💰 Faturamento
if (cardsConquista[1]) {

  if (totalMesValor >= 10000) {
    cardsConquista[1].classList.add("raro-dourado");
  } else if (totalMesValor >= 7500) {
    cardsConquista[1].classList.add("raro-roxo");
  } else if (totalMesValor >= 5000) {
    cardsConquista[1].classList.add("raro-azul");
  } else {
    cardsConquista[1].classList.add("raro-verde");
  }

}

// 🚗 Corridas
if (cardsConquista[2]) {

  if (corridasMes >= 600) {
    cardsConquista[2].classList.add("raro-dourado");
  } else if (corridasMes >= 500) {
    cardsConquista[2].classList.add("raro-roxo");
  } else if (corridasMes >= 250) {
    cardsConquista[2].classList.add("raro-azul");
  } else {
    cardsConquista[2].classList.add("raro-verde");
  }

}

// 🎯 Meta
if (cardsConquista[3]) {

  if (progressoMeta >= 120) {
    cardsConquista[3].classList.add("raro-dourado");
  } else if (progressoMeta >= 100) {
    cardsConquista[3].classList.add("raro-roxo");
  } else if (progressoMeta >= 75) {
    cardsConquista[3].classList.add("raro-azul");
  } else {
    cardsConquista[3].classList.add("raro-verde");
  }

}
if (barraMetaHome) barraMetaHome.style.width = `${progressoMeta}%`;
if (metaHomeValor) metaHomeValor.innerText = formatarMoeda(metaSemanal);
if (metaHomePorcentagem) metaHomePorcentagem.innerText = `${progressoMeta}%`;

if (totalUberEl) totalUberEl.innerText = formatarMoeda(totalUber);
if (total99El) total99El.innerText = formatarMoeda(total99);
if (totalParticularEl) totalParticularEl.innerText = formatarMoeda(totalParticular);
let porcentagemUber = totalSemanaValor > 0
  ? Math.round((totalUber / totalSemanaValor) * 100)
  : 0;

let porcentagem99 = totalSemanaValor > 0
  ? Math.round((total99 / totalSemanaValor) * 100)
  : 0;

let porcentagemParticular = totalSemanaValor > 0
  ? Math.round((totalParticular / totalSemanaValor) * 100)
  : 0;

if (porcentagemUberEl) {
  porcentagemUberEl.innerText = `${porcentagemUber}% do total`;
}

if (porcentagem99El) {
  porcentagem99El.innerText = `${porcentagem99}% do total`;
}

if (porcentagemParticularEl) {
  porcentagemParticularEl.innerText = `${porcentagemParticular}% do total`;
}
}

function obterRankingParaGrafico() {
  return ranking;
}

  function atualizarGrafico() {
  let canvas = document.getElementById("grafico");

  if (!canvas) return;

  let dadosGrafico = obterRankingParaGrafico();

  let total = dadosGrafico.reduce(
    (soma, item) => soma + item.valor,
    0
  );

  let dadosPizza;

  if (usuarioEhAdmin()) {

    dadosPizza = dadosGrafico.map(
      m => m.valor
    );

  } else {

    dadosPizza = dadosGrafico.map(
      m => Math.round((m.valor / total) * 100)
    );

  }

  if (grafico) {
    grafico.destroy();
  }

 grafico = new Chart(canvas.getContext("2d"), {
  type: "doughnut",

  data: {
    labels: dadosGrafico.map(m => m.nome),

    datasets: [{
      data: dadosPizza,
      backgroundColor: [
        "#2563eb",
        "#dc2626",
        "#16a34a",
        "#facc15",
        "#9333ea",
        "#f97316",
        "#06b6d4",
        "#ec4899",
        "#111827",
        "#84cc16"
      ]
    }]
  },

  options: {
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {

            if (usuarioEhAdmin()) {
              return `${context.label}: ${formatarMoeda(context.raw)}`;
            }

            return `${context.label}: ${context.raw}%`;
          }
        }
      }
    }
  }
});
}

function atualizarInsightSemana() {
  if (!usuarioAtual) return;

  let melhorDiaEl = document.getElementById("insightMelhorDia");
  let valorEl = document.getElementById("insightValor");
  let corridasEl = document.getElementById("insightCorridas");
  let msgEl = document.querySelector(".insight-msg");

  if (!melhorDiaEl || !valorEl || !corridasEl) return;

  let minhasSemana = corridasFirebase.filter(item =>
    (
      item.uid === usuarioAtual.uid ||
      item.email === usuarioAtual.email
    ) &&
    estaNaSemanaAtual(item.data)
  );

  let mapaDias = {};
  let totalSemana = 0;

  minhasSemana.forEach(item => {
    if (!item.data) return;

    if (!mapaDias[item.data]) {
      mapaDias[item.data] = {
        valor: 0,
        corridas: 0
      };
    }

    mapaDias[item.data].valor += Number(item.valor || 0);
    mapaDias[item.data].corridas += Number(item.corridas || 0);

    totalSemana += Number(item.valor || 0);
  });

  let melhorData = null;

  Object.keys(mapaDias).forEach(data => {
    if (
      !melhorData ||
      mapaDias[data].valor > mapaDias[melhorData].valor
    ) {
      melhorData = data;
    }
  });

  if (!melhorData) {
    melhorDiaEl.innerText = "--";
    valorEl.innerText = formatarMoeda(0);
    corridasEl.innerText = 0;

    if (msgEl) {
      msgEl.innerText = "🚀 Continue nesse ritmo!";
    }

    return;
  }

  let dadosMelhorDia = mapaDias[melhorData];

  melhorDiaEl.innerText = formatarData(melhorData);
  valorEl.innerText = formatarMoeda(dadosMelhorDia.valor);
  corridasEl.innerText = dadosMelhorDia.corridas;

  let percentual = totalSemana > 0
    ? Math.round((dadosMelhorDia.valor / totalSemana) * 100)
    : 0;

  if (msgEl) {
    msgEl.innerText =
      `🚀 Seu melhor dia representou ${percentual}% da semana.`;
  }
}
function atualizarGraficoLinha() {
  let canvas = document.getElementById("graficoLinha");

  if (!canvas) return;

  let dadosGrafico = obterRankingParaGrafico();
  let totais = {};

  dadosGrafico.forEach(motorista => {
    motorista.historico.forEach(item => {
      if (!totais[item.data]) {
        totais[item.data] = 0;
      }

      totais[item.data] += Number(item.valor);
    });
  });

  let datas = Object.keys(totais).sort();
  let valores = datas.map(data => totais[data]);

  if (graficoLinha) {
    graficoLinha.destroy();
  }

  graficoLinha = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: datas,
      datasets: [{
        label: usuarioEhAdmin()
          ? "Evolução geral"
          : "Minha evolução",
        data: valores,
        borderColor: "#ff7a18",
        backgroundColor: "rgba(255,122,24,0.2)",
        fill: true,
        tension: 0.3
      }]
    }
  });
}

function limparCampos() {
  document.getElementById("nome").value = "";
  document.getElementById("valor").value = "";
  document.getElementById("corridas").value = "";
  document.getElementById("data").value = "";
  let botaoSalvarCorrida =
  document.getElementById("botaoSalvarCorrida");

if (botaoSalvarCorrida) {
  botaoSalvarCorrida.innerText =
    "Adicionar corrida";
}
}

async function resetSemana() {
  if (!usuarioEhAdmin()) {
    alert("Apenas admin pode resetar os dados.");
    return;
  }

  let confirmar = confirm(
    "⚠️ Atenção: isso vai apagar TODAS as corridas do sistema. Deseja continuar?"
  );

  if (!confirmar) return;

  let texto = prompt(
    "Para confirmar, digite APAGAR em letras maiúsculas:"
  );

  if (texto !== "APAGAR") {
    alert("Reset cancelado.");
    return;
  }

  try {
    let documentos = await getDocs(collection(db, "corridas"));

    for (let documento of documentos.docs) {
      await deleteDoc(documento.ref);
    }

    ranking = [];
    corridasFirebase = [];

    atualizarTudo();

    alert("🔥 Corridas apagadas com segurança!");
  } catch (erro) {
    console.error(erro);
    alert("Erro ao apagar");
  }
}

async function excluirConta(id, email) {
  if (!confirm("Tem certeza que deseja excluir esta conta e todas as corridas dela?")) {
    return;
  }

  try {
    let corridasSnap = await getDocs(collection(db, "corridas"));

    for (let documento of corridasSnap.docs) {
      let corrida = documento.data();

      if (corrida.email === email) {
        await deleteDoc(documento.ref);
      }
    }

    await deleteDoc(doc(db, "usuarios", id));

    alert("Conta excluída com sucesso!");

    atualizarAdmin();
    atualizarRankingMetas();
  } catch (erro) {
    console.error(erro);
    alert("Erro ao excluir conta");
  }
}
async function baixarBackup() {
  if (!usuarioEhAdmin()) {
    alert("Apenas admin pode baixar backup.");
    return;
  }

  try {
    let usuariosSnap = await getDocs(collection(db, "usuarios"));
    let corridasSnap = await getDocs(collection(db, "corridas"));

    let usuarios = [];
    let corridas = [];

    usuariosSnap.forEach(docSnap => {
      usuarios.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    corridasSnap.forEach(docSnap => {
      corridas.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    let backup = {
      app: "Desafio Semanal",
      tipo: "backup-completo",
      versao: "1.0",
      dataBackup: new Date().toISOString(),
      usuarios,
      corridas
    };

    let arquivo = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    let url = URL.createObjectURL(arquivo);

    let link = document.createElement("a");
    link.href = url;
    link.download = `backup-desafio-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);

    alert("✅ Backup baixado com sucesso!");
  } catch (erro) {
    console.error(erro);
    alert("Erro ao baixar backup.");
  }
}
function atualizarHistoricoMensalCards() {
  let totalAcumuladoResumo =
  document.getElementById("totalAcumuladoResumo");
  let container = document.getElementById("historicoMensalCards");

  let melhorSemanaResumo = document.getElementById("melhorSemanaResumo");
  let melhorMesResumo = document.getElementById("melhorMesResumo");
  let totalMesesResumo = document.getElementById("totalMesesResumo");
  let graficoTotalAcumulado = document.getElementById("graficoTotalAcumulado");
let graficoMelhorSemana = document.getElementById("graficoMelhorSemana");
let graficoMelhorMes = document.getElementById("graficoMelhorMes");

  if (!container || !usuarioAtual) return;

  container.innerHTML = "";

  let nomesMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril",
    "Maio", "Junho", "Julho", "Agosto",
    "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  let meses = {};
  let semanas = {};
  let totalAcumulado = 0;

  corridasFirebase.forEach(item => {
    if (
      item.uid !== usuarioAtual.uid &&
      item.email !== usuarioAtual.email
    ) return;

    if (!item.data) return;

    let data = new Date(item.data + "T00:00:00");

    let chaveMes =
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    if (!meses[chaveMes]) {
      meses[chaveMes] = {
        total: 0,
        corridas: 0
      };
    }

    meses[chaveMes].total += Number(item.valor || 0);
    meses[chaveMes].corridas += Number(item.corridas || 0);
    totalAcumulado += Number(item.valor || 0);

    let inicioSemana = obterInicioSemana(data);
    let chaveSemana = inicioSemana.toISOString().slice(0, 10);

    if (!semanas[chaveSemana]) {
      semanas[chaveSemana] = {
        total: 0,
        corridas: 0
      };
    }

    semanas[chaveSemana].total += Number(item.valor || 0);
    semanas[chaveSemana].corridas += Number(item.corridas || 0);
  });

  let lista = Object.entries(meses);

  lista.sort((a, b) => b[0].localeCompare(a[0]));

  if (lista.length === 0) {
    container.innerHTML = `
      <div class="card">
        Nenhum histórico encontrado.
      </div>
    `;

    if (melhorSemanaResumo) melhorSemanaResumo.innerText = formatarMoeda(0);
    if (melhorMesResumo) melhorMesResumo.innerText = formatarMoeda(0);
    if (totalMesesResumo) totalMesesResumo.innerText = 0;

    return;
  }

  let melhorMes = lista.reduce((maior, atual) => {
    return atual[1].total > maior[1].total ? atual : maior;
  }, lista[0]);

  let listaSemanas = Object.entries(semanas);

  let melhorSemana = listaSemanas.reduce((maior, atual) => {
    return atual[1].total > maior[1].total ? atual : maior;
  }, listaSemanas[0]);

  if (melhorMesResumo) {
    melhorMesResumo.innerText = formatarMoeda(melhorMes[1].total);
  }

  if (melhorSemanaResumo) {
    melhorSemanaResumo.innerText = formatarMoeda(melhorSemana[1].total);
  }

  if (totalMesesResumo) {
    totalMesesResumo.innerText = lista.length;
  }
  if (totalAcumuladoResumo) {
  totalAcumuladoResumo.innerText =
    formatarMoeda(totalAcumulado);
}
if (graficoTotalAcumulado) {
  graficoTotalAcumulado.innerText = formatarMoeda(totalAcumulado);
}

if (graficoMelhorSemana) {
  graficoMelhorSemana.innerText = formatarMoeda(melhorSemana[1].total);
}

if (graficoMelhorMes) {
  graficoMelhorMes.innerText = formatarMoeda(melhorMes[1].total);
}

  lista.forEach(([mes, dados]) => {
    let icone = "📅";

    let [ano, mesNumero] = mes.split("-");
    let nomeMes =
      nomesMeses[parseInt(mesNumero) - 1] + " " + ano;

    let media =
      dados.corridas > 0
        ? dados.total / dados.corridas
        : 0;

    container.innerHTML += `
      <div class="card card-mes-v2">

        <div class="mes-topo">
          <h3>${icone} ${nomeMes}</h3>
        </div>

        <div class="mes-total">
          ${formatarMoeda(dados.total)}
        </div>

        <div class="mes-info">
          🚗 ${dados.corridas} corridas
        </div>

        <div class="mes-info">
          📈 Média ${formatarMoeda(media)}
        </div>

      </div>
    `;
  });
}
function obterInicioSemana(dataBase) {
  let data = new Date(dataBase);
  let diaSemana = data.getDay();

  let diferenca = diaSemana === 0 ? -6 : 1 - diaSemana;

  data.setDate(data.getDate() + diferenca);
  data.setHours(0, 0, 0, 0);

  return data;
}




function atualizarComparativoSemanal() {
  let card = document.getElementById("comparativoSemanalCard");

  if (!card || !usuarioAtual) return;

  let hoje = new Date();

  let inicioSemanaAtual =
  obterInicioSemana(hoje);

  let inicioSemanaPassada = new Date(inicioSemanaAtual);
  inicioSemanaPassada.setDate(inicioSemanaAtual.getDate() - 7);

  let fimSemanaPassada = new Date(inicioSemanaAtual);

  let totalAtual = 0;
  let totalPassada = 0;

  corridasFirebase.forEach(item => {
    if (
      item.uid !== usuarioAtual.uid &&
      item.email !== usuarioAtual.email
    ) return;

    if (!item.data) return;

    let data = new Date(item.data + "T00:00:00");

    if (data >= inicioSemanaAtual) {
      totalAtual += Number(item.valor || 0);
    } else if (
      data >= inicioSemanaPassada &&
      data < fimSemanaPassada
    ) {
      totalPassada += Number(item.valor || 0);
    }
  });

  let percentual = 0;

  if (totalPassada > 0) {
    percentual = ((totalAtual - totalPassada) / totalPassada) * 100;
  }

  let emoji = percentual >= 0 ? "🔥" : "📉";
  let sinal = percentual >= 0 ? "+" : "";

  card.innerHTML = `
    <div class="card destaque-home">
      <small>Comparação Semanal</small>

      <h2>${emoji} ${sinal}${percentual.toFixed(1)}%</h2>

      <p>Semana atual: ${formatarMoeda(totalAtual)}</p>

      <p>Semana passada: ${formatarMoeda(totalPassada)}</p>
    </div>
  `;
}

function pesquisarSemanaHistorico() {
  let input = document.getElementById("dataPesquisaSemana");
  let resultado = document.getElementById("resultadoSemanaHistorico");

  if (!input || !resultado || !usuarioAtual) return;

  let dataEscolhida = input.value;

  if (!dataEscolhida) {
    alert("Escolha uma data");
    return;
  }

  let inicioSemana = obterInicioSemana(
    new Date(dataEscolhida + "T00:00:00")
  );

  let fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);
  fimSemana.setHours(23, 59, 59, 999);

  let corridasSemana = corridasFirebase.filter(item => {
    if (!item.data) return false;

    let dataCorrida = new Date(item.data + "T00:00:00");

    return (
      (
        item.uid === usuarioAtual.uid ||
        item.email === usuarioAtual.email
      ) &&
      dataCorrida >= inicioSemana &&
      dataCorrida <= fimSemana
    );
  });

  let total = corridasSemana.reduce(
    (soma, item) => soma + Number(item.valor || 0),
    0
  );

  let corridas = corridasSemana.reduce(
    (soma, item) => soma + Number(item.corridas || 0),
    0
  );

  let diasTrabalhados = new Set(
    corridasSemana.map(item => item.data)
  ).size;

  let mediaCorrida = corridas > 0 ? total / corridas : 0;

  resultado.innerHTML = `
    <div class="card destaque-home">
      <small>Semana pesquisada</small>

      <h2>${formatarMoeda(total)}</h2>

      <p>
        ${formatarData(inicioSemana.toISOString().slice(0, 10))}
        até
        ${formatarData(fimSemana.toISOString().slice(0, 10))}
      </p>

      <p>🚗 Corridas: ${corridas}</p>
      <p>📆 Dias trabalhados: ${diasTrabalhados}</p>
      <p>📈 Média por corrida: ${formatarMoeda(mediaCorrida)}</p>
    </div>
  `;

  if (corridasSemana.length === 0) {
    resultado.innerHTML += `
      <div class="card">
        Nenhuma corrida encontrada nessa semana.
      </div>
    `;

    return;
  }

  corridasSemana.sort((a, b) => new Date(b.data) - new Date(a.data));

  corridasSemana.forEach(item => {
    resultado.innerHTML += `
      <div class="card">
        <h3>🚗 ${item.nome}</h3>

        <p>📅 ${formatarData(item.data)}</p>
        <p>💰 ${formatarMoeda(item.valor)}</p>
        <p>🛣️ ${item.corridas || 0} corridas</p>
        <p>🏷️ ${item.origem || "Sem origem"}</p>
      </div>
    `;
  });
}

function atualizarMetaInteligente() {

  let valorEl =
    document.getElementById("metaInteligenteValor");

  let textoEl =
    document.getElementById("metaInteligenteTexto");

  if (!valorEl || !textoEl) return;

  let hoje = new Date();
  let limite = new Date();

  limite.setDate(hoje.getDate() - 30);

  let total30Dias = 0;
  let quantidade = 0;

  corridasFirebase.forEach(item => {

    if (!item.data) return;

    let dataCorrida =
      new Date(item.data + "T00:00:00");

    if (
      dataCorrida >= limite &&
      dataCorrida <= hoje
    ) {
      total30Dias += Number(item.valor || 0);
      quantidade++;
    }

  });

 let mediaDiaria = total30Dias / 30;

let mediaSemanal =
  mediaDiaria * 7;

let metaConservadora =
  mediaSemanal;

let metaRecomendada =
  mediaSemanal * 1.10;

let metaDesafio =
  mediaSemanal * 1.20;

metaConservadoraAtual =
  Math.round(metaConservadora);

metaRecomendadaAtual =
  Math.round(metaRecomendada);

metaDesafioAtual =
  Math.round(metaDesafio);

valorEl.innerText =
  "Escolha sua meta:";

textoEl.innerHTML = `
  🟢 Conservadora:
  <strong>${formatarMoeda(metaConservadora)}</strong>
  <br><br>

  🟡 Recomendada:
  <strong>${formatarMoeda(metaRecomendada)}</strong>
  <br><br>

  🔴 Desafio:
  <strong>${formatarMoeda(metaDesafio)}</strong>
`;

}

function usarMetaRecomendada() {

  if (!metaRecomendadaAtual) {
    alert("Nenhuma meta recomendada disponível.");
    return;
  }

  let campoMeta =
    document.getElementById("metaSemanal");

  if (campoMeta) {
    campoMeta.value =
      metaRecomendadaAtual;
  }

  alert("🎯 Meta recomendada aplicada!");
}
function usarMetaConservadora() {

  if (!metaConservadoraAtual) {
    alert("Nenhuma meta conservadora disponível.");
    return;
  }

  let campoMeta =
    document.getElementById("metaSemanal");

  if (campoMeta) {
    campoMeta.value =
      metaConservadoraAtual;
  }

  alert("🟢 Meta conservadora aplicada!");
}
function usarMetaDesafio() {

  if (!metaDesafioAtual) {
    alert("Nenhuma meta desafio disponível.");
    return;
  }

  let campoMeta =
    document.getElementById("metaSemanal");

  if (campoMeta) {
    campoMeta.value =
      metaDesafioAtual;
  }

  alert("🔴 Meta desafio aplicada!");
}

window.entrar = entrar;
window.cadastrar = cadastrar;
window.sair = sair;
window.adicionar = adicionar;
window.abrirTela = abrirTela;
window.resetSemana = resetSemana;
window.excluirCorrida = excluirCorrida;
window.editarCorrida = editarCorrida;
window.aprovarUsuario = aprovarUsuario;
window.bloquearUsuario = bloquearUsuario;
window.tornarAdmin = tornarAdmin;
window.salvarMeta = salvarMeta;
window.excluirConta = excluirConta;
window.removerAdmin = removerAdmin;
window.baixarBackup = baixarBackup;
window.pesquisarSemanaHistorico = pesquisarSemanaHistorico;
window.usarMetaRecomendada = usarMetaRecomendada;
window.usarMetaConservadora =usarMetaConservadora;
window.usarMetaDesafio =usarMetaDesafio;