// main.js - Consolidated application logic (No modules to avoid CORS on file://)

// ==========================================
// 1. Core Financial Calculations (math.js)
// ==========================================

function calculateCompoundInterest({
    principal, annualRate, years, compoundFreq,
    depositAmount = 0, depositFreq = 12, depositAtEnd = true,
    taxRate = 0, taxAnnually = false
}) {
    const rateDecimal = annualRate / 100;
    const taxDecimal = taxRate / 100;
    
    let schedule = [];
    let currentBalance = principal;
    let totalPrincipal = principal;
    let totalInterest = 0;
    let totalTaxPaid = 0;
    
    const simPeriods = years * 12; 
    let reportIntervalMonths = 12;
    if (simPeriods <= 24) reportIntervalMonths = 1;
    else if (simPeriods <= 60) reportIntervalMonths = 3;
    else if (simPeriods <= 120) reportIntervalMonths = 6;
    
    for (let month = 1; month <= simPeriods; month++) {
        let interestThisMonth = 0;
        let depositThisMonth = 0;
        
        let isDepositMonth = (month % (12 / depositFreq)) === 0;
        if (isDepositMonth && !depositAtEnd) {
            currentBalance += depositAmount;
            depositThisMonth += depositAmount;
            totalPrincipal += depositAmount;
        }
        
        let effectiveMonthlyRate = Math.pow(1 + rateDecimal / compoundFreq, compoundFreq / 12) - 1;
        interestThisMonth = currentBalance * effectiveMonthlyRate;
        currentBalance += interestThisMonth;
        totalInterest += interestThisMonth;
        
        if (isDepositMonth && depositAtEnd) {
            currentBalance += depositAmount;
            depositThisMonth += depositAmount;
            totalPrincipal += depositAmount;
        }
        
        let taxThisMonth = 0;
        let isYearEnd = (month % 12) === 0;
        if (taxAnnually && isYearEnd) {
            let interestThisYear = totalInterest - (schedule.length > 0 ? schedule[schedule.length-1].cumulativeInterest : 0);
            taxThisMonth = interestThisYear * taxDecimal;
            currentBalance -= taxThisMonth;
            totalTaxPaid += taxThisMonth;
        }

        let isReportMonth = (month % reportIntervalMonths) === 0;
        if (isReportMonth || month === simPeriods) {
            schedule.push({
                month: month,
                year: month / 12,
                balance: currentBalance,
                totalPrincipal: totalPrincipal,
                cumulativeInterest: totalInterest,
                cumulativeTax: totalTaxPaid
            });
        }
    }

    if (!taxAnnually && taxRate > 0) {
        let finalTax = totalInterest * taxDecimal;
        currentBalance -= finalTax;
        totalTaxPaid = finalTax;
        
        let lastPoint = schedule[schedule.length - 1];
        lastPoint.balance = currentBalance;
        lastPoint.cumulativeTax = totalTaxPaid;
    }

    return {
        totalBalance: currentBalance,
        totalPrincipal: totalPrincipal,
        totalInterest: totalInterest,
        totalTax: totalTaxPaid,
        schedule: schedule
    };
}

function calculateSimpleInterest(principal, annualRate, years, depositAmount = 0, depositFreq = 12) {
    const rateDecimal = annualRate / 100;
    let schedule = [];
    let currentPrincipal = principal;
    let totalInterest = 0;
    
    // Simulate month by month to build schedule and handle partial year deposits easily
    const simPeriods = Math.round(years * 12); 
    const monthlyRate = rateDecimal / 12;
    
    let reportIntervalMonths = 12;
    if (simPeriods <= 24) reportIntervalMonths = 1;
    else if (simPeriods <= 60) reportIntervalMonths = 3;
    else if (simPeriods <= 120) reportIntervalMonths = 6;
    
    // If 0 years, just return initial
    if (simPeriods === 0) {
        schedule.push({ month: 0, year: 0, balance: principal, totalPrincipal: principal, cumulativeInterest: 0, cumulativeTax: 0 });
    }

    for (let month = 1; month <= simPeriods; month++) {
        // Interest is calculated ONLY on the principal, not on previously accumulated interest
        let interestThisMonth = currentPrincipal * monthlyRate;
        totalInterest += interestThisMonth;
        
        // Handle deposits (Assuming End of Period)
        let isDepositMonth = (month % (12 / depositFreq)) === 0;
        if (isDepositMonth) {
            currentPrincipal += depositAmount;
        }

        let isReportMonth = (month % reportIntervalMonths) === 0;
        if (isReportMonth || month === simPeriods) {
            schedule.push({
                month: month,
                year: month / 12,
                balance: currentPrincipal + totalInterest,
                totalPrincipal: currentPrincipal,
                cumulativeInterest: totalInterest,
                cumulativeTax: 0
            });
        }
    }

    return {
        totalBalance: currentPrincipal + totalInterest,
        totalPrincipal: currentPrincipal,
        totalInterest: totalInterest,
        schedule: schedule
    };
}

function calculateTimeToGoal(target, principal, depositAmount, depositFreq, annualRate, taxEnabled = false, taxPreset = 'manual', taxRateVal = 0) {
    let balance = principal;
    let months = 0;
    const monthlyRate = (annualRate / 100) / 12;
    
    // Failsafe: check if balance is growing enough (approximate)
    if (balance * monthlyRate + (depositAmount * (depositFreq / 12)) <= 0 && target > principal) {
        return -1; 
    }

    while (months < 1200) {
        let currentTaxRate = 0;
        if (taxEnabled) {
            let years = months / 12;
            let avgYears = years;
            if (taxPreset === 'br-regressiva') {
                if (depositAmount > 0) {
                    const totalDep = depositAmount * (months / (12/depositFreq));
                    if (principal + totalDep > 0) {
                        avgYears = (principal * years + totalDep * (years / 2)) / (principal + totalDep);
                    }
                }
                if (avgYears <= 0.5) currentTaxRate = 0.225;
                else if (avgYears <= 1.0) currentTaxRate = 0.200;
                else if (avgYears <= 2.0) currentTaxRate = 0.175;
                else currentTaxRate = 0.150;
            } else {
                currentTaxRate = taxRateVal / 100;
            }
        }
        
        let totalPrincipal = principal + depositAmount * Math.floor(months / (12/depositFreq));
        let totalInterest = balance - totalPrincipal;
        if (totalInterest < 0) totalInterest = 0;
        let netBalance = balance - (totalInterest * currentTaxRate);
        
        if (netBalance >= target) break;
        
        balance += balance * monthlyRate;
        if (months % (12 / depositFreq) === 0) {
            balance += depositAmount;
        }
        months++;
    }

    return months / 12; 
}

function calculateRateToGoal(target, principal, depositAmount, depositFreq, years, taxEnabled = false, taxPreset = 'manual', taxRateVal = 0) {
    const totalMonths = years * 12;
    // Max input checking
    if (target <= principal + (depositAmount * depositFreq * years)) {
        return 0;
    }

    let lowRate = 0;
    let highRate = 1.0; 
    let estimatedRate = 0.05;
    
    let currentTaxRate = 0;
    if (taxEnabled) {
        let avgYears = years;
        if (taxPreset === 'br-regressiva') {
            if (depositAmount > 0) {
                const totalDep = depositAmount * depositFreq * years;
                if (principal + totalDep > 0) {
                    avgYears = (principal * years + totalDep * (years / 2)) / (principal + totalDep);
                }
            }
            if (avgYears <= 0.5) currentTaxRate = 0.225;
            else if (avgYears <= 1.0) currentTaxRate = 0.200;
            else if (avgYears <= 2.0) currentTaxRate = 0.175;
            else currentTaxRate = 0.150;
        } else {
            currentTaxRate = taxRateVal / 100;
        }
    }
    
    for (let i = 0; i < 50; i++) { 
        estimatedRate = (lowRate + highRate) / 2;
        let monthlyRate = estimatedRate / 12;
        
        let balance = principal;
        let totalPrincipal = principal;
        for (let m = 0; m < totalMonths; m++) {
            balance += balance * monthlyRate;
            if (m % (12 / depositFreq) === 0) {
                balance += depositAmount;
                totalPrincipal += depositAmount;
            }
        }
        
        let totalInterest = balance - totalPrincipal;
        if (totalInterest < 0) totalInterest = 0;
        let netBalance = balance - (totalInterest * currentTaxRate);
        
        if (netBalance > target) {
            highRate = estimatedRate;
        } else {
            lowRate = estimatedRate;
        }
    }
    
    return estimatedRate * 100; 
}


// ==========================================
// 2. Chart Rendering (chartSetup.js)
// ==========================================

let growthChartInstance = null;
let breakdownChartInstance = null;

function renderCharts(schedule, breakdown) {
    const growthCtx = document.getElementById('growthChart');
    const breakdownCtx = document.getElementById('breakdownChart');
    
    if (!growthCtx || !breakdownCtx) return;

    const style = getComputedStyle(document.body);
    const colorSecondary = style.getPropertyValue('--text-secondary').trim() || '#94a3b8';

    const labels = schedule.map(item => {
        if (item.month === 0 || item.year === 0) return "Início";
        if (item.month !== undefined) {
            if (item.month % 12 === 0) {
                return `Ano ${item.month / 12}`;
            }
            return `Mês ${item.month}`;
        }
        return `Ano ${Math.round(item.year)}`;
    });
    
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
                    backgroundColor: 'rgba(60, 110, 255, 0.85)',
                    borderColor: 'rgba(60, 110, 255, 1)',
                    borderWidth: 1,
                    stack: 'Stack 0',
                },
                {
                    label: 'Juros Acumulados',
                    data: interestData,
                    backgroundColor: 'rgba(0, 120, 85, 0.85)',
                    borderColor: 'rgba(0, 120, 85, 1)',
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

    if (breakdownChartInstance) {
        breakdownChartInstance.destroy();
    }

    breakdownChartInstance = new Chart(breakdownCtx, {
        type: 'doughnut',
        data: {
            labels: [
                `Investimento: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(breakdown.principal)}`, 
                `Juros: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(breakdown.interest)}`, 
                `Impostos: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(breakdown.tax)}`
            ],
            datasets: [{
                data: [breakdown.principal, breakdown.interest, breakdown.tax],
                backgroundColor: [
                    'rgba(60, 110, 255, 0.85)', 
                    'rgba(0, 120, 85, 0.85)', 
                    'rgba(225, 120, 40, 0.85)'  
                ],
                borderColor: [
                    'rgba(60, 110, 255, 1)',
                    'rgba(0, 120, 85, 1)',
                    'rgba(225, 120, 40, 1)'
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


// ==========================================
// 3. UI Logic, API Fetching and Events
// ==========================================

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const marketRates = {
    cdi: 10.4, // Fallback
    selic: 10.5, // Fallback
    ipca: 4.5, // Fallback
    fetched: false
};

async function fetchMarketRates() {
    const banner = document.getElementById('market-rates-banner');
    try {
        // CDI (Taxa DI)
        const cdiUrl = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json';
        const cdiRes = await fetch(cdiUrl);
        if (!cdiRes.ok) throw new Error(`HTTP error! status: ${cdiRes.status}`);
        const cdiData = await cdiRes.json();
        if (cdiData && cdiData[0]) marketRates.cdi = parseFloat(cdiData[0].valor);

        // Selic Target (Meta Selic)
        const selicUrl = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json';
        const selicRes = await fetch(selicUrl);
        if (!selicRes.ok) throw new Error(`HTTP error! status: ${selicRes.status}`);
        const selicData = await selicRes.json();
        if (selicData && selicData[0]) marketRates.selic = parseFloat(selicData[0].valor);

        // IPCA (12 months accumulated)
        const ipcaUrl = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json';
        const ipcaRes = await fetch(ipcaUrl);
        if (!ipcaRes.ok) throw new Error(`HTTP error! status: ${ipcaRes.status}`);
        const ipcaData = await ipcaRes.json();
        if (ipcaData && ipcaData[0]) marketRates.ipca = parseFloat(ipcaData[0].valor);

        marketRates.fetched = true;
        
        // Save to LocalStorage for offline fallback
        localStorage.setItem('cachedMarketRates', JSON.stringify(marketRates));
        localStorage.setItem('cachedMarketRatesTime', new Date().getTime());

        if (banner) {
            banner.innerHTML = `<span class="pulse-dot success"></span> SELIC: ${marketRates.selic.toFixed(2).replace('.',',')}% | CDI: ${marketRates.cdi.toFixed(2).replace('.',',')}% | IPCA: ${marketRates.ipca.toFixed(2).replace('.',',')}%`;
        }
        
        // Re-trigger calculation to update values if needed
        const activeForm = document.querySelector('.calculator-form.active');
        if (activeForm && activeForm.checkValidity()) {
            activeForm.dispatchEvent(new Event('submit'));
        }
    } catch (error) {
        console.error("Erro ao buscar taxas do BCB:", error);
        
        // Try recovering from LocalStorage
        const cachedStr = localStorage.getItem('cachedMarketRates');
        if (cachedStr) {
            try {
                const cachedRates = JSON.parse(cachedStr);
                marketRates.cdi = cachedRates.cdi || marketRates.cdi;
                marketRates.selic = cachedRates.selic || marketRates.selic;
                marketRates.ipca = cachedRates.ipca || marketRates.ipca;
                marketRates.fetched = true;
                
                if (banner) {
                    banner.innerHTML = `<span class="pulse-dot warning" style="background-color: #f59e0b; box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);"></span> Modo Offline (Cache) - SELIC: ${marketRates.selic.toFixed(2).replace('.',',')}% | CDI: ${marketRates.cdi.toFixed(2).replace('.',',')}% | IPCA: ${marketRates.ipca.toFixed(2).replace('.',',')}%`;
                }
                
                const activeForm = document.querySelector('.calculator-form.active');
                if (activeForm && activeForm.checkValidity()) {
                    activeForm.dispatchEvent(new Event('submit'));
                }
                return;
            } catch(e) { }
        }
        
        if (banner) {
            banner.innerHTML = `<span class="pulse-dot error"></span> Offline. Usando taxas estimadas - SELIC: ${marketRates.selic}% | CDI: ${marketRates.cdi}% | IPCA: ${marketRates.ipca}%`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registrado!', reg))
            .catch(err => console.error('Erro no Service Worker', err));
    }
    
    fetchMarketRates();

    // --- Navigation Tabs ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const forms = document.querySelectorAll('.calculator-form');
    const goalPanel = document.getElementById('goal-result-panel');
    const summaryCards = document.querySelector('.summary-cards');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetId = btn.getAttribute('data-target') + '-form';
            forms.forEach(f => {
                if (f.id === targetId) f.classList.add('active');
                else f.classList.remove('active');
                f.classList.remove('hidden');
            });
            
            if (targetId.includes('goal')) {
                summaryCards.classList.add('hidden');
                goalPanel.classList.remove('hidden');
            } else {
                summaryCards.classList.remove('hidden');
                goalPanel.classList.add('hidden');
            }

            document.getElementById(targetId).dispatchEvent(new Event('submit'));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // --- Forms Setup ---
    const ciForm = document.getElementById('compound-interest-form');
    const siForm = document.getElementById('simple-interest-form');
    const tgForm = document.getElementById('time-to-goal-form');
    const rgForm = document.getElementById('rate-to-goal-form');

    [ciForm, siForm, tgForm, rgForm].forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleCalculation(form.id);
        });
        
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                if (form.checkValidity()) {
                    handleCalculation(form.id);
                }
            });
        });
    });

    // --- Deposit Toggles ---
    ['ci', 'si', 'tg', 'rg'].forEach(prefix => {
        const checkbox = document.getElementById(`${prefix}-has-deposit`);
        const section = document.getElementById(`${prefix}-deposit-section`);
        if(checkbox && section) {
            const updateVisibility = () => {
                section.style.display = checkbox.checked ? 'block' : 'none';
            };
            checkbox.addEventListener('change', () => {
                updateVisibility();
                const formId = prefix === 'ci' ? 'compound-interest-form' : 
                               prefix === 'si' ? 'simple-interest-form' : 
                               prefix === 'tg' ? 'time-to-goal-form' : 'rate-to-goal-form';
                if(document.getElementById(formId).checkValidity()) handleCalculation(formId);
            });
            updateVisibility();
        }
    });

    // --- Tax Preset Logic ---
    document.getElementById('ci-tax-preset').addEventListener('change', (e) => {
        const rateGroup = document.getElementById('ci-tax-rate-group');
        const annualGroup = document.getElementById('ci-tax-annual-group');
        if (e.target.value === 'manual') {
            rateGroup.style.display = 'flex';
            annualGroup.style.display = 'flex';
        } else {
            rateGroup.style.display = 'none';
            annualGroup.style.display = 'none';
        }
        if (ciForm.checkValidity()) handleCalculation(ciForm.id);
    });

    // --- Tax Toggle Logic for TG and RG ---
    ['tg', 'rg'].forEach(prefix => {
        const checkbox = document.getElementById(`${prefix}-has-tax`);
        const section = document.getElementById(`${prefix}-tax-section`);
        const preset = document.getElementById(`${prefix}-tax-preset`);
        const rateGroup = document.getElementById(`${prefix}-tax-rate-group`);
        const formId = prefix === 'tg' ? 'time-to-goal-form' : 'rate-to-goal-form';

        if (checkbox && section) {
            checkbox.addEventListener('change', () => {
                section.style.display = checkbox.checked ? 'block' : 'none';
                if(document.getElementById(formId).checkValidity()) handleCalculation(formId);
            });
        }
        if (preset && rateGroup) {
            preset.addEventListener('change', (e) => {
                rateGroup.style.display = e.target.value === 'manual' ? 'flex' : 'none';
                if(document.getElementById(formId).checkValidity()) handleCalculation(formId);
            });
        }
    });

    // --- Calculation Handler ---
    function handleCalculation(formId) {
        if (formId === 'compound-interest-form') {
            const principal = parseFloat(document.getElementById('ci-principal').value);
            const rateType = document.getElementById('ci-rate-type').value;
            let userRate = parseFloat(document.getElementById('ci-rate').value);
            
            if (rateType === 'cdi') {
                userRate = (userRate / 100) * marketRates.cdi;
            } else if (rateType === 'selic') {
                userRate = ((1 + marketRates.selic / 100) * (1 + userRate / 100) - 1) * 100;
            } else if (rateType === 'ipca') {
                // Compositing IPCA and Fixed rate
                userRate = ((1 + marketRates.ipca / 100) * (1 + userRate / 100) - 1) * 100;
            }

            const rateFreq = parseInt(document.getElementById('ci-rate-freq').value);
            const rate = userRate * rateFreq; // Converter para taxa nominal anual
            const userYears = parseFloat(document.getElementById('ci-years').value);
            const timeFreq = parseInt(document.getElementById('ci-time-freq').value);
            const years = userYears / timeFreq;
            const compoundFreq = parseInt(document.getElementById('ci-compound-freq').value);
            const hasDeposit = document.getElementById('ci-has-deposit').checked;
            const depositAmount = hasDeposit ? (parseFloat(document.getElementById('ci-deposit').value) || 0) : 0;
            const depositFreq = parseInt(document.getElementById('ci-deposit-freq').value);
            const depositTiming = document.getElementById('ci-deposit-timing').checked;
            
            const taxPreset = document.getElementById('ci-tax-preset').value;
            let taxRate = 0;
            let taxAnnually = false;

            if (taxPreset === 'manual') {
                taxRate = parseFloat(document.getElementById('ci-tax-rate').value) || 0;
                taxAnnually = document.getElementById('ci-tax-annual').checked;
            } else if (taxPreset === 'br-regressiva') {
                // Cálculo aproximado usando prazo médio ponderado
                let avgYears = years; 
                if (depositAmount > 0) {
                    const totalDep = depositAmount * depositFreq * years;
                    if (principal + totalDep > 0) {
                        avgYears = (principal * years + totalDep * (years / 2)) / (principal + totalDep);
                    }
                }
                
                // Tabela Regressiva IR
                if (avgYears <= 0.5) taxRate = 22.5;
                else if (avgYears <= 1.0) taxRate = 20.0;
                else if (avgYears <= 2.0) taxRate = 17.5;
                else taxRate = 15.0;
                
                taxAnnually = false; // IR é descontado no resgate
            }

            const result = calculateCompoundInterest({
                principal, annualRate: rate, years, compoundFreq, 
                depositAmount, depositFreq, depositAtEnd: depositTiming, 
                taxRate, taxAnnually
            });

            updateSummaryUI({
                netBalance: result.totalBalance,
                grossBalance: result.totalPrincipal + result.totalInterest,
                netInterest: result.totalInterest - result.totalTax,
                initialPrincipal: principal,
                totalDeposits: result.totalPrincipal - principal,
                tax: result.totalTax,
                taxRate: taxRate
            });
            renderCharts(result.schedule, {
                principal: result.totalPrincipal,
                interest: result.totalInterest,
                tax: result.totalTax
            });

        } else if (formId === 'simple-interest-form') {
            const principal = parseFloat(document.getElementById('si-principal').value);
            const rateType = document.getElementById('si-rate-type').value;
            let userRate = parseFloat(document.getElementById('si-rate').value);
            
            if (rateType === 'cdi') {
                userRate = (userRate / 100) * marketRates.cdi;
            } else if (rateType === 'selic') {
                userRate = (userRate / 100) * marketRates.selic;
            } else if (rateType === 'ipca') {
                userRate = ((1 + marketRates.ipca / 100) * (1 + userRate / 100) - 1) * 100;
            }

            const rateFreq = parseInt(document.getElementById('si-rate-freq').value);
            const rate = userRate * rateFreq;
            const userYears = parseFloat(document.getElementById('si-years').value);
            const timeFreq = parseInt(document.getElementById('si-time-freq').value);
            const years = userYears / timeFreq;
            const hasDeposit = document.getElementById('si-has-deposit').checked;
            const depositAmount = hasDeposit ? (parseFloat(document.getElementById('si-deposit').value) || 0) : 0;
            const depositFreq = parseInt(document.getElementById('si-deposit-freq').value);

            const result = calculateSimpleInterest(principal, rate, years, depositAmount, depositFreq);
            updateSummaryUI({
                netBalance: result.totalBalance,
                grossBalance: result.totalBalance,
                netInterest: result.totalInterest,
                initialPrincipal: principal,
                totalDeposits: result.totalPrincipal - principal,
                tax: 0,
                taxRate: 0
            });
            
            renderCharts(result.schedule, { principal: result.totalPrincipal, interest: result.totalInterest, tax: 0 });

        } else if (formId === 'time-to-goal-form') {
            const target = parseFloat(document.getElementById('tg-target').value);
            const principal = parseFloat(document.getElementById('tg-principal').value);
            const hasDeposit = document.getElementById('tg-has-deposit').checked;
            const deposit = hasDeposit ? (parseFloat(document.getElementById('tg-deposit').value) || 0) : 0;
            const depositFreq = parseInt(document.getElementById('tg-deposit-freq').value);
            const userRate = parseFloat(document.getElementById('tg-rate').value);
            const rateFreq = parseInt(document.getElementById('tg-rate-freq').value);
            const rate = userRate * rateFreq;
            
            const taxEnabled = document.getElementById('tg-has-tax').checked;
            const taxPreset = document.getElementById('tg-tax-preset').value;
            const taxRateVal = parseFloat(document.getElementById('tg-tax-rate').value) || 0;

            const years = calculateTimeToGoal(target, principal, deposit, depositFreq, rate, taxEnabled, taxPreset, taxRateVal);
            const goalValue = document.getElementById('goal-result-value');
            const goalTitle = document.getElementById('goal-result-title');
            
            goalTitle.textContent = "Tempo Estimado";
            if (years === -1) {
                goalValue.textContent = "Inalcançável";
            } else {
                goalValue.textContent = `${years.toFixed(1)} Anos (${Math.ceil(years * 12)} Meses)`;
                
                let taxRateToChart = 0;
                if (taxEnabled) {
                    let avgYears = years;
                    if (taxPreset === 'br-regressiva') {
                        if (deposit > 0) {
                            const totalDep = deposit * depositFreq * years;
                            avgYears = (principal * years + totalDep * (years / 2)) / (principal + totalDep);
                        }
                        if (avgYears <= 0.5) taxRateToChart = 22.5;
                        else if (avgYears <= 1.0) taxRateToChart = 20.0;
                        else if (avgYears <= 2.0) taxRateToChart = 17.5;
                        else taxRateToChart = 15.0;
                    } else {
                        taxRateToChart = taxRateVal;
                    }
                }

                const result = calculateCompoundInterest({
                    principal, annualRate: rate, years: Math.ceil(years), compoundFreq: 12, 
                    depositAmount: deposit, depositFreq: depositFreq, depositAtEnd: true, 
                    taxRate: taxRateToChart, taxAnnually: false
                });
                renderCharts(result.schedule, { principal: result.totalPrincipal, interest: result.totalInterest, tax: result.totalTax });
            }

        } else if (formId === 'rate-to-goal-form') {
            const target = parseFloat(document.getElementById('rg-target').value);
            const principal = parseFloat(document.getElementById('rg-principal').value);
            const hasDeposit = document.getElementById('rg-has-deposit').checked;
            const deposit = hasDeposit ? (parseFloat(document.getElementById('rg-deposit').value) || 0) : 0;
            const depositFreq = parseInt(document.getElementById('rg-deposit-freq').value);
            const userYears = parseFloat(document.getElementById('rg-years').value);
            const timeFreq = parseInt(document.getElementById('rg-time-freq').value);
            const years = userYears / timeFreq;
            const rateDisplayFreq = parseInt(document.getElementById('rg-rate-freq').value);
            
            const taxEnabled = document.getElementById('rg-has-tax').checked;
            const taxPreset = document.getElementById('rg-tax-preset').value;
            const taxRateVal = parseFloat(document.getElementById('rg-tax-rate').value) || 0;

            const annualRate = calculateRateToGoal(target, principal, deposit, depositFreq, years, taxEnabled, taxPreset, taxRateVal);
            const displayRate = annualRate / rateDisplayFreq;

            const goalTitle = document.getElementById('goal-result-title');
            const goalValue = document.getElementById('goal-result-value');

            goalTitle.textContent = rateDisplayFreq === 12 ? "Taxa Mensal Necessária" : "Taxa Anual Necessária";
            goalValue.textContent = displayRate.toFixed(2) + "%";

            let taxRateToChart = 0;
            if (taxEnabled) {
                let avgYears = years;
                if (taxPreset === 'br-regressiva') {
                    if (deposit > 0) {
                        const totalDep = deposit * depositFreq * years;
                        avgYears = (principal * years + totalDep * (years / 2)) / (principal + totalDep);
                    }
                    if (avgYears <= 0.5) taxRateToChart = 22.5;
                    else if (avgYears <= 1.0) taxRateToChart = 20.0;
                    else if (avgYears <= 2.0) taxRateToChart = 17.5;
                    else taxRateToChart = 15.0;
                } else {
                    taxRateToChart = taxRateVal;
                }
            }

            const result = calculateCompoundInterest({
                principal, annualRate: annualRate, years, compoundFreq: 12, 
                depositAmount: deposit, depositFreq: depositFreq, depositAtEnd: true, 
                taxRate: taxRateToChart, taxAnnually: false
            });
            renderCharts(result.schedule, { principal: result.totalPrincipal, interest: result.totalInterest, tax: result.totalTax });
        }
        
        populatePrintParameters(formId);
    }

    function populatePrintParameters(formId) {
        const form = document.getElementById(formId);
        const list = document.getElementById('print-parameters-list');
        list.innerHTML = '';
        
        const groups = form.querySelectorAll('.form-group');
        groups.forEach(group => {
            if (group.style.display === 'none' || group.closest('.hidden') && group.closest('.hidden') !== form) return;
            
            const label = group.querySelector('label');
            if (!label) return;
            
            const input = group.querySelector('input, select');
            if (!input) return;
            
            let val = '';
            if (input.tagName === 'SELECT') {
                val = input.options[input.selectedIndex].text;
            } else if (input.type === 'checkbox') {
                val = input.checked ? 'Sim' : 'Não';
            } else {
                val = input.value;
            }
            
            if (val !== '') {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${label.textContent}:</strong> ${val}`;
                list.appendChild(li);
            }
        });

        const dateEl = document.getElementById('print-date');
        const now = new Date();
        dateEl.textContent = `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;
    }

    function updateSummaryUI(data) {
        document.getElementById('result-net-balance').textContent = formatCurrency(data.netBalance);
        document.getElementById('result-gross-balance').textContent = formatCurrency(data.grossBalance);
        document.getElementById('result-net-interest').textContent = formatCurrency(data.netInterest);
        document.getElementById('result-initial-principal').textContent = formatCurrency(data.initialPrincipal);
        document.getElementById('result-deposits').textContent = formatCurrency(data.totalDeposits);
        document.getElementById('result-tax').textContent = formatCurrency(data.tax);
        
        const rateEl = document.getElementById('result-tax-rate');
        if (data.taxRate > 0) {
            // Remove the .0 if it's an integer (e.g., 20.0% -> 20%)
            rateEl.textContent = `Alíquota Aplicada: ${data.taxRate.toFixed(1).replace('.0', '')}%`;
            rateEl.classList.remove('hidden');
        } else {
            rateEl.classList.add('hidden');
        }
    }

    document.getElementById('btn-export-pdf').addEventListener('click', () => {
        if (typeof growthChartInstance === 'undefined' || !breakdownChartInstance) {
            window.print();
            return;
        }

        // Gráficos já possuem excelente contraste de fábrica.
        // Basta disparar a impressão nativa e deixar que o CSS 
        // arrume o grid para a folha A4.
        window.print();
    });

    handleCalculation('compound-interest-form');
    goalPanel.classList.add('hidden');
});
