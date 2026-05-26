import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  getDocs,
  deleteDoc
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

let ranking = [];
let corridasFirebase = [];

let grafico;
let graficoLinha;

function iniciarSincronia() {
  onSnapshot(collection(db, "corridas"), snapshot => {
    let todasCorridas = [];
    let corridasSemana = [];

    snapshot.forEach(doc => {
      let item = doc.data();

      if(item.nome && item.valor && item.data) {
        todasCorridas.push(item);

        if(estaNaSemanaAtual(item.data)) {
          corridasSemana.push(item);
        }
      }
    });

    corridasFirebase = todasCorridas;
    ranking = montarRanking(corridasSemana);

    salvarLocal();
    atualizarTudo();

    console.log("🔥 Dados sincronizados com Firebase");
  });
}

function montarRanking(corridas) {
  let mapa = {};

  corridas.forEach(item => {
    let chave = item.nome.toLowerCase();

    if(!mapa[chave]) {
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
  let nome = document.getElementById("nome").value.trim();
  let valor = Number(document.getElementById("valor").value);
  let corridas = Number(document.getElementById("corridas").value);
  let data = document.getElementById("data").value;

  if(!nome || valor <= 0 || !data) {
    alert("Preencha nome, valor e data");
    return;
  }

  let dia = descobrirDiaSemana(data);

  try {
    await addDoc(collection(db, "corridas"), {
      nome,
      valor,
      corridas,
      data,
      dia,
      criadoEm: new Date().toISOString()
    });

    limparCampos();

    console.log("🔥 Corrida salva no Firebase");

  } catch (erro) {
    console.error("Erro ao salvar:", erro);
    alert("Erro ao salvar no Firebase");
  }
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

  let diferenca = diaSemana === 0
    ? -6
    : 1 - diaSemana;

  inicioSemana.setDate(hoje.getDate() + diferenca);
  inicioSemana.setHours(0, 0, 0, 0);

  let fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);
  fimSemana.setHours(23, 59, 59, 999);

  let dataCorrida = new Date(data + "T00:00:00");

  return (
    dataCorrida >= inicioSemana &&
    dataCorrida <= fimSemana
  );
}

function abrirTela(id) {
  document.querySelectorAll(".tela").forEach(tela => {
    tela.classList.remove("ativa");
  });

  let tela = document.getElementById(id);

  if(tela) {
    tela.classList.add("ativa");
  }

  if(id === "graficoTela") {
    atualizarGrafico();
    atualizarGraficoLinha();
  }

  if(id === "historicoTela") {
    atualizarHistoricoMensal();
  }
}

function atualizarTudo() {
  atualizarRanking();
  atualizarLider();
  atualizarMetricas();
  atualizarGrafico();
  atualizarGraficoLinha();
  atualizarHistoricoMensal();
}

function atualizarRanking() {
  let lista = document.getElementById("ranking");

  if(!lista) return;

  lista.innerHTML = "";

  ranking.forEach((m, index) => {
    let medalha = `${index + 1}º`;

    if(index === 0) medalha = "🥇";
    if(index === 1) medalha = "🥈";
    if(index === 2) medalha = "🥉";

    lista.innerHTML += `
      <li>
        <div class="posicao">
          ${medalha} ${m.nome}
        </div>

        <br>

        <div class="valor">
          💰 R$ ${m.valor}
        </div>

        <div>
          🚗 ${m.corridas} corridas
        </div>
      </li>
    `;
  });
}

function atualizarHistoricoMensal() {
  let lista = document.getElementById("listaHistorico");
  let totalEl = document.getElementById("totalHistoricoMensal");

  if(!lista || !totalEl) return;

  lista.innerHTML = "";

  let total = 0;
  let hoje = new Date();
  let mesAtual = hoje.getMonth();
  let anoAtual = hoje.getFullYear();

  let corridasMes = corridasFirebase.filter(item => {
    if(!item.data) return false;

    let data = new Date(item.data + "T00:00:00");

    return (
      data.getMonth() === mesAtual &&
      data.getFullYear() === anoAtual
    );
  });

  corridasMes.sort((a, b) => {
    return new Date(b.data) - new Date(a.data);
  });

  corridasMes.forEach(item => {
    total += Number(item.valor);

    lista.innerHTML += `
      <li>
        <div class="posicao">
          🚗 ${item.nome}
        </div>

        <br>

        <div class="valor">
          💰 R$ ${item.valor}
        </div>

        <div>
          📅 ${formatarData(item.data)}
        </div>

        <div>
          🛣️ ${item.corridas || 0} corridas
        </div>
      </li>
    `;
  });

  totalEl.innerText = `R$ ${total}`;
}

function atualizarLider() {
  let lider = document.getElementById("liderSemana");

  if(!lider) return;

  if(ranking.length === 0) {
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
  let total = ranking.reduce(
    (soma, m) => soma + Number(m.valor),
    0
  );

  let corridas = ranking.reduce(
    (soma, m) => soma + Number(m.corridas),
    0
  );

  let homeTotal = document.getElementById("homeTotal");
  let homeMensal = document.getElementById("homeMensal");
  let totalSemana = document.getElementById("totalSemana");
  let totalCorridas = document.getElementById("totalCorridas");

  if(homeTotal) homeTotal.innerText = `R$ ${total}`;
  if(homeMensal) homeMensal.innerText = `R$ ${total}`;
  if(totalSemana) totalSemana.innerText = `R$ ${total}`;
  if(totalCorridas) totalCorridas.innerText = corridas;
}

function atualizarGrafico() {
  let canvas = document.getElementById("grafico");

  if(!canvas) return;

  if(grafico) {
    grafico.destroy();
  }

  grafico = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: ranking.map(m => m.nome),
      datasets: [{
        data: ranking.map(m => m.valor),
        backgroundColor: [
          "#ff7a18",
          "#ffb347",
          "#ffd166",
          "#22c55e",
          "#3b82f6",
          "#8b5cf6"
        ]
      }]
    }
  });
}

function atualizarGraficoLinha() {
  let canvas = document.getElementById("graficoLinha");

  if(!canvas) return;

  let totais = {};

  ranking.forEach(motorista => {
    motorista.historico.forEach(item => {
      if(!totais[item.data]) {
        totais[item.data] = 0;
      }

      totais[item.data] += Number(item.valor);
    });
  });

  let datas = Object.keys(totais).sort();
  let valores = datas.map(data => totais[data]);

  if(graficoLinha) {
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
  if(!data) return "sem data";

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
  if(!confirm("Deseja apagar TODAS as corridas do Firebase?")) {
    return;
  }

  try {
    let documentos = await getDocs(collection(db, "corridas"));

    documentos.forEach(async documento => {
      await deleteDoc(documento.ref);
    });

    ranking = [];
    corridasFirebase = [];

    salvarLocal();
    atualizarTudo();

    alert("🔥 Corridas apagadas!");

  } catch (erro) {
    console.error("Erro ao apagar:", erro);
    alert("Erro ao apagar corridas");
  }
}

function salvarLocal() {
  localStorage.setItem("ranking", JSON.stringify(ranking));
}

window.adicionar = adicionar;
window.abrirTela = abrirTela;
window.resetSemana = resetSemana;

iniciarSincronia();