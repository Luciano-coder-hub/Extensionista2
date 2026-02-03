// 1. Controle de Inicialização
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dashboard-rapido').style.display = 'none';
});

// 2. Envio de Cadastro e Lógica de Priorização
document.getElementById('form-cadastro').addEventListener('submit', function(e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value;
    const renda = parseFloat(document.getElementById('renda').value);
    const dependentes = parseInt(document.getElementById('dependentes').value);
    const endereco = document.getElementById('endereco').value;
    const congregacao = document.getElementById('congregacao').value;

    // Cálculo da Renda per Capita para priorização justa
    const pessoas = dependentes + 1;
    const rendaPerCapita = renda / pessoas;
    
    let prioridade = "BAIXA";
    if (rendaPerCapita <= 218) prioridade = "ALTA"; // Critério de extrema pobreza
    else if (rendaPerCapita <= 706) prioridade = "MÉDIA";

    const novaFamilia = {
        id: Date.now(),
        nome,
        renda,
        dependentes,
        endereco,
        congregacao,
        prioridade,
        entregue: false,
        negado: false, // Novo status
        dataEntrega: null,
        dataCadastro: new Date().toLocaleDateString('pt-BR')
    };

    let familias = JSON.parse(localStorage.getItem('familias_ad_marechal')) || [];
    familias.push(novaFamilia);
    localStorage.setItem('familias_ad_marechal', JSON.stringify(familias));

    this.reset();
    alert("Cadastro realizado com sucesso! A liderança analisará os dados.");
});

// 3. Funções de Gestão (Entrega e Negação)
function confirmarEntrega(id) {
    atualizarStatus(id, { entregue: true, negado: false, dataEntrega: new Date().toLocaleString('pt-BR') });
}

function negarPedido(id) {
    if(confirm("Deseja realmente negar este pedido?")) {
        atualizarStatus(id, { entregue: false, negado: true, dataEntrega: "NEGADO" });
    }
}

function atualizarStatus(id, novosDados) {
    let familias = JSON.parse(localStorage.getItem('familias_ad_marechal')) || [];
    familias = familias.map(f => (f.id === id ? { ...f, ...novosDados } : f));
    localStorage.setItem('familias_ad_marechal', JSON.stringify(familias));
    renderizarLista();
}

// 4. Acesso Administrativo
function acessoAdmin() {
    const senha = prompt("Digite a senha de acesso (Liderança):");
    if (senha === "adm123") {
        document.getElementById('dashboard-rapido').style.display = 'block';
        renderizarLista();
        document.getElementById('dashboard-rapido').scrollIntoView({ behavior: 'smooth' });
    } else {
        alert("Acesso negado.");
    }
}

function logoutAdmin() {
    document.getElementById('dashboard-rapido').style.display = 'none';
    window.scrollTo(0, 0);
}

// 5. Renderização da Lista com Ranqueamento
function renderizarLista() {
    const statusDiv = document.getElementById('status-cestas');
    let familias = JSON.parse(localStorage.getItem('familias_ad_marechal')) || [];

    if (familias.length === 0) {
        statusDiv.innerHTML = "<p>Nenhum cadastro encontrado.</p>";
        return;
    }

    // Ordenação: Ativos (Alta > Média > Baixa) -> Concluídos -> Negados
    familias.sort((a, b) => {
        if (a.negado !== b.negado) return a.negado ? 1 : -1;
        if (a.entregue !== b.entregue) return a.entregue ? 1 : -1;
        const pesos = { "ALTA": 1, "MÉDIA": 2, "BAIXA": 3 };
        return pesos[a.prioridade] - pesos[b.prioridade];
    });

    statusDiv.innerHTML = familias.map(f => {
        const corBase = f.negado ? '#7f8c8d' : (f.entregue ? '#bdc3c7' : (f.prioridade === 'ALTA' ? '#e74c3c' : '#27ae60'));
        return `
            <div class="card-familia" style="border-left: 5px solid ${corBase}; opacity: ${f.entregue || f.negado ? '0.7' : '1'}">
                <strong>${f.nome}</strong> - <span style="color: ${corBase}">${f.negado ? 'PEDIDO NEGADO' : f.prioridade}</span><br>
                <small><strong>Congregação:</strong> ${f.congregacao}</small><br>
                <small>Endereço: ${f.endereco}</small><br>
                
                ${(!f.entregue && !f.negado) 
                    ? `<div class="btn-group-admin">
                        <button onclick="confirmarEntrega(${f.id})" class="btn-confirm">Confirmar</button>
                        <button onclick="negarPedido(${f.id})" class="btn-deny">Negar</button>
                       </div>` 
                    : `<p class="status-final">${f.negado ? '❌ Não aprovado' : '✅ Entregue: ' + f.dataEntrega}</p>`
                }
            </div>
        `;
    }).join('');
}

// 6. Exportação Agrupada por Congregação
document.getElementById('btn-exportar').addEventListener('click', function() {
    const familias = JSON.parse(localStorage.getItem('familias_ad_marechal')) || [];
    if (familias.length === 0) return alert("Não há dados para exportar.");

    // Agrupamento
    const agrupado = familias.reduce((acc, f) => {
        if (!acc[f.congregacao]) acc[f.congregacao] = [];
        acc[f.congregacao].push(f);
        return acc;
    }, {});

    let csvContent = "CONGREGACAO;Nome;Prioridade;Status;Data_Entrega;Endereco\n";
    
    Object.keys(agrupado).sort().forEach(cong => {
        agrupado[cong].forEach(f => {
            const status = f.negado ? "NEGADO" : (f.entregue ? "ENTREGUE" : "PENDENTE");
            csvContent += `${cong};${f.nome};${f.prioridade};${status};${f.dataEntrega || "---"};${f.endereco.replace(/(\r\n|\n|\r)/gm, " ")}\n`;
        });
    });

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_acao_social_agrupado.csv`;
    link.click();
});