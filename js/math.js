// math.js - Cálculos financeiros essenciais

/**
 * Juros compostos com depósitos periódicos e dedução de impostos
 */
export function calculateCompoundInterest({
    principal,
    annualRate,
    years,
    compoundFreq,
    depositAmount = 0,
    depositFreq = 12,
    depositAtEnd = true,
    taxRate = 0,
    taxAnnually = false
}) {
    const rateDecimal = annualRate / 100;
    const taxDecimal = taxRate / 100;
    
    // Schedules terão unidade de tempo em anos, mas a simulação será feita mês a mês para maior precisão
    let schedule = [];
    let currentBalance = principal;
    let totalPrincipal = principal;
    let totalInterest = 0;
    let totalTaxPaid = 0;
    
    // Simulação iterativa é necessaria para simular a evolução do saldo e montante parcial
    
    const monthsPerYear = 12;
    const totalMonths = years * 12;
    const compoundPeriodsPerYear = compoundFreq;
    const depositsPerYear = depositFreq;
    
    // Passo de simulaão
    let monthlyRate = rateDecimal / 12;
    // capitalização em uma taxa diferente dos juros e depósitos precisa ser convertido para uma taxa efetiva mensal
    
    // Simulacao sera realizada mes a mes
    const simPeriods = years * 12; // Duração em meses
    
    for (let month = 1; month <= simPeriods; month++) {
        let startBalance = currentBalance;
        let interestThisMonth = 0;
        let depositThisMonth = 0;
        
        // Aportes
        let isDepositMonth = (month % (12 / depositsPerYear)) === 0;
        if (isDepositMonth && !depositAtEnd) {
            currentBalance += depositAmount;
            depositThisMonth += depositAmount;
            totalPrincipal += depositAmount;
        }
        
        // converte a unidade de tempo e valor da taxa com base na taxa de capitalização (compounding frequency)
        let effectiveMonthlyRate = Math.pow(1 + rateDecimal / compoundFreq, compoundFreq / 12) - 1;
        interestThisMonth = currentBalance * effectiveMonthlyRate;
        currentBalance += interestThisMonth;
        totalInterest += interestThisMonth;
        
        // Aporte ao final do período
        if (isDepositMonth && depositAtEnd) {
            currentBalance += depositAmount;
            depositThisMonth += depositAmount;
            totalPrincipal += depositAmount;
        }
        
        // Taxas anuais
        let taxThisMonth = 0;
        let isYearEnd = (month % 12) === 0;
        if (taxAnnually && isYearEnd) {
            // Taxa sobre os juros acumulados do ano
            let interestThisYear = totalInterest - (schedule.length > 0 ? schedule[schedule.length-1].cumulativeInterest : 0);
            taxThisMonth = interestThisYear * taxDecimal;
            currentBalance -= taxThisMonth;
            totalTaxPaid += taxThisMonth;
        }

        // Pontos de evolução anuais para plotar gráficos com muitos anos de período
        if (isYearEnd || month === simPeriods) {
            schedule.push({
                year: month / 12,
                balance: currentBalance,
                totalPrincipal: totalPrincipal,
                cumulativeInterest: totalInterest,
                cumulativeTax: totalTaxPaid
            });
        }
    }

    // Impostos retidos no saque em vez de anualmente
    if (!taxAnnually && taxRate > 0) {
        let finalTax = totalInterest * taxDecimal;
        currentBalance -= finalTax;
        totalTaxPaid = finalTax;
        
        // ultimo ponto do schedule com impostos deduzidos ja
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

/**
 * Juros simples
 */
export function calculateSimpleInterest(principal, annualRate, years) {
    const interest = principal * (annualRate / 100) * years;
    return {
        totalBalance: principal + interest,
        totalPrincipal: principal,
        totalInterest: interest
    };
}

/**
 * Estimativa de tempo necessário para atingir um montante alvo com base em capital inicial, aportes e taxa de juros
 */
export function calculateTimeToGoal(target, principal, monthlyDeposit, annualRate) {
    // FV = PV * (1+r)^n + PMT * [((1+r)^n - 1) / r]
    // Solução iterativa sobre meses
    
    let balance = principal;
    let months = 0;
    const monthlyRate = (annualRate / 100) / 12;
    
    // Evita aportes negativos ou taxa negativa
    if (balance * monthlyRate + monthlyDeposit <= 0 && target > principal) {
        return -1; 
    }

    // impossível caso passar de 100 anos
    while (balance < target && months < 1200) {
        balance += balance * monthlyRate;
        balance += monthlyDeposit;
        months++;
    }

    return months / 12; // Retorno em anos
}

/**
 * Estima taxa para atingir um montante com base em capital inicial, aportes e período
 */
export function calculateRateToGoal(target, principal, monthlyDeposit, years) {
    const months = years * 12;
    
    // Taxa zero para investimento + aporte maior que meta ao final do período
    if (target <= principal + (monthlyDeposit * months)) {
        return 0;
    }

    let lowRate = 0;
    let highRate = 1.0; // 100%
    let estimatedRate = 0.05;
    
    // Busca binária da taxa
    for (let i = 0; i < 50; i++) {
        estimatedRate = (lowRate + highRate) / 2;
        let monthlyRate = estimatedRate / 12;
        
        let balance = principal;
        for (let m = 0; m < months; m++) {
            balance += balance * monthlyRate;
            balance += monthlyDeposit;
        }
        
        if (balance > target) {
            highRate = estimatedRate;
        } else {
            lowRate = estimatedRate;
        }
    }
    
    return estimatedRate * 100; // Retorna como porcentagem
}
