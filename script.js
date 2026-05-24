let ranking = JSON.parse(localStorage.getItem("ranking")) || []

let grafico

atualizarTudo()

function abrirTela(id) {

  document.querySelectorAll(".tela").forEach(tela => {
    tela.classList.remove("ativa")
  })

  document.getElementById(id).classList.add("ativa")

  if(id === "graficoTela") {
    atualizarGrafico()
  }
}

function adicionar() {

  let nome = document.getElementById("nome").value.trim()
  let nomeKey = nome.toLowerCase()

  let valor = Number(document.getElementById("valor").value)
  let corridas = Number(document.getElementById("corridas").value)
  let data = document.getElementById("data").value

  if(nome === "" || valor <= 0 || data === "") {
    alert("Preencha nome, valor e data")
    return
  }

  let dia = descobrirDiaSemana(data)

  let motorista = ranking.find(
    m => m.nome.toLowerCase() === nomeKey
  )

  if(motorista) {

    motorista.valor += valor
    motorista.corridas += corridas

    motorista.historico.push({
      dia,
      data,
      valor,
      corridas
    })

  } else {

    ranking.push({
      nome,
      valor,
      corridas,
      historico: [
        {
          dia,
          data,
          valor,
          corridas
        }
      ]
    })
  }

  organizarHistoricoPorData()

  ranking.sort((a, b) => b.valor - a.valor)

  salvar()
  atualizarTudo()
  limparCampos()
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
  ]

  let dataObj = new Date(data + "T00:00:00")

  return dias[dataObj.getDay()]
}

function organizarHistoricoPorData() {

  ranking.forEach(motorista => {

    motorista.historico.sort((a, b) => {
      return new Date(a.data) - new Date(b.data)
    })
  })
}

function descobrirMelhorDia(motorista) {

  if(!motorista.historico || motorista.historico.length === 0) {
    return null
  }

  let melhor = motorista.historico[0]

  motorista.historico.forEach(item => {

    if(item.valor > melhor.valor) {
      melhor = item
    }
  })

  return melhor
}

function resetSemana() {

  if(!confirm("Deseja apagar todos os dados?")) {
    return
  }

  ranking = []

  salvar()
  atualizarTudo()
}

function salvar() {

  localStorage.setItem(
    "ranking",
    JSON.stringify(ranking)
  )
}

function atualizarTudo() {

  organizarHistoricoPorData()

  mostrarRanking()
  atualizarLider()
  atualizarMetricas()
  atualizarGrafico()
}

function mostrarRanking() {

  let lista = document.getElementById("ranking")

  lista.innerHTML = ""

  ranking.forEach((m, i) => {

    let medalha = ""

    if(i === 0) medalha = "🥇"
    else if(i === 1) medalha = "🥈"
    else if(i === 2) medalha = "🥉"
    else medalha = `${i + 1}º`

    let melhorDia = descobrirMelhorDia(m)

    let melhorDiaHTML = ""

    if(melhorDia) {
      melhorDiaHTML = `
        <div class="melhor-dia">
          🔥 Melhor dia:
          ${melhorDia.dia} - ${formatarData(melhorDia.data)}
          <br>
          💰 R$ ${melhorDia.valor}
          • 🚗 ${melhorDia.corridas}
        </div>
      `
    }

    let historicoHTML = ""

    m.historico.forEach(h => {

      let destaque = ""

      if(melhorDia && h.data === melhorDia.data && h.valor === melhorDia.valor) {
        destaque = "dia-destaque"
      }

      historicoHTML += `
        <div class="${destaque}">
          📅 ${h.dia || descobrirDiaSemana(h.data)} - ${formatarData(h.data)}
          <br>
          💰 R$ ${h.valor}
          • 🚗 ${h.corridas}
        </div>
        <br>
      `
    })

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

        ${melhorDiaHTML}

        <div class="historico">
          <strong>Histórico</strong>
          <br><br>
          ${historicoHTML}
        </div>
      </li>
    `
  })
}

function atualizarLider() {

  let lider = document.getElementById("liderSemana")

  if(ranking.length === 0) {

    lider.innerHTML = ""

    return
  }

  let top = ranking[0]
  let melhorDia = descobrirMelhorDia(top)

  let melhorTexto = ""

  if(melhorDia) {
    melhorTexto = `
      <br><br>
      🔥 Melhor dia:
      ${melhorDia.dia}
      <br>
      R$ ${melhorDia.valor}
    `
  }

  lider.innerHTML = `
    <div class="lider-card">
      🏆 LÍDER
      <h2>${top.nome}</h2>
      <strong>R$ ${top.valor}</strong>
      <br><br>
      🚗 ${top.corridas} corridas
      ${melhorTexto}
    </div>
  `
}

function atualizarMetricas() {

  let totalSemana = ranking.reduce(
    (soma, m) => soma + m.valor,
    0
  )

  let corridas = ranking.reduce(
    (soma, m) => soma + m.corridas,
    0
  )

  let totalMensal = calcularTotalMensal()

  document.getElementById("totalSemana").innerText =
    `R$ ${totalSemana}`

  document.getElementById("totalMensal").innerText =
    `R$ ${totalMensal}`

  document.getElementById("totalCorridas").innerText =
    corridas

  document.getElementById("homeTotal").innerText =
    `R$ ${totalSemana}`

  document.getElementById("homeMensal").innerText =
    `R$ ${totalMensal}`
}

function calcularTotalMensal() {

  let hoje = new Date()
  let mesAtual = hoje.getMonth()
  let anoAtual = hoje.getFullYear()

  let total = 0

  ranking.forEach(motorista => {

    motorista.historico.forEach(item => {

      if(!item.data) return

      let dataItem = new Date(item.data + "T00:00:00")

      if(
        dataItem.getMonth() === mesAtual &&
        dataItem.getFullYear() === anoAtual
      ) {
        total += item.valor
      }
    })
  })

  return total
}

function atualizarGrafico() {

  let canvas = document.getElementById("grafico")

  if(!canvas) return

  let nomes = ranking.map(m => m.nome)
  let valores = ranking.map(m => m.valor)

  let total = valores.reduce((a, b) => a + b, 0)

  let porcentagens = valores.map(v =>
    total === 0 ? 0 : ((v / total) * 100).toFixed(1)
  )

  let ctx = canvas.getContext("2d")

  if(grafico) {
    grafico.destroy()
  }

  grafico = new Chart(ctx, {

    type: "doughnut",

    data: {

      labels: nomes.map(
        (n, i) => `${n} (${porcentagens[i]}%)`
      ),

      datasets: [{

        data: valores,

        backgroundColor: [
          "#ff7a18",
          "#ffb347",
          "#ffd166",
          "#22c55e",
          "#3b82f6",
          "#8b5cf6"
        ],

        borderWidth: 2
      }]
    },

    options: {

      plugins: {

        legend: {
          position: "bottom"
        }
      }
    }
  })
}

function formatarData(data) {

  if(!data) return "sem data"

  let partes = data.split("-")

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function limparCampos() {

  document.getElementById("nome").value = ""
  document.getElementById("valor").value = ""
  document.getElementById("corridas").value = ""
  document.getElementById("data").value = ""
}

if("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js")
}