let ranking = JSON.parse(localStorage.getItem("ranking")) || []

let grafico
let metaMensal =
  Number(localStorage.getItem("metaMensal")) || 0

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

function salvarMeta() {

  metaMensal = Number(
    document.getElementById("metaMensal").value
  )

  localStorage.setItem(
    "metaMensal",
    metaMensal
  )

  atualizarMeta()
}

function atualizarMeta() {

  let totalMensal = calcularTotalMensal()

  let progresso = 0

  if(metaMensal > 0) {

    progresso = (totalMensal / metaMensal) * 100

    if(progresso > 100) {
      progresso = 100
    }
  }

  document.getElementById("progressoMeta").style.width =
    `${progresso}%`

  if(metaMensal > 0) {

    let falta = metaMensal - totalMensal

    if(falta <= 0) {

      document.getElementById("textoMeta").innerHTML =
        `🔥 Meta batida! Total: R$ ${totalMensal}`

    } else {

      document.getElementById("textoMeta").innerHTML =
        `🎯 Faltam R$ ${falta} para bater a meta`
    }

  } else {

    document.getElementById("textoMeta").innerHTML =
      "Meta ainda não definida"
  }
}

function calcularTotalMensal() {

  let hoje = new Date()

  let mesAtual = hoje.getMonth()

  let anoAtual = hoje.getFullYear()

  let total = 0

  ranking.forEach(motorista => {

    motorista.historico.forEach(item => {

      let dataItem =
        new Date(item.data + "T00:00:00")

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

      return new Date(b.data) - new Date(a.data)

    })
  })
}

function descobrirMelhorDia(motorista) {

  if(!motorista.historico ||
     motorista.historico.length === 0) {

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

function agruparHistoricoPorMes(historico) {

  let grupos = {}

  historico.forEach(item => {

    let dataObj =
      new Date(item.data + "T00:00:00")

    let nomeMes =
      dataObj.toLocaleDateString("pt-BR", {

        month: "long",
        year: "numeric"

      })

    if(!grupos[nomeMes]) {

      grupos[nomeMes] = []
    }

    grupos[nomeMes].push(item)
  })

  return grupos
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

  atualizarMeta()

  atualizarGrafico()
}

function mostrarRanking() {

  let lista = document.getElementById("ranking")

  let pesquisa = document
    .getElementById("pesquisaMotorista")
    .value
    .toLowerCase()

  lista.innerHTML = ""

  ranking
    .filter(m =>
      m.nome.toLowerCase().includes(pesquisa)
    )

    .forEach((m, i) => {

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

            ${melhorDia.dia}
            - ${formatarData(melhorDia.data)}

            <br>

            💰 R$ ${melhorDia.valor}

          </div>

        `
      }

      let grupos =
        agruparHistoricoPorMes(m.historico)

      let historicoHTML = ""

      Object.keys(grupos).forEach(mes => {

        historicoHTML += `

          <div class="grupo-mes">

            ${mes.toUpperCase()}

          </div>

        `

        grupos[mes].forEach(h => {

          historicoHTML += `

            <div class="dia-destaque">

              📅 ${h.dia}
              - ${formatarData(h.data)}

              <br>

              💰 R$ ${h.valor}
              • 🚗 ${h.corridas}

            </div>

            <br>

          `
        })
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

  let lider =
    document.getElementById("liderSemana")

  if(ranking.length === 0) {

    lider.innerHTML = ""

    return
  }

  let top = ranking[0]

  lider.innerHTML = `

    <div class="lider-card">

      🏆 LÍDER

      <h2>${top.nome}</h2>

      <strong>R$ ${top.valor}</strong>

      <br><br>

      🚗 ${top.corridas} corridas

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

  document.getElementById("totalSemana")
    .innerText = `R$ ${totalSemana}`

  document.getElementById("totalCorridas")
    .innerText = corridas
}

function atualizarGrafico() {

  let canvas =
    document.getElementById("grafico")

  if(!canvas) return

  let nomes = ranking.map(m => m.nome)

  let valores = ranking.map(m => m.valor)

  let ctx = canvas.getContext("2d")

  if(grafico) {

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

if("serviceWorker" in navigator) {

  navigator.serviceWorker.register("sw.js")
}