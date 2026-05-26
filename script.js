import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBrfxwL7BCUQSInVnP7Mx4jnmhNFazABfE",
  authDomain: "desafio-semanal.firebaseapp.com",
  projectId: "desafio-semanal",
  storageBucket: "desafio-semanal.firebasestorage.app",
  messagingSenderId: "948247090731",
  appId: "1:948247090731:web:fb36df17768ce636f07c6e"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

console.log("🔥 Firebase conectado!");



let ranking = JSON.parse(
  localStorage.getItem("ranking")
) || [];

let grafico;
let graficoLinha;



function salvar() {

  localStorage.setItem(
    "ranking",
    JSON.stringify(ranking)
  );
}



function abrirTela(id) {

  document.querySelectorAll(".tela").forEach(tela => {
    tela.classList.remove("ativa");
  });

  const tela = document.getElementById(id);

  if (tela) {
    tela.classList.add("ativa");
  }

  if (id === "graficoTela") {

    atualizarGrafico();

    atualizarGraficoLinha();
  }
}



async function adicionar() {

  const nome = document.getElementById("nome").value.trim();

  const valor = Number(
    document.getElementById("valor").value
  );

  const corridas = Number(
    document.getElementById("corridas").value
  );

  const data = document.getElementById("data").value;

  if (!nome || valor <= 0 || !data) {

    alert("Preencha os campos");

    return;
  }

  const dia = new Date(data).toLocaleDateString(
    "pt-BR"
  );

  ranking.push({
    nome,
    valor,
    corridas,
    data,
    dia
  });

  salvar();

  try {

    await addDoc(
      collection(db, "corridas"),
      {
        nome: nome,
        valor: valor,
        corridas: corridas,
        data: data,
        dia: dia,
        criadoEm: new Date().toISOString()
      }
    );

    console.log("🔥 Corrida salva Firebase");

  } catch (erro) {

    console.error("Erro Firebase:", erro);

    alert("Erro ao salvar Firebase");
  }

  atualizarTudo();

  limparCampos();
}



function atualizarTudo() {

  let totalSemana = 0;
  let totalMensal = 0;
  let totalCorridas = 0;

  ranking.forEach(item => {

    totalSemana += Number(item.valor);

    totalMensal += Number(item.valor);

    totalCorridas += Number(item.corridas);
  });

  const homeTotal =
    document.getElementById("homeTotal");

  const homeMensal =
    document.getElementById("homeMensal");

  const totalSemanaEl =
    document.getElementById("totalSemana");

  const totalMensalEl =
    document.getElementById("totalMensal");

  const totalCorridasEl =
    document.getElementById("totalCorridas");

  if (homeTotal) {
    homeTotal.innerText = "R$ " + totalSemana;
  }

  if (homeMensal) {
    homeMensal.innerText = "R$ " + totalMensal;
  }

  if (totalSemanaEl) {
    totalSemanaEl.innerText = "R$ " + totalSemana;
  }

  if (totalMensalEl) {
    totalMensalEl.innerText = "R$ " + totalMensal;
  }

  if (totalCorridasEl) {
    totalCorridasEl.innerText = totalCorridas;
  }

  atualizarRanking();

  atualizarLider();

  atualizarGrafico();

  atualizarGraficoLinha();
}



function atualizarRanking() {

  const lista =
    document.getElementById("ranking");

  if (!lista) return;

  lista.innerHTML = "";

  ranking
    .sort((a, b) => b.valor - a.valor)
    .forEach((item, index) => {

      let medalha = `${index + 1}º`;

      if (index === 0) medalha = "🥇";
      if (index === 1) medalha = "🥈";
      if (index === 2) medalha = "🥉";

      lista.innerHTML += `
        <li>

          <div class="posicao">
            ${medalha} ${item.nome}
          </div>

          <br>

          <div class="valor">
            💰 R$ ${item.valor}
          </div>

          <div>
            🚗 ${item.corridas} corridas
          </div>

        </li>
      `;
    });
}



function atualizarLider() {

  const lider =
    document.getElementById("liderSemana");

  if (!lider) return;

  if (ranking.length === 0) {

    lider.innerHTML = "";

    return;
  }

  const top =
    ranking.sort((a, b) => b.valor - a.valor)[0];

  lider.innerHTML = `
    <div class="lider-card">

      🏆 LÍDER

      <h2>${top.nome}</h2>

      <strong>
        R$ ${top.valor}
      </strong>

      <br><br>

      🚗 ${top.corridas} corridas

    </div>
  `;
}



function atualizarGrafico() {

  const canvas =
    document.getElementById("grafico");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(ctx, {

    type: "doughnut",

    data: {

      labels: ranking.map(r => r.nome),

      datasets: [{

        data: ranking.map(r => r.valor),

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

  const canvas =
    document.getElementById("graficoLinha");

  if (!canvas) return;

  const totais = {};

  ranking.forEach(item => {

    if (!totais[item.data]) {
      totais[item.data] = 0;
    }

    totais[item.data] += Number(item.valor);
  });

  const datas =
    Object.keys(totais).sort();

  const valores =
    datas.map(d => totais[d]);

  if (graficoLinha) {
    graficoLinha.destroy();
  }

  graficoLinha = new Chart(
    canvas.getContext("2d"),
    {

      type: "line",

      data: {

        labels: datas,

        datasets: [{

          label: "Evolução",

          data: valores,

          borderColor: "#ff7a18",

          backgroundColor:
            "rgba(255,122,24,0.2)",

          fill: true,

          tension: 0.3
        }]
      }
    }
  );
}



function limparCampos() {

  document.getElementById("nome").value = "";

  document.getElementById("valor").value = "";

  document.getElementById("corridas").value = "";

  document.getElementById("data").value = "";
}



function resetSemana() {

  if (!confirm("Deseja apagar tudo?")) {
    return;
  }

  ranking = [];

  salvar();

  atualizarTudo();
}



window.testarFirebase = async function () {

  try {

    await addDoc(
      collection(db, "corridas"),
      {
        teste: "firebase funcionando",
        criadoEm: new Date().toISOString()
      }
    );

    alert("🔥 Firebase funcionando!");

  } catch (erro) {

    console.error(erro);

    alert("❌ Erro Firebase");
  }
};


window.adicionar = adicionar
window.abrirTela = abrirTela
window.resetSemana = resetSemana

atualizarTudo()