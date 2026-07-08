// math.js - Core financial calculations

/**
 * Calculates Compound Interest with periodic deposits and taxes.
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
    
    // We'll simulate this year by year to handle annual taxes properly and generate a schedule.
    let schedule = [];
    let currentBalance = principal;
    let totalPrincipal = principal;
    let totalInterest = 0;
    let totalTaxPaid = 0;
    
    // For simpler calculation without annual tax deduction, use standard formulas, 
    // but for schedule generation, iterative approach is better.
    
    const monthsPerYear = 12;
    const totalMonths = years * 12;
    const compoundPeriodsPerYear = compoundFreq;
    const depositsPerYear = depositFreq;
    
    // Monthly simulation step
    let monthlyRate = rateDecimal / 12;
    // However, if compounding is not monthly, effective monthly rate differs.
    // Standard formula: rate per period = rate / compoundFreq.
    
    // Let's do a granular period simulation based on the highest frequency (usually monthly deposits).
    // To be precise and support daily/monthly/quarterly/annually, we simulate monthly.
    const simPeriods = years * 12; // Simulate month by month
    
    for (let month = 1; month <= simPeriods; month++) {
        let startBalance = currentBalance;
        let interestThisMonth = 0;
        let depositThisMonth = 0;
        
        // Handle Deposit
        let isDepositMonth = (month % (12 / depositsPerYear)) === 0;
        if (isDepositMonth && !depositAtEnd) {
            currentBalance += depositAmount;
            depositThisMonth += depositAmount;
            totalPrincipal += depositAmount;
        }
        
        // Handle Interest
        // Calculate interest based on compounding frequency.
        // E.g., if compounding quarterly, we add interest every 3 months based on balance.
        // A more standard approach is calculating an effective monthly rate for the simulation:
        let effectiveMonthlyRate = Math.pow(1 + rateDecimal / compoundFreq, compoundFreq / 12) - 1;
        interestThisMonth = currentBalance * effectiveMonthlyRate;
        currentBalance += interestThisMonth;
        totalInterest += interestThisMonth;
        
        // Handle Deposit (End of period)
        if (isDepositMonth && depositAtEnd) {
            currentBalance += depositAmount;
            depositThisMonth += depositAmount;
            totalPrincipal += depositAmount;
        }
        
        // Handle Annual Taxes
        let taxThisMonth = 0;
        let isYearEnd = (month % 12) === 0;
        if (taxAnnually && isYearEnd) {
            // Tax is applied to the interest earned this year
            let interestThisYear = totalInterest - (schedule.length > 0 ? schedule[schedule.length-1].cumulativeInterest : 0);
            taxThisMonth = interestThisYear * taxDecimal;
            currentBalance -= taxThisMonth;
            totalTaxPaid += taxThisMonth;
        }

        // Save Annual Data Point for charts (or monthly if needed, but annual is better for long charts)
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

    // Handle tax at the end if not annual
    if (!taxAnnually && taxRate > 0) {
        let finalTax = totalInterest * taxDecimal;
        currentBalance -= finalTax;
        totalTaxPaid = finalTax;
        
        // Update the final schedule point
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
 * Calculates Simple Interest
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
 * Estimates Time to reach a Goal using PMT and PV formulas (approximation)
 */
export function calculateTimeToGoal(target, principal, monthlyDeposit, annualRate) {
    // FV = PV * (1+r)^n + PMT * [((1+r)^n - 1) / r]
    // Solving for n is complex, we will iteratively solve it month by month
    
    let balance = principal;
    let months = 0;
    const monthlyRate = (annualRate / 100) / 12;
    
    // Failsafe: if interest + deposit is <= 0 and target > principal
    if (balance * monthlyRate + monthlyDeposit <= 0 && target > principal) {
        return -1; // Will never reach
    }

    // Cap at 100 years to prevent infinite loops
    while (balance < target && months < 1200) {
        balance += balance * monthlyRate;
        balance += monthlyDeposit;
        months++;
    }

    return months / 12; // Return in years
}

/**
 * Estimates Rate needed to reach a Goal using binary search approximation
 */
export function calculateRateToGoal(target, principal, monthlyDeposit, years) {
    const months = years * 12;
    
    // If target is less than total input, rate is negative or 0
    if (target <= principal + (monthlyDeposit * months)) {
        return 0;
    }

    let lowRate = 0;
    let highRate = 1.0; // 100%
    let estimatedRate = 0.05;
    
    // Binary search for the rate
    for (let i = 0; i < 50; i++) { // 50 iterations is more than enough for precision
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
    
    return estimatedRate * 100; // Return as percentage
}
