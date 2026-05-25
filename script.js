let ranking = JSON.parse(localStorage.getItem("ranking")) || []

let grafico
let graficoLinha

atualizarTudo()

function abrirTela(id) {

  document.querySelectorAll(".tela").forEach(tela => {
    tela.classList.remove("ativa")
  })

  document.getElementById(id).classList.add("ativa")

  if (id === "graficoTela") {
    atualizarGrafico()
    atualizarGraficoLinha()
  }
}

function adicionar() {

  let nome = document.getElementById("nome").value.trim()

  let valor = Number(
    document.getElementById("valor").value
  )

  let corridas = Number(
    document.getElementById("corridas").value
  )

  let data = document.getElementById("data").value

  if (nome === "" || valor <= 0 || data === "") {

    alert("Preencha nome, valor e data")

    return
  }

  let dia = descobrirDiaSemana(data)

  let motorista = ranking.find(
    m => m.nome.toLowerCase() === nome.toLowerCase()
  )

  if (motorista) {

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

      historico: [{
        dia,
        data,
        valor,
        corridas
      }]
    })
  }

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

function salvar() {

  localStorage.setItem(
    "ranking",
    JSON.stringify(ranking)
  )
}

function atualizarTudo() {

  mostrarRanking()

  atualizarLider()

  atualizarMetricas()

  atualizarGrafico()

  atualizarGraficoLinha()
}

function mostrarRanking() {

  let lista = document.getElementById("ranking")

  lista.innerHTML = ""

  ranking.forEach((m, index) => {

    let medalha = ""

    if (index === 0) medalha = "🥇"
    else if (index === 1) medalha = "🥈"
    else if (index === 2) medalha = "🥉"
    else medalha = `${index + 1}º`

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
    `
  })
}

function atualizarLider() {

  let lider = document.getElementById("liderSemana")

  if (ranking.length === 0) {

    lider.innerHTML = ""

    return
  }

  let top = ranking[0]

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
  `
}

function atualizarMetricas() {

  let totalSemana = ranking.reduce(
    (soma, m) => soma + Number(m.valor),
    0
  )

  let corridas = ranking.reduce(
    (soma, m) => soma + Number(m.corridas),
    0
  )

  document.getElementById(
    "totalSemana"
  ).innerText = `R$ ${totalSemana}`

  document.getElementById(
    "totalCorridas"
  ).innerText = corridas

  document.getElementById(
    "homeTotal"
  ).innerText = `R$ ${totalSemana}`

  document.getElementById(
    "homeMensal"
  ).innerText = `R$ ${totalSemana}`
}

function atualizarGrafico() {

  let canvas = document.getElementById("grafico")

  if (!canvas) return

  let nomes = ranking.map(m => m.nome)

  let valores = ranking.map(m => Number(m.valor))

  let ctx = canvas.getContext("2d")

  if (grafico) {
    grafico.destroy()
  }

  grafico = new Chart(ctx, {

    type: "doughnut",

    data: {

      labels: nomes,

      datasets: [{

        data: valores,

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
  })
}

function atualizarGraficoLinha() {

  let canvas = document.getElementById("graficoLinha")

  if (!canvas) return

  let totaisData = {}

  ranking.forEach(motorista => {

    motorista.historico.forEach(item => {

      if (!totaisData[item.data]) {
        totaisData[item.data] = 0
      }

      totaisData[item.data] += Number(item.valor)
    })
  })

  let datas = Object.keys(totaisData).sort()

  let valores = datas.map(data => totaisData[data])

  let labels = datas.map(formatarData)

  let ctx = canvas.getContext("2d")

  if (graficoLinha) {
    graficoLinha.destroy()
  }

  graficoLinha = new Chart(ctx, {

    type: "line",

    data: {

      labels: labels,

      datasets: [{

        label: "Evolução por data",

        data: valores,

        borderColor: "#ff7a18",

        backgroundColor: "rgba(255,122,24,0.2)",

        tension: 0.35,

        fill: true
      }]
    }
  })
}

function formatarData(data) {

  let partes = data.split("-")

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function limparCampos() {

  document.getElementById("nome").value = ""

  document.getElementById("valor").value = ""

  document.getElementById("corridas").value = ""

  document.getElementById("data").value = ""
}

function resetSemana() {

  if (!confirm("Deseja apagar tudo?")) return

  ranking = []

  salvar()

  atualizarTudo()
}