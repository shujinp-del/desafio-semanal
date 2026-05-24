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

  let valor = Number(
    document.getElementById("valor").value
  )

  let corridas = Number(
    document.getElementById("corridas").value
  )

  let dia = document.getElementById("dia").value

  let data = document.getElementById("data").value

  if(nome === "" || valor <= 0) {

    alert("Preencha corretamente")

    return
  }

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

  }

  else {

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

  ranking.sort((a, b) => b.valor - a.valor)

  salvar()

  atualizarTudo()

  limparCampos()
}

function resetSemana() {

  if(!confirm("Deseja resetar a semana?")) {

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

    let historicoHTML = ""

    m.historico.forEach(h => {

      historicoHTML += `

        <div>

          📅 ${h.dia} - ${h.data || "sem data"}

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

  lider.innerHTML = `

    <div class="lider-card">

      🏆 LÍDER DA SEMANA

      <h2>${top.nome}</h2>

      <strong>R$ ${top.valor}</strong>

      <br><br>

      🚗 ${top.corridas} corridas

    </div>

  `
}

function atualizarMetricas() {

  let total = ranking.reduce(
    (soma, m) => soma + m.valor,
    0
  )

  let corridas = ranking.reduce(
    (soma, m) => soma + m.corridas,
    0
  )

  document.getElementById("totalSemana").innerText =
    `R$ ${total}`

  document.getElementById("totalCorridas").innerText =
    corridas
}

function atualizarGrafico() {

  let canvas = document.getElementById("grafico")

  if(!canvas) return

  let nomes = ranking.map(m => m.nome)

  let valores = ranking.map(m => m.valor)

  let total = valores.reduce((a, b) => a + b, 0)

  let porcentagens = valores.map(v =>

    total === 0
      ? 0
      : ((v / total) * 100).toFixed(1)

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

function limparCampos() {

  document.getElementById("nome").value = ""

  document.getElementById("valor").value = ""

  document.getElementById("corridas").value = ""

  document.getElementById("data").value = ""
}

/* PWA */

if("serviceWorker" in navigator) {

  navigator.serviceWorker.register("sw.js")

}