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

let ranking = JSON.parse(localStorage.getItem("ranking")) || [];

let grafico;
let graficoLinha;



function salvar() {
  localStorage.setItem("ranking", JSON.stringify(ranking));
}



function abrirTela(id) {

  document.querySelectorAll(".tela").forEach(tela => {
    tela.classList.remove("ativa");
  });

  document.getElementById(id).classList.add("ativa");
}



async function adicionar() {

  const nome = document.getElementById("nome").value;

  const valor = Number(document.getElementById("valor").value);

  const corridas = Number(document.getElementById("corridas").value);

  const data = document.getElementById("data").value;

  if (!nome || !valor || !corridas || !data) {
    alert("Preencha todos os campos");
    return;
  }

  const dia = new Date(data).toLocaleDateString("pt-BR");

  ranking.push({
    nome,
    valor,
    corridas,
    data,
    dia
  });

  salvar();

  try {

    await addDoc(collection(db, "corridas"), {
      nome: nome,
      valor: valor,
      corridas: corridas,
      data: data,
      dia: dia,
      criadoEm: new Date().toISOString()
    });

    console.log("🔥 Corrida salva no Firebase!");

  } catch (erro) {

    console.error("Erro Firebase:", erro);

    alert("Erro ao salvar no Firebase");
  }

  atualizarTudo();

  document.getElementById("nome").value = "";
  document.getElementById("valor").value = "";
  document.getElementById("corridas").value = "";
  document.getElementById("data").value = "";
}



function atualizarTudo() {

  let totalSemana = 0;
  let totalMensal = 0;
  let totalCorridas = 0;

  ranking.forEach(item => {
    totalSemana += item.valor;
    totalMensal += item.valor;
    totalCorridas += item.corridas;
  });

  document.getElementById("homeTotal").innerText =
    "R$ " + totalSemana;

  let totalMensalEl = document.getElementById("totalMensal")

if (totalMensalEl) {
  totalMensalEl.innerText = "R$ " + totalMensal
}

  document.getElementById("totalSemana").innerText =
    "R$ " + totalSemana;

  document.getElementById("totalMensal").innerText =
    "R$ " + totalMensal;

  document.getElementById("totalCorridas").innerText =
    totalCorridas;

  atualizarRanking();
}



function atualizarRanking() {

  const lista = document.getElementById("ranking");

  if (!lista) return;

  lista.innerHTML = "";

  ranking
    .sort((a, b) => b.valor - a.valor)
    .forEach(item => {

      lista.innerHTML += `
        <li>
          🏆 ${item.nome}
          — R$ ${item.valor}
          — ${item.corridas} corridas
        </li>
      `;
    });
}



function resetSemana() {

  if (!confirm("Deseja resetar tudo?")) return;

  ranking = [];

  salvar();

  atualizarTudo();
}



window.testarFirebase = async function () {

  await addDoc(collection(db, "corridas"), {
    teste: "firebase funcionando",
    criadoEm: new Date().toISOString()
  });

  alert("🔥 Firebase funcionando!");
};



atualizarTudo();