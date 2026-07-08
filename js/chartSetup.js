// chartSetup.js - Wraps Chart.js initialization and updates
let growthChartInstance = null;
let breakdownChartInstance = null;

const style = getComputedStyle(document.body);
const colorPrimary = style.getPropertyValue('--accent-primary').trim() || '#3b82f6';
const colorSuccess = style.getPropertyValue('--accent-success').trim() || '#10b981';
const colorSecondary = style.getPropertyValue('--text-secondary').trim() || '#94a3b8';

export function renderCharts(schedule, breakdown) {
    const growthCtx = document.getElementById('growthChart');
    const breakdownCtx = document.getElementById('breakdownChart');
    
    if (!growthCtx || !breakdownCtx) return;

    // --- Growth Chart (Line/Bar) ---
    const labels = schedule.map(item => `Ano ${Math.round(item.year)}`);
    const principalData = schedule.map(item => item.totalPrincipal);
    const interestData = schedule.map(item => item.cumulativeInterest);

    if (growthChartInstance) {
        growthChartInstance.destroy();
    }

    Chart.defaults.color = colorSecondary;
    Chart.defaults.font.family = "'Outfit', sans-serif";

    growthChartInstance = new Chart(growthCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Investido',
                    data: principalData,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    stack: 'Stack 0',
                },
                {
                    label: 'Juros Acumulados',
                    data: interestData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1,
                    stack: 'Stack 0',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { 
                    stacked: true, 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            }
        }
    });

    // --- Breakdown Chart (Pie) ---
    if (breakdownChartInstance) {
        breakdownChartInstance.destroy();
    }

    breakdownChartInstance = new Chart(breakdownCtx, {
        type: 'doughnut',
        data: {
            labels: ['Investimento', 'Juros Recebidos', 'Impostos Pagos'],
            datasets: [{
                data: [breakdown.principal, breakdown.interest, breakdown.tax],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)', // Blue
                    'rgba(16, 185, 129, 0.8)', // Green
                    'rgba(245, 158, 11, 0.8)'  // Orange/Warning for tax
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)'
                ],
                borderWidth: 1,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let value = context.parsed;
                            return ' ' + new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
                        }
                    }
                }
            }
        }
    });
}
