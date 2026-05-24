let ranking = JSON.parse(localStorage.getItem("ranking")) || []

let grafico

mostrarRanking()
atualizarLider()
atualizarGrafico()

function adicionar() {

  let nome = document.getElementById("nome").value.trim().toLowerCase()
  let valor = Number(document.getElementById("valor").value)
  let corridas = Number(document.getElementById("corridas").value)
  let dia = document.getElementById("dia").value
  let data = document.getElementById("data").value

  if(nome === "" || valor <= 0) return alert("Preencha tudo")

  let motorista = ranking.find(m => m.nome === nome)

  if(motorista) {

    motorista.valor += valor
    motorista.corridas += corridas

    motorista.historico.push({ dia, data, valor, corridas })

  } else {

    ranking.push({
      nome,
      valor,
      corridas,
      historico: [{ dia, data, valor, corridas }]
    })
  }

  salvar()
  atualizarTudo()
}

function resetSemana() {

  if(!confirm("Resetar semana?")) return

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

    let hist = ""

    m.historico.forEach(h => {

      hist += `
        <div>
          📅 ${h.dia} - ${h.data}
          💰 R$ ${h.valor} 🚗 ${h.corridas}
        </div>
      `
    })

    lista.innerHTML += `
      <li>
        ${medalha} ${m.nome}
        <br><br>
        💰 Total: R$ ${m.valor}
        <br>
        🚗 Corridas: ${m.corridas}
        <br><br>
        ${hist}
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
      🏆 Líder
      <br><br>
      ${top.nome.toUpperCase()}
      <br><br>
      💰 R$ ${top.valor}
    </div>
  `
}

function atualizarGrafico() {

  let nomes = ranking.map(m => m.nome)
  let valores = ranking.map(m => m.valor)

  let total = valores.reduce((a,b)=>a+b,0)

  let porcent = valores.map(v => ((v/total)*100).toFixed(1))

  let ctx = document.getElementById("grafico").getContext("2d")

  if(grafico) grafico.destroy()

  grafico = new Chart(ctx, {

    type: "pie",

    data: {

      labels: nomes.map((n,i)=> `${n} (${porcent[i]}%)`),

      datasets: [{
        data: valores,
        backgroundColor: ["#f97316","#fb923c","#facc15","#ea580c","#ffb703"]
      }]
    }
  })
}