/** ImmoCash – unabhängige, UI-freie Finanzberechnung.
 *  Alle Beträge in EUR, Prozentsätze in Prozentpunkten (z.B. 3,5 für 3,5 %).
 *  Rundung der Darlehens-Transaktionen auf Cent. Modellannahmen sind keine Prognosegarantie.
 */
export const round = (n, digits = 2) => Number.isFinite(n) ? Number(n.toFixed(digits)) : 0;
export const money = (n) => round(n || 0);
export const clamp = (n, lo = 0, hi = Infinity) => Math.max(lo, Math.min(hi, Number.isFinite(+n) ? +n : lo));
export const sum = (xs) => xs.reduce((a, b) => a + (+b || 0), 0);
const cents = (x) => Math.round((+x || 0) * 100);
const euro = (x) => x / 100;
export function feeAmount(fee, reference) {
  if (!fee) return 0;
  return money(fee.type === 'eur' ? clamp(fee.value) : clamp(reference) * clamp(fee.value) / 100);
}
export function acquisition(p) {
  const a = p.acquisition;
  const purchase = clamp(a.price);
  const components = {
    grunderwerbsteuer: money(purchase * clamp(a.transferTax) / 100),
    notar: feeAmount(a.notary, purchase),
    grundbuch: feeAmount(a.landRegistry, purchase),
    makler: feeAmount(a.broker, purchase),
    grundschuld: clamp(a.mortgageRegistration),
    gutachten: clamp(a.valuation),
    finanzierung: clamp(a.financingCosts),
    sonstige: clamp(a.otherFees),
  };
  const fees = money(sum(Object.values(components)));
  const renovation = money(clamp(a.renovation) + clamp(a.modernization));
  const initialOther = money(clamp(a.kitchen) + clamp(a.otherInitial));
  const total = money(purchase + fees + renovation + initialOther);
  return { purchase, components, fees, renovation, initialOther, total, buffer: clamp(a.buffer), totalWithBuffer: money(total + clamp(a.buffer)) };
}
export function loansFor(p, cost = acquisition(p)) {
  const f = p.finance;
  const principal = f.mode === '100' ? cost.purchase
    : f.mode === '110' ? cost.purchase * 1.1
    : f.mode === 'total' ? cost.purchase + cost.fees + (f.financeRenovation ? cost.renovation : 0) + (f.financeOther ? cost.initialOther : 0)
    : clamp(f.manualLoan);
  const main = {
    name: 'Hauptdarlehen', principal: money(principal), rate: clamp(f.rate), repayment: clamp(f.repayment),
    fixedYears: clamp(f.fixedYears, 0, 50), followRate: f.followRate === '' || f.followRate == null ? null : clamp(f.followRate),
    followRepayment: clamp(f.followRepayment), manualPayment: clamp(f.manualPayment),
    followPayment: clamp(f.followPayment), termYears: clamp(f.termYears),
    extraAnnual: clamp(f.extraAnnual), extraMonth: clamp(f.extraMonth || 12, 1, 12),
    interestOnlyMonths: clamp(f.interestOnlyMonths, 0, 600),
  };
  const other = (p.loans || []).filter(l => clamp(l.principal) > 0).map(l => ({
    ...l, principal: clamp(l.principal), rate: clamp(l.rate), repayment: clamp(l.repayment),
    fixedYears: clamp(l.fixedYears, 0, 50),
    followRate: l.followRate === '' || l.followRate == null ? null : clamp(l.followRate),
    followRepayment: clamp(l.followRepayment), manualPayment: clamp(l.manualPayment),
    extraAnnual: clamp(l.extraAnnual), extraMonth: clamp(l.extraMonth || 12, 1, 12),
  }));
  const loans = [main, ...other].filter(l => l.principal > 0);
  const totalPrincipal = money(sum(loans.map(l => l.principal)));
  return {
    loans, totalPrincipal,
    requiredEquity: money(Math.max(0, cost.total - totalPrincipal)),
    unusedFunding: money(Math.max(0, totalPrincipal - cost.total)),
    cashNeedWithBuffer: money(Math.max(0, cost.total - totalPrincipal) + cost.buffer),
    loanToPrice: cost.purchase > 0 ? round(totalPrincipal / cost.purchase * 100) : null,
  };
}
export function annuityPayment(principal, annualRate, termYears) {
  const principalC = cents(principal);
  const r = clamp(annualRate) / 1200;
  const n = Math.max(1, Math.round(termYears * 12));
  return euro(Math.round(r === 0 ? principalC / n : principalC * r / (1 - Math.pow(1+r, -n))));
}
export function scheduleLoan(loan, months = 600) {
  const max = Math.min(600, Math.max(0, Math.floor(months)));
  let balance = cents(clamp(loan.principal));
  const original = balance;
  const rows = [];
  let rate = clamp(loan.rate);
  let repayment = clamp(loan.repayment);
  let payment = cents(clamp(loan.manualPayment) > 0 ? loan.manualPayment
    : clamp(loan.termYears) > 0 ? annuityPayment(euro(balance), rate, loan.termYears)
    : euro(balance) * (rate + repayment) / 1200);
  let issue = null;
  let refinanced = false;
  const fixedMonths = Math.round(clamp(loan.fixedYears, 0, 50) * 12);
  for (let m = 1; m <= max && balance > 0; m++) {
    if (fixedMonths > 0 && m === fixedMonths + 1) {
      if (loan.followRate == null || loan.followRate === '') {
        issue = `Anschlusszins für ${loan.name || 'Darlehen'} nach ${loan.fixedYears} Jahren fehlt; Prognose endet dort.`;
        break;
      }
      rate = clamp(loan.followRate);
      repayment = clamp(loan.followRepayment);
      payment = cents(clamp(loan.followPayment) > 0 ? loan.followPayment : euro(balance) * (rate + repayment) / 1200);
      refinanced = true;
    }
    const opening = balance;
    const interest = Math.round(balance * rate / 1200);
    const scheduled = m <= clamp(loan.interestOnlyMonths) ? interest : payment;
    if (scheduled < interest) {
      issue = `Monatsrate für ${loan.name || 'Darlehen'} deckt die laufenden Zinsen ab Monat ${m} nicht.`;
      break;
    }
    if (scheduled <= interest && !(clamp(loan.extraAnnual) > 0)) {
      issue = `Darlehen ${loan.name || ''} wird bei dieser Rate nicht getilgt. Bitte Tilgung oder Rate erhöhen.`;
      break;
    }
    const repaid = Math.min(balance, Math.max(0, scheduled - interest));
    balance -= repaid;
    const extra = Math.min(balance, (m % 12 === Math.round(clamp(loan.extraMonth || 12, 1, 12)) % 12) ? cents(clamp(loan.extraAnnual)) : 0);
    balance -= extra;
    rows.push({ month: m, opening: euro(opening), interest: euro(interest), repayment: euro(repaid), extra: euro(extra), payment: euro(interest + repaid + extra), balance: euro(balance), annualRate: rate, refinanced: refinanced && m === fixedMonths + 1 });
  }
  return { rows, original: euro(original), balance: euro(balance), issue,
    payoffMonth: balance === 0 ? rows.at(-1)?.month ?? 0 : null,
    paidInterest: money(sum(rows.map(r => r.interest))), paidPrincipal: money(sum(rows.map(r => r.repayment + r.extra))) };
}
export function scheduleAll(p, months = 600) {
  const financing = loansFor(p);
  const schedules = financing.loans.map(l => scheduleLoan(l, months));
  const records = [];
  // Eine unbekannte Anschlussfinanzierung darf nicht als getilgtes Darlehen durchfallen.
  // Beende die aggregierte Prognose, sobald einem noch offenen Baustein Monatsdaten fehlen.
  const horizon = Math.max(0, ...schedules.map(s => s.rows.length));
  for (let i = 0; i < horizon; i++) {
    if (schedules.some(s => i >= s.rows.length && s.balance > 0.005)) break;
    const current = schedules.map((s,j) => s.rows[i] || { month: i + 1, opening: 0, interest: 0, repayment: 0, extra: 0, payment: 0, balance: 0 });
    records.push({ month: i + 1,
      payment: money(sum(current.map(r => r.payment))),
      interest: money(sum(current.map(r => r.interest))),
      repayment: money(sum(current.map(r => r.repayment))),
      extra: money(sum(current.map(r => r.extra))),
      balance: money(sum(current.map(r => r.balance))),
      paidInterest: 0 });
  }
  let interestTotal = 0;
  records.forEach(r => { interestTotal = money(interestTotal + r.interest); r.paidInterest = interestTotal; });
  return { loans: financing.loans, financing, schedules, rows: records,
    issue: schedules.map(s => s.issue).filter(Boolean),
    totalInterest: money(sum(schedules.map(s => s.paidInterest))),
    fullPayoffMonth: schedules.every(s => s.payoffMonth != null) ? Math.max(0,...schedules.map(s => s.payoffMonth)) : null };
}
export function operating(p) {
  const items = p.operating || [];
  const within = money(sum(items.filter(x => x.inHouse).map(x => clamp(x.amount))));
  const outside = money(sum(items.filter(x => !x.inHouse).map(x => clamp(x.amount))));
  const total = money(within + outside);
  const tenantShare = money(sum(items.map(x => clamp(x.amount) * clamp(x.tenantShare, 0, 100) / 100)));
  const house = p.house;
  const nonRecoverableHouse = money(clamp(house.management) + clamp(house.nonRecoverable) + clamp(house.other));
  const houseComputed = money(within + nonRecoverableHouse + clamp(house.reserve));
  const difference = money(clamp(house.total) - houseComputed);
  return { within, outside, total, tenantShare, uncovered: money(total - tenantShare),
    nonRecoverableHouse, reserve: clamp(house.reserve), houseComputed, difference,
    totalHouse: clamp(house.total) };
}
export function rentalIncome(p, year = 0) {
  const r = p.rent;
  const factor = Math.pow(1 + clamp(r.growth, -100, 100) / 100, year);
  return money((clamp(r.cold) + clamp(r.parking) + clamp(r.garage) + clamp(r.furniture) + clamp(r.other)) * factor);
}
export function ownerExpenses(p, year = 0) {
  const x = p.expenses;
  const base = sum([x.propertyManager, x.insurance, x.legal, x.taxConsulting, x.bank,
    x.repairs, x.letting, x.groundRent, x.other, x.co2Owner]);
  const inflation = Math.pow(1 + clamp(p.assumptions.costGrowth, -100, 100) / 100, year);
  return money(base * inflation);
}
export function occupancyFactor(p, overrides = {}) {
  const vacancy = clamp(overrides.vacancyMonths ?? p.rent.vacancyMonths, 0, 12) / 12;
  const badDebt = clamp(overrides.badDebtPercent ?? p.rent.badDebtPercent, 0, 100) / 100;
  return (1 - vacancy) * (1 - badDebt);
}
export function cashflow(p, overrides = {}) {
  const calc = scheduleAll(p, 12);
  const op = operating(p);
  const rent = rentalIncome(p);
  const eff = occupancyFactor(p, overrides);
  const rate = calc.rows[0]?.payment || 0;
  const owner = ownerExpenses(p);
  const privateBudget = clamp(p.expenses.privateReserve);
  const expectedOp = money(op.tenantShare * eff);
  const economic = money(rent * eff + expectedOp - op.total - op.nonRecoverableHouse - op.reserve - owner - privateBudget - rate);
  const cashReserve = p.expenses.transferPrivateReserve ? privateBudget : 0;
  const advances = clamp(p.rent.advance) + clamp(p.rent.heatAdvance);
  const actual = money(rent + advances - op.totalHouse - op.outside - owner - rate - cashReserve);
  const annualCashflow = money(economic * 12);
  return { actual, economic, annualCashflow, rate,
    expectedRent: money(rent * eff), actualRent: rent, tenantPayments: advances,
    expectedOp, owner, privateBudget, cashReserve, op, occupancy: eff,
    costToCover: money(op.total + op.nonRecoverableHouse + op.reserve + owner + privateBudget + rate - expectedOp),
    uncoveredOperation: money(op.total - expectedOp),
    bridge: money(actual - economic) };
}
export function depreciation(p, year = 0) {
  const a = acquisition(p);
  const t = p.tax;
  const rate = clamp(t.afaRate);
  const buildingShare = clamp(t.buildingShare, 0, 100) / 100;
  // Gebäudebezogene Anschaffungsnebenkosten; gesonderte bewegliche Wirtschaftsgüter ausgeschlossen.
  const basis = t.customBasis > 0 ? clamp(t.customBasis) : (a.purchase + a.fees) * buildingShare + clamp(t.capitalizedImprovements);
  return money(basis * rate / 100);
}
export function taxSimulation(p, period = {}) {
  if (!p.tax.enabled) return null;
  const c = cashflow(p);
  const op = c.op;
  const interest = period.annualInterest ?? sum(scheduleAll(p, 12).rows.map(r=>r.interest));
  const income = period.income ?? (c.expectedRent + c.expectedOp) * 12;
  const yearIndex = period.yearIndex ?? 0;
  const scale = Math.pow(1 + clamp(p.assumptions.costGrowth, -100, 100) / 100, yearIndex);
  const deductible = (op.total + op.nonRecoverableHouse + c.owner) * scale * 12 + clamp(p.tax.otherDeductible) * 12;
  const afa = depreciation(p, yearIndex);
  const taxable = money(income - deductible - interest - afa);
  let effect = 0;
  const rate = clamp(p.tax.marginalRate, 0, 100) / 100;
  if (taxable >= 0) effect = -money(taxable * rate);
  else if (p.tax.lossPolicy === 'full') effect = money(-taxable * rate);
  else if (p.tax.lossPolicy === 'partial') effect = money(Math.min(-taxable, clamp(p.tax.deductibleLoss)) * rate);
  return { income: money(income), deductible: money(deductible), interest: money(interest), afa,
    taxable, effect, perMonth: money(effect / 12), afterTax: money(c.economic + effect / 12) };
}
export function breakEven(p, target = 0) {
  const c = cashflow(p);
  const multiplier = c.occupancy;
  if (multiplier <= 0) return null;
  // Zusatzerträge und umgelegte Kosten bleiben konstant; gesucht ist die Nettokaltmiete.
  const otherRents = sum([p.rent.parking, p.rent.garage, p.rent.furniture, p.rent.other]);
  const cold = (c.op.total + c.op.nonRecoverableHouse + c.op.reserve + c.owner + c.privateBudget + c.rate - c.expectedOp + target) / multiplier - otherRents;
  return money(Math.max(0, cold));
}
export function forecast(p, options = {}) {
  const nYears = Math.max(1, Math.min(50, Math.round(options.years || p.assumptions.years || 10)));
  const applied = structuredClone(p);
  if (options.rentGrowth != null) applied.rent.growth = options.rentGrowth;
  if (options.costGrowth != null) applied.assumptions.costGrowth = options.costGrowth;
  if (options.followRate != null) applied.finance.followRate = options.followRate;
  if (options.vacancyMonths != null) applied.rent.vacancyMonths = options.vacancyMonths;
  if (options.badDebtPercent != null) applied.rent.badDebtPercent = options.badDebtPercent;
  const loans = scheduleAll(applied, nYears * 12);
  const op = operating(applied);
  const start = new Date(`${applied.property.purchaseDate || '2026-01-01'}T12:00:00`);
  const rentalStart = new Date(`${applied.property.rentStart || applied.property.purchaseDate || '2026-01-01'}T12:00:00`);
  const factor = occupancyFactor(applied);
  const events = applied.events || [];
  const yearly = [];
  let cumulative = 0;
  let lastBalance = loans.financing.totalPrincipal;
  let incomplete = false;
  for (let y=0; y<nYears; y++) {
    let income = 0, operCost = 0, ownerCost = 0, reserves = 0, debtPaid = 0, interest = 0, principalPaid = 0, expenseSpecial = 0;
    let yearHasMissingFinancing = false;
    for (let m=0; m<12; m++) {
      const i = y*12+m;
      const date = new Date(start.getFullYear(),start.getMonth()+i,15);
      const row = loans.rows[i];
      if (!row && lastBalance > 0.01) { yearHasMissingFinancing = true; break; }
      const scale = Math.pow(1+clamp(applied.assumptions.costGrowth,-100,100)/100,y);
      const rent = date >= rentalStart ? rentalIncome(applied,y) * factor : 0;
      // Entfallene Vorauszahlungen werden in Prognosen als periodengerechte Kostenerstattung modelliert.
      const tenantOp = date >= rentalStart ? op.tenantShare * factor * scale : 0;
      income += rent + tenantOp;
      operCost += op.total * scale;
      ownerCost += op.nonRecoverableHouse * scale + ownerExpenses(applied,y);
      reserves += (op.reserve + clamp(applied.expenses.privateReserve)) * scale;
      debtPaid += row?.payment || 0;
      interest += row?.interest || 0;
      principalPaid += (row?.repayment || 0) + (row?.extra || 0);
      if (row) lastBalance = row.balance;
      // Einzelereignisse; Eigentümeranteil abzüglich bereits vorhandener WEG-Mittel.
      for (const event of events) if (Math.round(+event.year)===y+1 && Math.round(+event.month || 12)===m+1) {
        const attributable = clamp(event.directShare > 0 ? event.directShare : clamp(event.total) * clamp(event.share,0,100)/100);
        expenseSpecial += Math.max(0, attributable - clamp(event.reserveUse));
      }
    }
    if (yearHasMissingFinancing) { incomplete = true; break; }
    const cf = money(income-operCost-ownerCost-reserves-debtPaid-expenseSpecial);
    cumulative = money(cumulative+cf);
    const marketValue = money(acquisition(applied).purchase * Math.pow(1+clamp(options.valueGrowth ?? applied.assumptions.valueGrowth,-100,100)/100,y+1));
    const taxable = applied.tax.enabled ? taxSimulation(applied, { yearIndex:y, income, annualInterest:interest }) : null;
    const taxEffect = taxable?.effect || 0;
    yearly.push({ year: y+1, calendarYear: start.getFullYear() + Math.floor((start.getMonth()+y*12)/12),
      income: money(income), operCost: money(operCost), ownerCost: money(ownerCost), reserves: money(reserves),
      debtPaid: money(debtPaid), interest: money(interest), repayment: money(principalPaid),
      special: money(expenseSpecial), cashflow: cf, cumulative,
      taxResult: taxable?.taxable ?? null, taxEffect: money(taxEffect), afterTax: money(cf + taxEffect),
      balance: money(lastBalance), marketValue, propertyEquity: money(marketValue-lastBalance) });
  }
  return { years: yearly, incomplete, issue: loans.issue, loans };
}
export function saleSimulation(p) {
  const s = p.sale;
  const atYear = Math.round(clamp(s.year,1,50));
  const fc = forecast(p,{years:atYear});
  const end = fc.years.at(-1);
  if (!end || end.year!==atYear) return null;
  const price = s.manualPrice > 0 ? clamp(s.manualPrice) : end.marketValue;
  const sellingFees = money(price * clamp(s.brokerPct)/100 + clamp(s.otherCosts) + clamp(s.prepaymentPenalty));
  const taxes = clamp(s.saleTax);
  const proceeds = money(price-sellingFees-end.balance-taxes);
  const equity = loansFor(p).requiredEquity;
  return { price, sellingFees, taxes, remainingDebt:end.balance, proceeds,
    operatingCashflows:end.cumulative, initialEquity:equity,
    result: money(proceeds+end.cumulative-equity), year:atYear };
}
export function stressScenario(p, adjustments={}) {
  const q=structuredClone(p);
  if (adjustments.rate != null) q.finance.rate=+adjustments.rate;
  if (adjustments.followRate != null) q.finance.followRate=+adjustments.followRate;
  if (adjustments.vacancyMonths != null) q.rent.vacancyMonths=+adjustments.vacancyMonths;
  if (adjustments.costGrowth != null) q.assumptions.costGrowth=+adjustments.costGrowth;
  if (adjustments.additionalCosts != null) q.expenses.other=clamp(q.expenses.other)+clamp(adjustments.additionalCosts);
  if (adjustments.rentGrowth != null) q.rent.growth=+adjustments.rentGrowth;
  if (adjustments.valueGrowth != null) q.assumptions.valueGrowth=+adjustments.valueGrowth;
  if (adjustments.specialCharge > 0) q.events.push({year:1,month:12,directShare:clamp(adjustments.specialCharge),total:0,share:100,reserveUse:0,description:'Stress-Sonderumlage'});
  return q;
}
export function scenarioCompare(p) {
  const samples = [
    { id:'base', name:'Basis', settings:{} },
    { id:'optimistic', name:'Optimistisch', settings:{vacancyMonths:0,followRate:p.finance.followRate==null?null:Math.max(0,clamp(p.finance.followRate)-1),additionalCosts:0,valueGrowth:clamp(p.assumptions.valueGrowth)+1}},
    { id:'pessimistic', name:'Pessimistisch',settings:{vacancyMonths:3,followRate:p.finance.followRate==null?null:clamp(p.finance.followRate)+2,additionalCosts:150,valueGrowth:clamp(p.assumptions.valueGrowth)-2}},
    { id:'custom', name:'Stress (eigene Werte)',settings:p.stress || {} },
  ];
  return samples.map(s=>{
    const q=stressScenario(p,s.settings);
    const c=cashflow(q), f=forecast(q,{years:10}), last=f.years.at(-1);
    return {name:s.name,id:s.id, cashflow:c.economic, annual:c.annualCashflow,
      equity:loansFor(q).requiredEquity, afterTax:taxSimulation(q)?.afterTax ?? null,
      debt10:last?.balance ?? null, cumulative10:last?.cumulative ?? null,
      propertyEquity10:last?.propertyEquity ?? null, incomplete:f.incomplete};
  });
}
export function maxPurchasePrice(p, target=0) {
  const clone=structuredClone(p);
  let low=0,high=Math.max(500000,clamp(p.acquisition.price)*5);
  function result(x) {clone.acquisition.price=x; return cashflow(clone).economic-target;}
  if (result(0)<0) return null;
  if (result(high)>=0) return null;
  for(let i=0;i<60;i++){const mid=(low+high)/2; if(result(mid)>=0) low=mid; else high=mid;}
  return money(low);
}
export function warnings(p) {
  const warnings=[];
  const ac=acquisition(p), l=loansFor(p,ac), c=cashflow(p), op=operating(p), schedule=scheduleAll(p,360);
  if (c.economic<0) warnings.push({level:'danger',message:`Normalisierter Cashflow negativ: ${Math.abs(c.economic).toFixed(2)} € monatlicher Zuschuss.`});
  if (Math.abs(op.difference)>0.01) warnings.push({level:'warn',message:`Hausgeld-Aufteilung weicht um ${op.difference.toFixed(2)} € vom angegebenen Hausgeld ab. Liquidität nutzt das angegebene Hausgeld; normalisierter Cashflow die Einzelpositionen.`});
  if (p.finance.mode==='110' && l.requiredEquity>0) warnings.push({level:'warn',message:'110-%-Darlehen deckt nicht sämtliche anfänglichen Ausgaben.'});
  if (p.finance.mode!=='custom' && l.totalPrincipal>ac.total+0.01) warnings.push({level:'warn',message:'Kreditbetrag liegt über dem ausgewiesenen Kapitalbedarf. Überschuss ist keine Mieteinnahme.'});
  if (clamp(p.finance.availableEquity)<l.cashNeedWithBuffer) warnings.push({level:'warn',message:'Verfügbares Eigenkapital reicht nicht für Eigenkapitalbedarf und gewünschten Liquiditätspuffer.'});
  if (ac.price===0) warnings.push({level:'warn',message:'Kaufpreis fehlt.'});
  if (op.totalHouse===0) warnings.push({level:'warn',message:'Hausgeld fehlt oder ist null; bitte Unterlagen prüfen.'});
  if (p.house.reserve===0) warnings.push({level:'warn',message:'WEG-Erhaltungsrücklage ist mit 0 € erfasst.'});
  if (p.rent.vacancyMonths===0 && p.rent.badDebtPercent===0) warnings.push({level:'info',message:'Kein Leerstand und kein Mietausfall modelliert; Stressszenario prüfen.'});
  if (schedule.issue.length) warnings.push(...schedule.issue.map(message=>({level:'danger',message})));
  if (schedule.rows.length && schedule.rows.at(-1).balance>0.01 && !schedule.issue.length) warnings.push({level:'info',message:'Am Prognoseende verbleibt Restschuld; Tilgungsverlauf gesondert prüfen.'});
  if (p.tax.enabled) warnings.push({level:'info',message:'Steuerrechnung ist vereinfacht; AfA, anschaffungsnahe Herstellungskosten, Verlustverrechnung und Umlagefähigkeit individuell prüfen.'});
  if (p.property.rentBrake==='unknown') warnings.push({level:'info',message:'Anwendbarkeit der Mietpreisbremse und zulässige Kaltmiete ungeprüft.'});
  return warnings;
}
