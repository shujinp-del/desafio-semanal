let ranking = []

let dadosSalvos = localStorage.getItem("ranking")

if(dadosSalvos) {

  ranking = JSON.parse(dadosSalvos)
}

let grafico

mostrarRanking()

atualizarLider()

atualizarGrafico()

function adicionar() {

  let nome = document
    .getElementById("nome")
    .value
    .trim()
    .toLowerCase()

  let valor = Number(
    document.getElementById("valor").value
  )

  let corridas = Number(
    document.getElementById("corridas").value
  )

  let dia = document.getElementById("dia").value

  if(nome === "" || valor <= 0) {

    alert("Preencha os campos")

    return
  }

  let motoristaExistente = ranking.find(
    motorista => motorista.nome === nome
  )

  if(motoristaExistente) {

    motoristaExistente.valor += valor

    motoristaExistente.corridas += corridas

    motoristaExistente.historico.push({

      dia: dia,

      valor: valor,

      corridas: corridas

    })

  }

  else {

    ranking.push({

      nome: nome,

      valor: valor,

      corridas: corridas,

      historico: [

        {

          dia: dia,

          valor: valor,

          corridas: corridas

        }

      ]

    })

  }

  ranking.sort((a, b) => b.valor - a.valor)

  salvarDados()

  mostrarRanking()

  atualizarLider()

  atualizarGrafico()

  limparCampos()
}

function mostrarRanking() {

  let lista = document.getElementById("ranking")

  lista.innerHTML = ""

  ranking.forEach((motorista, index) => {

    let medalha = ""
    let classe = ""

    if(index === 0) {

      medalha = "🥇"
      classe = "primeiro"
    }

    else if(index === 1) {

      medalha = "🥈"
      classe = "segundo"
    }

    else if(index === 2) {

      medalha = "🥉"
      classe = "terceiro"
    }

    let historicoHTML = ""

    motorista.historico.forEach((item, historicoIndex) => {

      historicoHTML += `

        <div class="historico-item">

          📅 ${item.dia}

          • R$ ${item.valor}

          • 🚗 ${item.corridas}

          <button onclick="removerDia(${index}, ${historicoIndex})">

            ❌

          </button>

        </div>

      `
    })

    lista.innerHTML += `

      <li class="${classe}">

        <strong>

          ${medalha}

          ${motorista.nome}

        </strong>

        <br><br>

        💰 Total semanal:
        R$ ${motorista.valor}

        <br><br>

        🚗 Corridas:
        ${motorista.corridas}

        <div class="historico">

          <strong>

            Histórico

          </strong>

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

  let primeiroLugar = ranking[0]

  lider.innerHTML = `

    <div class="lider-card">

      🏆 Líder da Semana

      <br><br>

      <strong>

        ${primeiroLugar.nome}

      </strong>

      <br><br>

      💰 R$ ${primeiroLugar.valor}

    </div>

  `
}

function atualizarGrafico() {

  let nomes = ranking.map(m => m.nome)

  let valores = ranking.map(m => m.valor)

  let ctx = document
    .getElementById("grafico")
    .getContext("2d")

  if(grafico) {

    grafico.destroy()
  }

  grafico = new Chart(ctx, {

    type: "pie",

    data: {

      labels: nomes,

      datasets: [{

        data: valores,

        backgroundColor: [

          "#f97316",
          "#fb923c",
          "#facc15",
          "#ea580c",
          "#ffb703",
          "#ff7b00",
          "#ffd166"

        ],

        borderWidth: 2

      }]
    }
  })
}

function removerDia(motoristaIndex, historicoIndex) {

  let motorista = ranking[motoristaIndex]

  let itemRemovido =
    motorista.historico[historicoIndex]

  motorista.valor -= itemRemovido.valor

  motorista.corridas -= itemRemovido.corridas

  motorista.historico.splice(historicoIndex, 1)

  if(motorista.historico.length === 0) {

    ranking.splice(motoristaIndex, 1)
  }

  ranking.sort((a, b) => b.valor - a.valor)

  salvarDados()

  mostrarRanking()

  atualizarLider()

  atualizarGrafico()
}

function salvarDados() {

  localStorage.setItem(
    "ranking",
    JSON.stringify(ranking)
  )

  console.log("Dados salvos!")
}

function limparCampos() {

  document.getElementById("nome").value = ""

  document.getElementById("valor").value = ""

  document.getElementById("corridas").value = ""
}