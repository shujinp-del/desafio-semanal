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
let grafico;
let graficoLinha;
let editandoId = null;
let pararSincronia = null;

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
    let credencial = await createUserWithEmailAndPassword(auth, email, senha);

    await setDoc(doc(db, "usuarios", credencial.user.uid), {
      email,
      status: "pendente",
      papel: "motorista",
      criadoEm: serverTimestamp()
    });

    alert("Conta criada! Aguarde aprovação do administrador.");
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
  let botaoAdmin = document.getElementById("botaoAdmin");
  let usuarioLogado = document.getElementById("usuarioLogado");

  if (pararSincronia) {
    pararSincronia();
    pararSincronia = null;
  }

  if (!usuario) {
    if (menu) menu.style.display = "none";
    if (botaoAdmin) botaoAdmin.style.display = "none";
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
      criadoEm: serverTimestamp()
    });

    dadosUsuario = {
      email: usuario.email,
      status: "pendente",
      papel: "motorista"
    };
  } else {
    dadosUsuario = usuarioSnap.data();
  }

  if (dadosUsuario.status !== "ativo" && dadosUsuario.status !== "admin") {
    if (menu) menu.style.display = "none";
    if (botaoAdmin) botaoAdmin.style.display = "none";

    mostrarStatusLogin("⏳ Sua conta está aguardando aprovação.");
    abrirTela("loginTela");
    return;
  }

  if (menu) menu.style.display = "flex";

  if (botaoAdmin) {
    botaoAdmin.style.display =
      dadosUsuario.papel === "admin" || dadosUsuario.status === "admin"
        ? "block"
        : "none";
  }

  if (usuarioLogado) {
    usuarioLogado.innerText = `Logado como: ${usuario.email}`;
  }

  mostrarStatusLogin("");
  abrirTela("home");
  iniciarSincronia();
});

function iniciarSincronia() {
  pararSincronia = onSnapshot(collection(db, "corridas"), snapshot => {
    let todasCorridas = [];
    let corridasSemana = [];

    snapshot.forEach(docSnap => {
      let item = docSnap.data();

      let corrida = {
        id: docSnap.id,
        ...item
      };

      if (corrida.nome && corrida.valor && corrida.data) {
        todasCorridas.push(corrida);

        if (estaNaSemanaAtual(corrida.data)) {
          corridasSemana.push(corrida);
        }
      }
    });

    corridasFirebase = todasCorridas;
    ranking = montarRanking(corridasSemana);

    atualizarTudo();

    console.log("🔥 Dados sincronizados");
  });
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
      dia: item.dia || descobrirDiaSemana(item.data),
      data: item.data,
      valor: Number(item.valor),
      corridas: Number(item.corridas || 0)
    });
  });

  let lista = Object.values(mapa);
  lista.sort((a, b) => b.valor - a.valor);

  return lista;
}

async function adicionar() {
  if (!usuarioAtual) {
    alert("Faça login primeiro");
    return;
  }

  if (!dadosUsuario || (dadosUsuario.status !== "ativo" && dadosUsuario.status !== "admin")) {
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

  let dia = descobrirDiaSemana(data);

  try {
    if (editandoId) {
      await updateDoc(doc(db, "corridas", editandoId), {
        nome,
        valor,
        corridas,
        data,
        dia,
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
        dia,
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

async function atualizarAdmin() {
  let lista = document.getElementById("listaAdminUsuarios");

  if (!lista) return;

  if (!dadosUsuario || dadosUsuario.papel !== "admin") {
    lista.innerHTML = "<li>Acesso restrito a administradores.</li>";
    return;
  }

  lista.innerHTML = "";

  let usuariosSnap = await getDocs(collection(db, "usuarios"));

  usuariosSnap.forEach(docSnap => {
    let usuario = docSnap.data();
    let id = docSnap.id;

    lista.innerHTML += `
      <li>
        <div class="posicao">
          👤 ${usuario.email || "sem email"}
        </div>

        <br>

        <div>
          Status: <strong>${usuario.status}</strong>
        </div>

        <div>
          Papel: <strong>${usuario.papel}</strong>
        </div>

        <br>

        <button onclick="aprovarUsuario('${id}')">
          ✅ Aprovar
        </button>

        <button onclick="bloquearUsuario('${id}')">
          🚫 Bloquear
        </button>

        <button onclick="tornarAdmin('${id}')">
          👑 Tornar admin
        </button>
      </li>
    `;
  });
}

async function aprovarUsuario(id) {
  await updateDoc(doc(db, "usuarios", id), {
    status: "ativo"
  });

  alert("Usuário aprovado!");
  atualizarAdmin();
}

async function bloquearUsuario(id) {
  await updateDoc(doc(db, "usuarios", id), {
    status: "bloqueado"
  });

  alert("Usuário bloqueado!");
  atualizarAdmin();
}

async function tornarAdmin(id) {
  await updateDoc(doc(db, "usuarios", id), {
    status: "ativo",
    papel: "admin"
  });

  alert("Usuário virou admin!");
  atualizarAdmin();
}

function descobrirDiaSemana(data) {
  let dias = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado"
  ];

  let dataObj = new Date(data + "T00:00:00");
  return dias[dataObj.getDay()];
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

function abrirTela(id) {
  document.querySelectorAll(".tela").forEach(tela => {
    tela.classList.remove("ativa");
  });

  let tela = document.getElementById(id);

  if (tela) {
    tela.classList.add("ativa");
  }

  if (id === "graficoTela") {
    atualizarGrafico();
    atualizarGraficoLinha();
  }

  if (id === "historicoTela") {
    atualizarHistoricoMensal();
  }

  if (id === "minhasTela") {
    atualizarMinhasCorridas();
  }

  if (id === "adminTela") {
    atualizarAdmin();
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
}

function atualizarRanking() {
  let lista = document.getElementById("ranking");

  if (!lista) return;

  lista.innerHTML = "";

  ranking.forEach((m, index) => {
    let medalha = `${index + 1}º`;

    if (index === 0) medalha = "🥇";
    if (index === 1) medalha = "🥈";
    if (index === 2) medalha = "🥉";

    lista.innerHTML += `
      <li>
        <div class="posicao">${medalha} ${m.nome}</div>
        <br>
        <div class="valor">💰 R$ ${m.valor}</div>
        <div>🚗 ${m.corridas} corridas</div>
      </li>
    `;
  });
}

function atualizarMinhasCorridas() {
  let lista = document.getElementById("listaMinhas");
  let totalEl = document.getElementById("meuTotal");

  if (!lista || !totalEl || !usuarioAtual) return;

  lista.innerHTML = "";

  let minhas = corridasFirebase.filter(item => item.uid === usuarioAtual.uid);

  let total = minhas.reduce((soma, item) => soma + Number(item.valor), 0);

  minhas.sort((a, b) => new Date(b.data) - new Date(a.data));

  minhas.forEach(item => {
    lista.innerHTML += `
      <li>
        <div class="posicao">🚗 ${item.nome}</div>
        <br>
        <div class="valor">💰 R$ ${item.valor}</div>
        <div>📅 ${formatarData(item.data)}</div>
        <div>🛣️ ${item.corridas || 0} corridas</div>
        <br>
        <button onclick="editarCorrida('${item.id}')">✏️ Editar</button>
        <button onclick="excluirCorrida('${item.id}')">🗑️ Excluir</button>
      </li>
    `;
  });

  totalEl.innerText = `R$ ${total}`;
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

    return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
  });

  corridasMes.sort((a, b) => new Date(b.data) - new Date(a.data));

  corridasMes.forEach(item => {
    total += Number(item.valor);

    lista.innerHTML += `
      <li>
        <div class="posicao">🚗 ${item.nome}</div>
        <br>
        <div class="valor">💰 R$ ${item.valor}</div>
        <div>📅 ${formatarData(item.data)}</div>
        <div>🛣️ ${item.corridas || 0} corridas</div>
        <br>
        <button onclick="editarCorrida('${item.id}')">✏️ Editar</button>
        <button onclick="excluirCorrida('${item.id}')">🗑️ Excluir</button>
      </li>
    `;
  });

  totalEl.innerText = `R$ ${total}`;
}

function atualizarLider() {
  let lider = document.getElementById("liderSemana");

  if (!lider) return;

  if (ranking.length === 0) {
    lider.innerHTML = "";
    return;
  }

  let top = ranking[0];

  lider.innerHTML = `
    <div class="lider-card">
      🏆 LÍDER
      <h2>${top.nome}</h2>
      <strong>R$ ${top.valor}</strong>
      <br><br>
      🚗 ${top.corridas} corridas
    </div>
  `;
}

function atualizarMetricas() {
  let total = ranking.reduce((soma, m) => soma + Number(m.valor), 0);
  let corridas = ranking.reduce((soma, m) => soma + Number(m.corridas), 0);

  let homeTotal = document.getElementById("homeTotal");
  let homeMensal = document.getElementById("homeMensal");
  let totalSemana = document.getElementById("totalSemana");
  let totalCorridas = document.getElementById("totalCorridas");

  if (homeTotal) homeTotal.innerText = `R$ ${total}`;
  if (homeMensal) homeMensal.innerText = `R$ ${total}`;
  if (totalSemana) totalSemana.innerText = `R$ ${total}`;
  if (totalCorridas) totalCorridas.innerText = corridas;
}

function atualizarGrafico() {
  let canvas = document.getElementById("grafico");

  if (!canvas) return;

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: ranking.map(m => m.nome),
      datasets: [{
        data: ranking.map(m => m.valor),
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
    }
  });
}

function atualizarGraficoLinha() {
  let canvas = document.getElementById("graficoLinha");

  if (!canvas) return;

  let totais = {};

  ranking.forEach(motorista => {
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
        label: "Evolução",
        data: valores,
        borderColor: "#ff7a18",
        backgroundColor: "rgba(255,122,24,0.2)",
        fill: true,
        tension: 0.3
      }]
    }
  });
}

function formatarData(data) {
  if (!data) return "sem data";

  let partes = data.split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function limparCampos() {
  document.getElementById("nome").value = "";
  document.getElementById("valor").value = "";
  document.getElementById("corridas").value = "";
  document.getElementById("data").value = "";
}

async function resetSemana() {
  if (!confirm("Deseja apagar TODAS as corridas?")) return;

  try {
    let documentos = await getDocs(collection(db, "corridas"));

    documentos.forEach(async documento => {
      await deleteDoc(documento.ref);
    });

    ranking = [];
    corridasFirebase = [];

    atualizarTudo();

    alert("🔥 Corridas apagadas!");
  } catch (erro) {
    console.error(erro);
    alert("Erro ao apagar");
  }
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