let ranking = JSON.parse(localStorage.getItem("ranking")) || []

let grafico

atualizarTudo()

function adicionar() {

  let nome = document.getElementById("nome").value.trim()
  let nomeKey = nome.toLowerCase()

  let valor = Number(document.getElementById("valor").value)
  let corridas = Number(document.getElementById("corridas").value)

  let dia = document.getElementById("dia").value
  let data = document.getElementById("data").value

  if(nome === "" || valor <= 0) {
    alert("Preencha corretamente")
    return
  }

  let motorista = ranking.find(m => m.nome.toLowerCase() === nomeKey)

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
      historico: [{
        dia,
        data,
        valor,
        corridas
      }]
    })
  }

  salvar()
  atualizarTudo()
  limparCampos()
}

function resetSemana() {

  if(!confirm("Deseja resetar a semana?")) return

  ranking = []

  salvar()
  atualizarTudo()
}

function salvar() {
  localStorage.setItem("ranking", JSON.stringify(ranking))
}

function atualizarTudo() {
  mostrarRanking()
  atualizarLider()
  atualizarGrafico()
}

function mostrarRanking() {

  let lista = document.getElementById("ranking")
  lista.innerHTML = ""

  ranking.forEach((m, i) => {

    let medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : ""

    let historicoHTML = ""

    m.historico.forEach(h => {

      historicoHTML += `
        <div style="margin-bottom:10px">
          📅 ${h.dia} - ${h.data}
          <br>
          💰 R$ ${h.valor}
          <br>
          🚗 ${h.corridas}
        </div>
      `
    })

    lista.innerHTML += `
      <li style="
        background:#fff;
        padding:15px;
        margin:10px 0;
        border-radius:15px;
        box-shadow:0 5px 15px rgba(0,0,0,0.1);
      ">

        ${medalha} <b>${m.nome}</b>

        <br><br>

        💰 Total: R$ ${m.valor}
        <br>
        🚗 Corridas: ${m.corridas}

        <br><br>

        ${historicoHTML}

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
    <div style="
      background: linear-gradient(135deg,#ff7a18,#ffb347);
      padding: 20px;
      border-radius: 20px;
      color: white;
      margin: 15px 0;
      box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    ">

      🏆 <b>LÍDER DA SEMANA</b>

      <h2>${top.nome}</h2>

      💰 R$ ${top.valor}
      <br>
      🚗 ${top.corridas} corridas

    </div>
  `
}

function atualizarGrafico() {

  let nomes = ranking.map(m => m.nome)
  let valores = ranking.map(m => m.valor)

  let total = valores.reduce((a,b) => a + b, 0)

  let porcent = valores.map(v =>
    total === 0 ? 0 : ((v / total) * 100).toFixed(1)
  )

  let ctx = document.getElementById("grafico").getContext("2d")

  if(grafico) grafico.destroy()

  grafico = new Chart(ctx, {

    type: "pie",

    data: {

      labels: nomes.map((n,i) => `${n} (${porcent[i]}%)`),

      datasets: [{
        data: valores,
        backgroundColor: [
          "#ff7a18",
          "#ffb347",
          "#ffd166",
          "#fb923c",
          "#f97316"
        ]
      }]
    }
  })
}

function limparCampos() {

  document.getElementById("nome").value = ""
  document.getElementById("valor").value = ""
  document.getElementById("corridas").value = ""
  document.getElementById("data").value = ""
}