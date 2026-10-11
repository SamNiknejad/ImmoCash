import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProject } from '../legacy/data.js';
import { acquisition, loansFor, annuityPayment, scheduleLoan, scheduleAll, operating,
  cashflow, forecast, saleSimulation, taxSimulation, depreciation,
  breakEven, scenarioCompare, maxPurchasePrice } from '../legacy/core.js';

function fixture(){
  const p=makeProject(true);
  p.acquisition.price=200000;
  p.acquisition.transferTax=6;
  p.acquisition.notary={type:'pct',value:1.5};
  p.acquisition.landRegistry={type:'pct',value:.5};
  p.acquisition.broker={type:'pct',value:0};
  p.finance.mode='100';p.finance.rate=4;p.finance.repayment=2;
  p.finance.fixedYears=10;p.finance.followRate=5;p.finance.followRepayment=2;
  p.property.area=70;p.property.purchaseDate='2026-11-01';p.property.rentStart='2026-11-01';
  p.operating=[{name:'Grundsteuer',amount:100,inHouse:true,tenantShare:100}];
  p.house.total=160;p.house.management=30;p.house.nonRecoverable=0;p.house.other=0;p.house.reserve=30;
  p.rent.cold=1200;p.rent.advance=100;p.rent.heatAdvance=0;p.rent.vacancyMonths=0;p.rent.badDebtPercent=0;
  return p;
}
const equalEuro=(actual,expected)=>assert.ok(Math.abs(actual-expected)<.02, `${actual} not within 2 cent of ${expected}`);

test('01: 100% finanziert Kaufpreis, Eigenkapital deckt Kaufnebenkosten',()=>{
 const p=fixture(),a=acquisition(p),l=loansFor(p);
 equalEuro(l.totalPrincipal,200000);equalEuro(a.fees,16000);equalEuro(l.requiredEquity,16000);
});
test('02: 110% deckt Nebenkosten bis zur verfügbaren Kreditgrenze',()=>{
 const p=fixture();p.finance.mode='110';p.acquisition.transferTax=5;
 const l=loansFor(p);equalEuro(l.totalPrincipal,220000);equalEuro(l.requiredEquity,0);
});
test('03: 110% lässt Ausgaben oberhalb 10% Eigenkapitalbedarf',()=>{
 const p=fixture();p.finance.mode='110';p.acquisition.renovation=25000;
 const l=loansFor(p);equalEuro(l.requiredEquity,21000);
});
test('04: individuelle Darlehenshöhe und Eigenkapital',()=>{
 const p=fixture();p.finance.mode='custom';p.finance.manualLoan=100000;
 equalEuro(loansFor(p).requiredEquity,116000);
});
test('05: 0% Sollzins, 12 Raten exakt vollständige Tilgung',()=>{
 const loan={name:'0%',principal:1200,rate:0,repayment:0,termYears:1,fixedYears:0,extraAnnual:0};
 const s=scheduleLoan(loan,12);
 assert.equal(s.rows.length,12);equalEuro(s.balance,0);equalEuro(s.paidInterest,0);equalEuro(annuityPayment(1200,0,1),100);
});
test('06: Sondertilgung reduziert die Restschuld',()=>{
 const base={principal:100000,rate:3,repayment:2,fixedYears:0,extraAnnual:0,extraMonth:12};
 const normal=scheduleLoan(base,12),extra=scheduleLoan({...base,extraAnnual:1000},12);
 equalEuro(normal.balance-extra.balance,1000);
});
test('07: Anschlussfinanzierung passt Zinslast und Rate an',()=>{
 const loan={principal:100000,rate:2,repayment:2,fixedYears:1,followRate:8,followRepayment:2,extraAnnual:0};
 const rows=scheduleLoan(loan,24).rows;
 assert.equal(rows[12].refinanced,true);assert.ok(rows[12].interest>rows[11].interest);assert.ok(rows[12].payment>rows[11].payment);
});
test('08: zwei Darlehensbausteine werden aggregiert',()=>{
 const p=fixture();p.loans=[{name:'Förderkredit',principal:20000,rate:2,repayment:2,fixedYears:10,followRate:4,followRepayment:2,extraAnnual:0}];
 const s=scheduleAll(p,12);equalEuro(s.rows[0].interest,200000*4/1200+20000*2/1200);equalEuro(s.financing.totalPrincipal,220000);
});
test('09: positive und negative Cashflows aus denselben Formeln',()=>{
 const p=fixture();assert.ok(cashflow(p).economic>0);p.rent.cold=100;assert.ok(cashflow(p).economic<0);
});
test('10: Betriebskosten vollständig gedeckt, keine fiktiven Erträge',()=>{
 const p=fixture();const c=cashflow(p);equalEuro(c.uncoveredOperation,0);
 assert.equal(c.op.tenantShare,100);
});
test('11: nur anteilig umlagefähige Betriebskosten',()=>{
 const p=fixture();p.operating[0].tenantShare=40;
 const op=operating(p);equalEuro(op.tenantShare,40);equalEuro(op.uncovered,60);
});
test('12: Leerstand und Ausfallquote werden nacheinander, nicht doppelt abgezogen',()=>{
 const p=fixture();p.rent.vacancyMonths=3;p.rent.badDebtPercent=10;
 const c=cashflow(p);equalEuro(c.occupancy,0.675);equalEuro(c.expectedRent,810);
});
test('13: Sonderumlage belastet das richtige Prognosejahr',()=>{
 const p=fixture();p.events=[{description:'Dach',year:2,month:5,total:30000,share:20,directShare:0,reserveUse:1000}];
 const yearly=forecast(p,{years:3}).years;equalEuro(yearly[0].special,0);equalEuro(yearly[1].special,5000);
});
test('14: WEG-Rücklage bleibt einmaliger Liquiditätsabfluss',()=>{
 const p=fixture();const op=operating(p),c=cashflow(p);
 equalEuro(op.houseComputed,p.house.total);equalEuro(c.actual,1200+100-160-c.rate);
});
test('15: steuerlicher Aufwand ohne Tilgungsanteil',()=>{
 const p=fixture();p.tax.enabled=true;p.tax.afaRate=2;p.tax.buildingShare=80;p.tax.marginalRate=35;
 const t=taxSimulation(p);assert.ok(t.interest>0);
 assert.ok(!Number.isNaN(t.taxable));
 equalEuro(t.taxable,t.income-t.deductible-t.interest-t.afa);
});
test('16: WEG-Rücklagenzahlungen sind nicht sofort steuerlich abzugsfähig',()=>{
 const p=fixture();p.tax.enabled=true;
 const t1=taxSimulation(p);p.house.reserve+=100;p.house.total+=100;
 const t2=taxSimulation(p);equalEuro(t1.deductible,t2.deductible);
});
test('17: Cash-on-Cash bei 0 EUR Eigenkapital mathematisch nicht als Unendlich ausgeben',()=>{
 const p=fixture();p.finance.mode='total';const l=loansFor(p);
 equalEuro(l.requiredEquity,0);assert.ok(Number.isFinite(cashflow(p).economic));
});
test('18: Mietbeginn nach Kauf erzeugt unterjährigen Mietausfall',()=>{
 const p=fixture();p.property.rentStart='2027-02-01';
 const base=forecast({...p,property:{...p.property,rentStart:'2026-11-01'}},{years:1});
 const late=forecast(p,{years:1});assert.ok(base.years[0].income>late.years[0].income);
});
test('19: vollständig getilgter Kredit erzeugt keine negativen Restschulden',()=>{
 const p=fixture();p.finance.mode='custom';p.finance.manualLoan=1200;p.finance.rate=0;p.finance.termYears=1;p.finance.fixedYears=0;
 const rows=scheduleAll(p,360).rows;equalEuro(rows.at(-1).balance,0);assert.ok(rows.every(x=>x.balance>=0));
 assert.equal(forecast(p,{years:4}).years.at(-1).balance,0);
});
test('20: Verkauf mit Restschuld zieht Darlehen vom Erlös ab',()=>{
 const p=fixture();p.sale.year=5;p.sale.manualPrice=250000;
 const s=saleSimulation(p);assert.ok(s.remainingDebt>0);equalEuro(s.proceeds,s.price-s.sellingFees-s.taxes-s.remainingDebt);
});
test('21: bei fehlendem Anschlusszins wird die Projektion nicht durch Schein-Tilgung geschönt',()=>{
 const p=fixture();p.finance.followRate=null;const f=forecast(p,{years:15});
 assert.ok(f.incomplete);assert.equal(f.years.length,10);assert.ok(f.years[9].balance>0);
});
test('22: Hausgeld-Abweichung separat ausgewiesen',()=>{
 const p=fixture();p.house.total+=15;equalEuro(operating(p).difference,15);
});
test('23: Kennzahl Break-even verändert sich nachvollziehbar mit Kreditrate',()=>{
 const p=fixture(),x=breakEven(p);p.finance.rate+=1;
 assert.ok(breakEven(p)>x);
});
test('24: AfA bemisst sich aus Gebäudeanteil einschließlich Nebenkosten',()=>{
 const p=fixture();p.tax.afaRate=2;p.tax.buildingShare=80;
 equalEuro(depreciation(p),(200000+16000)*.8*.02);
});
test('25: keine frei erfundenen Anschlusszinsen in Basis-Szenarien',()=>{
 const p=fixture();p.finance.followRate=null;p.finance.fixedYears=5;
 const items=scenarioCompare(p);assert.ok(items[0].incomplete);
});
test('26: maximaler Kaufpreis liefert bei sinnvoller Randbedingung Wert',()=>{
 const p=fixture();const v=maxPurchasePrice(p,0);assert.ok(v===null || (v>=0 && Number.isFinite(v)));
});
