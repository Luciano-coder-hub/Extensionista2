// 1. Configuração do Firebase
const firebaseConfig = {
    databaseURL: "https://projetoacaoosocial-default-rtdb.firebaseio.com/"
};

// Inicializando a versão Compat do Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Variável global para armazenar os dados em tempo real
let familiasGlobal = [];

// 2. Controle de Inicialização
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dashboard-rapido').style.display = 'none';
});

// 3. Escuta em Tempo Real (Realtime Database)
db.ref('familias').on('value', (snapshot) => {
    const data = snapshot.val();
    familiasGlobal = [];
    
    if (data) {
        for (let key in data) {
            familiasGlobal.push({ ...data[key], dbKey: key });
        }
    }
    
    // Atualiza a tela automaticamente se o painel estiver aberto
    if (document.getElementById('dashboard-rapido').style.display === 'block') {
        renderizarLista();
    }
});

// 4. Envio de Cadastro e Lógica de Priorização
document.getElementById('form-cadastro').addEventListener('submit', function(e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value;
    const renda = parseFloat(document.getElementById('renda').value);
    const dependentes = parseInt(document.getElementById('dependentes').value);
    const endereco = document.getElementById('endereco').value;
    const congregacao = document.getElementById('congregacao').value;

    const pessoas = dependentes + 1;
    const rendaPerCapita = renda / pessoas;
    
    let prioridade = "BAIXA";
    if (rendaPerCapita <= 218) prioridade = "ALTA"; 
    else if (rendaPerCapita <= 706) prioridade = "MÉDIA";

    const novaFamilia = {
        nome,
        renda,
        dependentes,
        endereco,
        congregacao,
        prioridade,
        entregue: false,
        negado: false,
        dataEntrega: null,
        dataCadastro: new Date().toLocaleDateString('pt-BR')
    };

    // Salva no banco de dados
    db.ref('familias').push(novaFamilia)
        .then(() => {
            document.getElementById('form-cadastro').reset();
            alert("Cadastro realizado com sucesso! A liderança analisará os dados.");
        })
        .catch((error) => {
            alert("Erro ao salvar cadastro: " + error);
        });
});

// 5. Funções de Gestão (Entrega e Negação)
function confirmarEntrega(dbKey) {
    atualizarStatus(dbKey, { entregue: true, negado: false, dataEntrega: new Date().toLocaleString('pt-BR') });
}

function negarPedido(dbKey) {
    if(confirm("Deseja realmente negar este pedido?")) {
        atualizarStatus(dbKey, { entregue: false, negado: true, dataEntrega: "NEGADO" });
    }
}

function atualizarStatus(dbKey, novosDados) {
    db.ref(`familias/${dbKey}`).update(novosDados);
}

// 6. Acesso Administrativo (Voltou a funcionar no HTML!)
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

// 7. Renderização da Lista com Ranqueamento
function renderizarLista() {
    const statusDiv = document.getElementById('status-cestas');
    let familias = [...familiasGlobal]; 

    if (familias.length === 0) {
        statusDiv.innerHTML = "<p>Nenhum cadastro encontrado.</p>";
        return;
    }

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
                        <button onclick="confirmarEntrega('${f.dbKey}')" class="btn-confirm">Confirmar</button>
                        <button onclick="negarPedido('${f.dbKey}')" class="btn-deny">Negar</button>
                       </div>` 
                    : `<p class="status-final">${f.negado ? '❌ Não aprovado' : '✅ Entregue: ' + f.dataEntrega}</p>`
                }
            </div>
        `;
    }).join('');
}

// 8. Exportação Agrupada por Congregação
document.getElementById('btn-exportar').addEventListener('click', function() {
    const familias = [...familiasGlobal];
    if (familias.length === 0) return alert("Não há dados para exportar.");

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