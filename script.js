// 1. Controle de Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Garante que o painel administrativo comece oculto para privacidade dos dados
    document.getElementById('dashboard-rapido').style.display = 'none';
});

// 2. Envio de Cadastro e Lógica de Priorização (Apoio à Decisão)
document.getElementById('form-cadastro').addEventListener('submit', function(e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value;
    const renda = parseFloat(document.getElementById('renda').value);
    const dependentes = parseInt(document.getElementById('dependentes').value);
    const endereco = document.getElementById('endereco').value;
    const congregacao = document.getElementById('congregacao').value;

    // Cálculo da Renda per Capita para priorização justa [cite: 67, 100]
    const rendaPerCapita = renda / (dependentes + 1);
    let prioridade = "BAIXA";
    if (rendaPerCapita <= 218) prioridade = "ALTA";
    else if (rendaPerCapita <= 706) prioridade = "MÉDIA";

    const novaFamilia = {
        id: Date.now(), // Identificador único para o registro [cite: 96]
        nome,
        renda,
        dependentes,
        endereco,
        congregacao,
        prioridade,
        entregue: false, // Status inicial da logística [cite: 70, 103]
        dataEntrega: null,
        dataCadastro: new Date().toLocaleDateString('pt-BR')
    };

    // Salvando no LocalStorage (Substitui os rascunhos em papel) [cite: 93, 96]
    let familias = JSON.parse(localStorage.getItem('familias_ad_marechal')) || [];
    familias.push(novaFamilia);
    localStorage.setItem('familias_ad_marechal', JSON.stringify(familias));

    this.reset();
    alert("Cadastro realizado com sucesso! A liderança analisará os dados.");
});

// 3. Funções de Gestão de Entrega (Otimização Logística) [cite: 70, 102]
function confirmarEntrega(id) {
    let familias = JSON.parse(localStorage.getItem('familias_ad_marechal')) || [];
    
    familias = familias.map(f => {
        if (f.id === id) {
            return { 
                ...f, 
                entregue: true, 
                dataEntrega: new Date().toLocaleString('pt-BR') 
            };
        }
        return f;
    });

    localStorage.setItem('familias_ad_marechal', JSON.stringify(familias));
    renderizarLista(); // Atualiza a visão do administrador
}

// 4. Acesso Administrativo e Segurança [cite: 106, 115]
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

// 5. Renderização da Lista com Ranqueamento e Status de Entrega [cite: 65, 68]
function renderizarLista() {
    const statusDiv = document.getElementById('status-cestas');
    let familias = JSON.parse(localStorage.getItem('familias_ad_marechal')) || [];

    if (familias.length === 0) {
        statusDiv.innerHTML = "<p>Nenhum cadastro encontrado.</p>";
        return;
    }

    // Ranqueamento: Prioridade ALTA no topo para facilitar a tomada de decisão [cite: 97, 101]
    familias.sort((a, b) => {
        if (a.entregue !== b.entregue) return a.entregue ? 1 : -1;
        return (a.prioridade === 'ALTA' ? -1 : 1);
    });

    statusDiv.innerHTML = familias.map(f => `
        <div style="border-bottom: 1px solid #eee; margin-bottom: 15px; padding: 10px; border-left: 5px solid ${f.entregue ? '#bdc3c7' : (f.prioridade === 'ALTA' ? '#e74c3c' : '#27ae60')}; opacity: ${f.entregue ? '0.6' : '1'}">
            <strong>${f.nome}</strong> - <span style="color: ${f.entregue ? '#7f8c8d' : (f.prioridade === 'ALTA' ? '#e74c3c' : '#27ae60')}">${f.prioridade}</span><br>
            <small><strong>Congregação:</strong> ${f.congregacao}</small><br>
            <small>Endereço: ${f.endereco}</small><br>
            
            ${f.entregue 
                ? `<p style="color: #27ae60; font-weight: bold; margin-top: 5px;">✅ Entregue em: ${f.dataEntrega}</p>` 
                : `<button onclick="confirmarEntrega(${f.id})" style="margin-top: 10px; background: #27ae60; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Confirmar Entrega</button>`
            }
        </div>
    `).join('');
}

// 6. Exportação para Relatórios CSV (Ciência de Dados) 
document.getElementById('btn-exportar').addEventListener('click', function() {
    const familias = JSON.parse(localStorage.getItem('familias_ad_marechal')) || [];
    if (familias.length === 0) return;

    let csvContent = "Nome;Prioridade;Congregacao;Status;Data_Entrega;Endereco\n";
    familias.forEach(f => {
        const status = f.entregue ? "ENTREGUE" : "PENDENTE";
        const dataE = f.dataEntrega ? f.dataEntrega.replace(';', ',') : "---";
        csvContent += `${f.nome};${f.prioridade};${f.congregacao};${status};${dataE};${f.endereco}\n`;
    });

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "relatorio_acao_social_ad.csv";
    link.click();
});