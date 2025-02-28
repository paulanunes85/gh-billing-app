/**
 * GitHub Billing App - JS Principal
 * Funções utilitárias e comportamentos comuns para o frontend
 */

document.addEventListener('DOMContentLoaded', function() {
    // Inicializa tooltips do Bootstrap
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
    
    // Auto-close para alertas após 5 segundos
    setTimeout(function() {
        document.querySelectorAll('.alert-dismissible').forEach(function(alert) {
            new bootstrap.Alert(alert).close();
        });
    }, 5000);
    
    // Formatação de timestamps para data local
    document.querySelectorAll('.format-date').forEach(function(element) {
        const timestamp = element.getAttribute('data-timestamp');
        if (timestamp) {
            const date = new Date(parseInt(timestamp));
            element.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
    });
    
    // Inicialização de dropdowns
    var dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'))
    var dropdownList = dropdownElementList.map(function (dropdownToggleEl) {
        return new bootstrap.Dropdown(dropdownToggleEl)
    });
    
    // Event listeners para botões de ação comuns
    setupCommonButtonListeners();
});

/**
 * Configura listeners para botões de ação comuns em toda a aplicação
 */
function setupCommonButtonListeners() {
    // Botões para marcar fatura como paga
    document.querySelectorAll('.mark-paid-btn').forEach(button => {
        button.addEventListener('click', function() {
            const billingId = this.getAttribute('data-billing-id');
            if (confirm('Confirmar marcação como pago?')) {
                updateBillingStatus(billingId, 'paid');
            }
        });
    });
    
    // Botões para sincronizar faturamento
    document.querySelectorAll('.sync-billing-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const orgId = this.getAttribute('data-org-id');
            syncBillingData(orgId);
        });
    });
}

/**
 * Atualiza o status de um registro de faturamento
 */
async function updateBillingStatus(billingId, status) {
    try {
        showLoading(true);
        
        const response = await fetch(`/api/billing/${billingId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        showLoading(false);
        
        if (response.ok) {
            showNotification('Status atualizado com sucesso!', 'success');
            setTimeout(() => window.location.reload(), 1000);
        } else {
            const data = await response.json();
            showNotification(data.message || 'Erro ao atualizar status', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showLoading(false);
        showNotification('Erro ao processar a solicitação', 'error');
    }
}

/**
 * Sincroniza dados de faturamento para uma organização
 */
async function syncBillingData(orgId) {
    try {
        const button = document.querySelector(`.sync-billing-btn[data-org-id="${orgId}"]`);
        if (button) {
            const originalContent = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
            button.disabled = true;
        }
        
        const response = await fetch(`/api/billing/sync/${orgId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            showNotification('Dados sincronizados com sucesso!', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            const data = await response.json();
            showNotification(data.message || 'Erro ao sincronizar dados', 'error');
            
            if (button) {
                button.innerHTML = '<i class="fas fa-sync me-1"></i>Sincronizar';
                button.disabled = false;
            }
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro ao processar a solicitação', 'error');
        
        const button = document.querySelector(`.sync-billing-btn[data-org-id="${orgId}"]`);
        if (button) {
            button.innerHTML = '<i class="fas fa-sync me-1"></i>Sincronizar';
            button.disabled = false;
        }
    }
}

/**
 * Exibe uma notificação temporária
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    
    if (!container) {
        // Cria o container de notificações se não existir
        const notifContainer = document.createElement('div');
        notifContainer.id = 'notification-container';
        notifContainer.style.position = 'fixed';
        notifContainer.style.top = '20px';
        notifContainer.style.right = '20px';
        notifContainer.style.zIndex = '9999';
        document.body.appendChild(notifContainer);
    }
    
    // Cria a notificação
    const notification = document.createElement('div');
    notification.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    notification.setAttribute('aria-atomic', 'true');
    
    notification.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>
    `;
    
    document.getElementById('notification-container').appendChild(notification);
    
    // Exibe a notificação
    const toast = new bootstrap.Toast(notification, { autohide: true, delay: 5000 });
    toast.show();
    
    // Remove do DOM após esconder
    notification.addEventListener('hidden.bs.toast', function() {
        notification.remove();
    });
}

/**
 * Exibe ou oculta o indicador de carregamento global
 */
function showLoading(show = true) {
    let loader = document.getElementById('global-loader');
    
    if (!loader && show) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.innerHTML = `
            <div class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style="background: rgba(0,0,0,0.4); z-index: 9999;">
                <div class="spinner-border text-light" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Carregando...</span>
                </div>
            </div>
        `;
        document.body.appendChild(loader);
    } else if (loader && !show) {
        loader.remove();
    }
}

/**
 * Formata um valor monetário para exibição
 */
function formatCurrency(value, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(value);
}