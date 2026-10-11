export const TAX_BY_STATE = {
  'Baden-Württemberg':5,'Bayern':3.5,'Berlin':6,'Brandenburg':6.5,
  'Bremen':5.5,'Hamburg':5.5,'Hessen':6,'Mecklenburg-Vorpommern':6,
  'Niedersachsen':5,'Nordrhein-Westfalen':6.5,'Rheinland-Pfalz':5,
  'Saarland':6.5,'Sachsen':5.5,'Sachsen-Anhalt':5,'Schleswig-Holstein':6.5,'Thüringen':5
};
export const TAX_SOURCE = 'Vorschläge, Rechtsstand 11.10.2026; auf Kaufdatum und Einzelfall prüfen. Quellen: finanzamt.brandenburg.de/fa/de/steuern/steuerinformationen/grunderwerbsteuer/ und service.bremen.de/dienstleistungen/grunderwerbsteuer-9673';
export const DEFAULT_OPERATING = [
  ['Grundsteuer',25,100], ['Kaltwasser',30,100], ['Abwasser',20,100],
  ['Heizung',115,100], ['Warmwasser',50,100], ['Allgemeinstrom',8,100],
  ['Müllabfuhr',12,100], ['Straßenreinigung',5,100], ['Treppenhausreinigung',7,100],
  ['Gartenpflege',5,100], ['Hausmeister (umlagefähiger Anteil)',8,100],
  ['Gebäudeversicherung',10,100], ['Gebäudehaftpflicht',2,100],
  ['Aufzugsbetrieb',0,100], ['Schornsteinfeger',0,100], ['Technische Wartung',0,100],
  ['Verbrauchserfassung',3,100], ['Heizkostenabrechnung',0,100], ['Sonstige Betriebskosten',0,0]
];
export const CHECKLIST = {
  'Recht & Unterlagen':['Grundbuchauszug','Teilungserklärung und Gemeinschaftsordnung','Beschlusssammlung','Aufteilungsplan','Sondernutzungsrechte','Baulasten, Erbbaurecht und Bindungen'],
  'WEG & Finanzen':['Wirtschaftspläne','Jahresabrechnungen','Aktueller Rücklagenstand','Protokolle der letzten 3–5 Jahre','Beschlossene und diskutierte Sonderumlagen','Verwaltung, Rechtsstreitigkeiten und Zahlungsrückstände'],
  'Bauzustand':['Dach und Fassade','Fenster und Balkone','Heizung und Warmwasser','Leitungen und Elektrik','Feuchtigkeit und Schimmel','Energieausweis und Sanierungspflichten','Gemeinschafts- vs. Sondereigentum'],
  'Vermietung':['Mietvertrag und Kündigungsschutz','Mietrückstände','Nebenkostenabrechnungen','Kaution und deren Übergabe','Mietspiegel und Mietpreisbremse','Realistische Marktmiete und Nachfrage'],
  'Standort':['Bevölkerung und Arbeitsmarkt','ÖPNV und Infrastruktur','Vergleichsangebote','Leerstandsrisiko','Lärm, Umfeld und Wiederverkaufbarkeit'],
  'Eigene Finanzierbarkeit':['Eigenkapital und Reserve','Zinsanstieg tragbar','Mehrere Monate ohne Miete überbrückbar','Sonderumlage tragbar','Andere Kredite und Haushaltsbudget']
};
export const SCENARIO_DEFAULT = {
  rate:4.0, followRate:6.0, vacancyMonths:2, additionalCosts:150,
  costGrowth:4, rentGrowth:0, valueGrowth:-1, specialCharge:5000
};
export function makeProject(empty=false) {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random());
  const operating = DEFAULT_OPERATING.map(([name,amount,tenantShare])=>({name,amount:empty?0:amount,inHouse:true,tenantShare}));
  return {
    id, example:!empty, createdAt:new Date().toISOString(),
    property: {
      name:empty?'Neue Immobilie':'Musterwohnung · Fiktives Beispiel', address:empty?'':'Musterstraße 12',
      zip:empty?'':'50667',city:empty?'':'Köln', state:'Nordrhein-Westfalen',type:'Eigentumswohnung',
      year:empty?0:1995, renovatedYear:0, area:empty?0:65, rooms:empty?0:2,
      floor:empty?'':'2',energyClass:'unbekannt', heating:'unbekannt', energySource:'unbekannt',
      occupancy:'vermietet', rentBrake:'unknown',purchaseDate:'2026-11-01',rentStart:'2026-11-01',
      defects:'', modernizations:'', details:''
    },
    acquisition: {
      price:empty?0:200000, transferTax:6.5,notary:{type:'pct',value:empty?0:1.5},
      landRegistry:{type:'pct',value:empty?0:0.5}, broker:{type:'pct',value:empty?0:3.57},
      mortgageRegistration:0, valuation:0,financingCosts:0,otherFees:0,
      renovation:empty?0:5000,modernization:0,kitchen:0,otherInitial:0,buffer:empty?0:10000
    },
    finance: {
      mode:'100', manualLoan:0, availableEquity:empty?0:45000, rate:empty?0:3.8,
      repayment:empty?0:2, fixedYears:10,followRate:empty?null:4.5,followRepayment:2,
      manualPayment:0,followPayment:0,termYears:0, extraAnnual:0,extraMonth:12,
      interestOnlyMonths:0, financeRenovation:false,financeOther:false
    },
    loans:[],
    rent: {
      cold:empty?0:950, parking:empty?0:40,garage:0,furniture:0,other:0,
      advance:empty?0:160,heatAdvance:empty?0:140, vacancyMonths:empty?0:0.5,
      badDebtPercent:empty?0:1, growth:empty?0:1.5
    },
    operating,
    house:{ total:empty?0:445,management:empty?0:50,nonRecoverable:empty?0:0,
      other:empty?0:15,reserve:empty?0:80,wegTotalBalance:0,wegPlannedWorks:''},
    expenses: {propertyManager:empty?0:25,insurance:0,legal:0,taxConsulting:0,bank:0,
      repairs:empty?0:35,letting:0,groundRent:0,other:0,co2Owner:0,
      privateReserve:empty?0:50,transferPrivateReserve:true},
    tax: {enabled:false,marginalRate:empty?0:35,buildingShare:empty?0:80,
      afaRate:empty?0:2,customBasis:0,capitalizedImprovements:0,otherDeductible:0,
      lossPolicy:'none',deductibleLoss:0},
    assumptions:{years:10,costGrowth:empty?0:2,valueGrowth:empty?0:1.5},
    events:[], stress:structuredClone(SCENARIO_DEFAULT),
    sale:{year:10,manualPrice:0,brokerPct:3.57,otherCosts:0,prepaymentPenalty:0,saleTax:0},
    checklist:{}
  };
}
export function storageRead() {
  try {const s=JSON.parse(localStorage.getItem('immocash-v1')||'null');
    if(s && Array.isArray(s.projects) && s.projects.length) return s;
  } catch {} return {projects:[makeProject(false)],activeId:null};
}
export function storageWrite(store) {try{localStorage.setItem('immocash-v1',JSON.stringify(store));return true;}catch{return false;}}
