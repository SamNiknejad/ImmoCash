import { acquisition, loansFor, scheduleAll, operating, cashflow, depreciation, taxSimulation,
  breakEven, forecast, saleSimulation, scenarioCompare, maxPurchasePrice, warnings,
  rentalIncome, occupancyFactor, round, sum } from './core.js';
import { makeProject, storageRead, storageWrite, TAX_BY_STATE, TAX_SOURCE, CHECKLIST } from './data.js';

const fmt=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2});
const numfmt=new Intl.NumberFormat('de-DE',{maximumFractionDigits:2});
const euro=n=>n==null?'–':fmt.format(n);
const number=n=>n==null?'–':numfmt.format(n);
const percent=n=>n==null?'–':`${number(n)} %`;
const signed=n=>`${n>0?'+':''}${euro(n)}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const yes=n=>n?'Ja':'Nein';
const icon=(name,size=19)=>{
  const paths={
    dashboard:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    inputs:'<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M8 3v5h5M8 3l6 5-6 0"/><path d="m13 15 6-6 3 3-6 6-4 1z"/>',
    finance:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20m-15 5h3"/>',
    analysis:'<path d="M3 3v18h18M7 16l4-5 4 2 5-8"/>',
    scenarios:'<path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    moon:'<path d="M20.9 13.1A9 9 0 0 1 10.9 3.1 9 9 0 1 0 20.9 13.1Z"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4M5 18v3h14v-3"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    chevron:'<path d="m6 9 6 6 6-6"/>',
    menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    alert:'<path d="m12 3 10 18H2zM12 9v4m0 4h.01"/>',
    info:'<circle cx="12" cy="12" r="10"/><path d="M12 10v7M12 7h.01"/>',
    arrow:'<path d="m5 12 14 0m-6-6 6 6-6 6"/>',
    trash:'<path d="M3 6h18M8 6V4h8v2m-11 0 1 15h12l1-15M10 10v7m4-7v7"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.info}</svg>`;
};
let state=storageRead();
if(!state.activeId || !state.projects.some(p=>p.id===state.activeId)) state.activeId=state.projects[0].id;
let page='dashboard',inputTab='kauf',analysisTab='forecast',afterTax=false,menuOpen=false,theme=localStorage.getItem('immocash-theme')||'light';
const app=document.querySelector('#app');
document.documentElement.dataset.theme=theme;
if(!document.querySelector('#print-report'))document.body.insertAdjacentHTML('beforeend','<div id="print-report" class="report-only"></div>');
function p(){return state.projects.find(x=>x.id===state.activeId)||state.projects[0]}
function persist(){storageWrite(state)}
function value(path,obj=p()){return path.split('.').reduce((a,key)=>a?.[key],obj)}
function set(path,v,obj=p()){const keys=path.split('.');let current=obj;for(let i=0;i<keys.length-1;i++)current=current[keys[i]];current[keys.at(-1)]=v;}
function control(label,path,opts={}){
  const val=value(path);
  const id='f-'+path.replaceAll('.','-');
  const hint=opts.hint?`<small>${esc(opts.hint)}</small>`:'';
  const common=`id="${id}" data-path="${esc(path)}"`;
  const full=opts.full?' full':'';
  if(opts.type==='toggle')return `<div class="field${full}"><label for="${id}">${esc(label)}</label><select ${common}><option value="true" ${val?'selected':''}>Ja</option><option value="false" ${!val?'selected':''}>Nein</option></select>${hint}</div>`;
  if(opts.type==='select') return `<div class="field${full}"><label for="${id}">${esc(label)}</label><select ${common}>${(opts.options||[]).map(o=>{const [key,title]=Array.isArray(o)?o:[o,o];return `<option value="${esc(key)}" ${String(val)===String(key)?'selected':''}>${esc(title)}</option>`}).join('')}</select>${hint}</div>`;
  if(opts.type==='textarea')return `<div class="field full"><label for="${id}">${esc(label)}</label><textarea ${common}>${esc(val)}</textarea>${hint}</div>`;
  const isNumber=opts.type!=='text'&&opts.type!=='date';
  return `<div class="field${full}${opts.fullmobile?' fullmobile':''}${opts.unit?' with-unit':''}"><label for="${id}">${esc(label)}</label><input ${common} type="${opts.type||'number'}" ${isNumber?`inputmode="decimal" step="${opts.step||'any'}" min="${opts.min??0}" ${opts.max!=null?`max="${opts.max}"`:''}`:''} value="${esc(val??'')}" placeholder="${esc(opts.placeholder||'')}"/>${opts.unit?`<span class="unit">${esc(opts.unit)}</span>`:''}${hint}</div>`;
}
const n=(label,path,unit='€',hint='',options={})=>control(label,path,{unit,hint,...options});
const select=(label,path,options,hint='')=>control(label,path,{type:'select',options,hint});
const textfield=(label,path,opts={})=>control(label,path,{type:'text',...opts});
const datefield=(label,path)=>control(label,path,{type:'date'});
const flag=(label,path,hint='')=>control(label,path,{type:'toggle',hint});
const group=(title,content,lead='')=>`<section class="panel"><div class="panel-head"><div><h2>${esc(title)}</h2>${lead?`<p class="caption" style="margin:5px 0 0">${lead}</p>`:''}</div></div>${content}</section>`;
const fields=(items,three=false)=>`<div class="form-grid${three?' three':''}">${items.join('')}</div>`;
const metric=(label,v,subtitle='',tone='')=>`<article class="panel tight metric"><div class="label">${label}</div><div class="value ${tone}">${v}</div>${subtitle?`<div class="meta">${subtitle}</div>`:''}</article>`;
const stat=(label,val,extra='')=>`<div class="stat-row ${extra}"><span>${label}</span><strong>${val}</strong></div>`;
const note=(message,level='info')=>`<div class="warn-card ${level}"><span class="warnmark">${icon(level==='danger'?'alert':'info',17)}</span><p>${esc(message)}</p></div>`;
const bar=(label,numerator,max,color='')=>`<div class="barline"><div class="barlabel">${esc(label)}</div><div class="bartrack"><div class="barfill ${color}" style="width:${Math.max(0,Math.min(100,max?numerator/max*100:0))}%"></div></div><strong class="barvalue">${euro(numerator)}</strong></div>`;
const tabs=(items,current,action)=>`<nav class="tabs" aria-label="Unterbereiche">${items.map(([k,t])=>`<button class="tab ${k===current?'active':''}" data-action="${action}" data-value="${esc(k)}">${esc(t)}</button>`).join('')}</nav>`;
function lineChart(data,series,labels='Jahre'){
  if(!data?.length)return `<p class="caption">Für diesen Zeitraum fehlen berechenbare Werte.</p>`;
  const w=620,h=246,pad={l:65,r:14,t:22,b:34};
  const all=series.flatMap(s=>data.map(d=>Number(d[s.key])||0));
  let min=Math.min(0,...all),max=Math.max(0,...all);
  if(max-min<1){min-=1;max+=1}
  const x=i=>pad.l+(w-pad.l-pad.r)*i/Math.max(1,data.length-1);
  const y=v=>pad.t+(h-pad.t-pad.b)*(max-v)/(max-min);
  let graph='';for(let k=0;k<=4;k++){
    const v=min+(max-min)*k/4,Y=y(v);
    graph+=`<line class="chart-grid" x1="${pad.l}" y1="${Y}" x2="${w-pad.r}" y2="${Y}"/><text class="chart-label" x="${pad.l-8}" y="${Y+4}" text-anchor="end">${Math.abs(v)>=1000?number(round(v/1000,1))+'k':number(round(v,0))}</text>`;
  }
  const tickN=Math.max(1,Math.ceil(data.length/6));
  data.forEach((d,i)=>{if(i%tickN===0||i===data.length-1)graph+=`<text class="chart-label" text-anchor="middle" x="${x(i)}" y="${h-9}">${esc(d.year??i+1)}</text>`});
  for(const s of series){const pts=data.map((d,i)=>`${x(i)},${y(Number(d[s.key])||0)}`).join(' ');
    graph+=`<polyline class="chartline" style="stroke:${s.color}" points="${pts}"/>`;
    if(data.length<=15)data.forEach((d,i)=>{graph+=`<circle cx="${x(i)}" cy="${y(Number(d[s.key])||0)}" r="3" fill="${s.color}"/>`});
  }
  return `<div class="chartwrap"><svg class="chartsvg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(series.map(s=>s.label).join(', '))} über ${labels}">${graph}</svg></div><div class="legend">${series.map(s=>`<span><i class="dot" style="background:${s.color}"></i>${esc(s.label)}</span>`).join('')}</div>`;
}
function pageNav(){const options=[['dashboard','Dashboard'],['inputs','Eingaben'],['finance','Finanzierung'],['analysis','Analyse'],['scenarios','Szenarien']];
  return `<aside class="sidebar"><div class="brand"><div class="brand-mark">⌂</div><div><strong>ImmoCash</strong><small>INVESTMENT STUDIO</small></div></div><nav class="nav-list" aria-label="Hauptnavigation">${options.map(([k,v])=>`<button data-action="nav" data-value="${k}" class="nav-btn ${page===k?'active':''}">${icon(k,19)}${v}</button>`).join('')}</nav><div class="sidefoot">${icon('check',16)} &nbsp; Daten bleiben lokal im Browser.<p style="margin:8px 0 0">Modellrechnung · keine Finanzierungs- oder Steuerberatung.</p></div></aside>
  <nav class="mobile-nav" aria-label="Mobile Navigation">${options.map(([k,v])=>`<button data-action="nav" data-value="${k}" class="${page===k?'active':''}">${icon(k,20)}<span>${v}</span></button>`).join('')}</nav>`;
}
function topbar(){const pp=p();return `<header class="topbar"><div><div class="breadcrumb">IMMOBILIEN · INVESTMENT-ANALYSE</div></div><div class="top-actions"><select class="ctrl project-select" aria-label="Projekt wählen" data-action="project-change">${state.projects.map(x=>`<option value="${esc(x.id)}" ${pp.id===x.id?'selected':''}>${esc(x.property.name)}</option>`).join('')}</select><button class="iconbtn" aria-label="Neues Projekt" title="Neues Projekt" data-action="new">${icon('plus')}</button><button class="iconbtn" aria-label="Darstellung wechseln" title="Hell/Dunkel" data-action="theme">${icon(theme==='light'?'moon':'sun')}</button><div class="project-menu"><button class="btn" aria-label="Projektoptionen" data-action="menu">${icon('menu')}<span class="btntxt">Projekt & Export</span></button>${menuOpen?`<div class="dropmenu"><button data-action="duplicate">Projekt duplizieren</button><button data-action="new">Leere Berechnung starten</button><button data-action="export-json">JSON exportieren</button><button data-action="import-json">JSON importieren</button><button data-action="export-csv">Prognose als CSV</button><button data-action="export-tilgung">Tilgungsplan als CSV</button><button data-action="export-pdf">PDF-Bericht herunterladen</button><button data-action="print">Druckansicht / PDF drucken</button><button data-action="delete" style="color:var(--red)">Projekt löschen</button></div>`:''}</div></div></header>`;}
function heading(kicker,title,desc,buttons=''){return `<div class="topline"><div><p class="eyebrow">${kicker}</p><h1 style="margin-bottom:7px">${title}</h1><p class="subtitle">${desc}</p></div>${buttons}</div>`}
function liveDock(){const q=p(),c=cashflow(q),a=acquisition(q),l=loansFor(q),t=taxSimulation(q);return `<div class="panel tight" style="margin-bottom:19px"><div class="spacebetween"><div><div class="tiny" style="text-transform:uppercase;font-weight:800;letter-spacing:.09em">Live-Ergebnis · Normalisierter Cashflow</div><div class="callout-number ${c.economic<0?'negative':'positive'}" style="font-size:30px;margin:5px 0">${signed(c.economic)} <span class="tiny">/ Monat</span></div></div><div class="actionrow"><span class="badge">Kaufbedarf ${euro(a.total)}</span><span class="badge">Eigenkapital ${euro(l.requiredEquity)}</span><span class="badge">Rate ${euro(c.rate)}</span>${t?`<span class="badge">Nach Steuerannahme ${signed(t.afterTax)}</span>`:''}</div></div></div>`}
function dashboard(){
  const q=p(),a=acquisition(q),l=loansFor(q),c=cashflow(q),tax=taxSimulation(q),sc=scheduleAll(q,360);
  const value=afterTax&&tax?tax.afterTax:c.economic;
  const debt10=sc.rows[119]?.balance??(sc.fullPayoffMonth!=null&&sc.fullPayoffMonth<=120?0:null);
  const gross=a.purchase>0?rentalIncome(q)*12/a.purchase*100:null;
  const net=a.total>0?(rentalIncome(q)*c.occupancy+c.expectedOp-c.op.total-c.op.nonRecoverableHouse-c.op.reserve-c.owner-c.privateBudget)*12/a.total*100:null;
  const fc=forecast(q,{years:Math.min(20,q.assumptions.years)});
  const expenses=[['Kreditrate',c.rate,''],['Nicht umlagefähiges Hausgeld',c.op.nonRecoverableHouse,'blue'],['WEG-Rücklage',c.op.reserve,''],['Nicht gedeckte Betriebskosten',c.uncoveredOperation,'red'],['Weitere Eigentümerkosten',c.owner,''],['Eigene Rückstellung',c.privateBudget,'']];
  const max=Math.max(...expenses.map(x=>x[1]),1);
  return `${heading('Überblick',esc(q.property.name),'Die wichtigste Zahl: Was bleibt nach allen laufenden Eigentümerkosten übrig?',`<span class="badge ${q.example?'amber':''}">${q.example?'Fiktives Beispiel':'Eigene Berechnung'}</span>`)}
    <div class="grid cols2" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">
      <section class="panel hero"><div class="spacebetween"><div class="hero-title">MONATLICHER CASHFLOW</div><div class="segmented"><button data-action="tax-view" data-value="before" class="${!afterTax?'active':''}">Vor Steuer</button><button data-action="tax-view" data-value="after" class="${afterTax?'active':''}" ${!tax?'disabled':''}>Nach Steuer*</button></div></div><div class="hero-value ${value<0?'neg':'pos'}">${signed(value)}</div><p class="hero-description">${value<0?`Du musst voraussichtlich ${euro(Math.abs(value))} pro Monat selbst zuschießen.`:`Voraussichtlicher monatlicher Überschuss: ${euro(value)}.`}</p><div class="hero-split"><p class="caption" style="max-width:450px;margin:10px 0 0">${afterTax?'Nach modellhaftem Einkommensteuereffekt (keine garantierte Erstattung).':'Nach Kreditrate, nicht umlagefähigen Kosten und kalkulierten Rücklagen, vor Steuern.'}</p><div class="hero-stack"><div class="hero-micro"><span>Jährlich</span><strong>${signed(value*12)}</strong></div><div class="hero-micro"><span>Tatsächlicher Kontofluss¹</span><strong>${signed(c.actual)}</strong></div></div></div></section>
      <section class="panel"><div class="panel-head"><h2>Finanzierung auf einen Blick</h2><span class="badge">${q.finance.mode==='100'?'100 %':q.finance.mode==='110'?'110 %':q.finance.mode==='total'?'Gesamtkosten':'Individuell'}</span></div>${stat('Kaufpreis',euro(a.purchase))}${stat('Erwerbsnebenkosten',euro(a.fees))}${stat('Renovierung & sonstige Ausgaben',euro(a.renovation+a.initialOther))}${stat('Gesamter Kapitalbedarf',euro(a.total),'subtotal')}${stat('Benötigter Kredit',euro(l.totalPrincipal))}${stat('Eigenkapital beim Kauf',euro(l.requiredEquity))}${stat('Zusätzlicher Liquiditätspuffer',euro(a.buffer))}</section>
    </div>
    <div class="grid cols4 section">${metric('Nettokaltmiete inkl. Extras',euro(rentalIncome(q)),'Pro Monat, bei Vollvermietung')}${metric('Kreditrate · 1. Monat',euro(c.rate),`Zins: ${euro(sc.rows[0]?.interest||0)} · Tilgung: ${euro(sc.rows[0]?.repayment||0)}`)}${metric('Eigenkapitalbedarf inkl. Puffer',euro(l.cashNeedWithBuffer),'Anfangs benötigte Liquidität')}${metric('Restschuld nach 10 Jahren',euro(debt10),'Mit modelliertem Anschlusszins')}</div>
    <div class="grid cols2 section"><section class="panel"><div class="panel-head"><h2>Monatliche Belastungen</h2><span class="badge">${number(c.occupancy*100)} % Ertragsfaktor</span></div>${expenses.map(e=>bar(e[0],e[1],max,e[2])).join('')}<p class="caption">Die Ausgaben aus Betriebskosten werden mit erwarteten Erstattungen der Mieter verrechnet. Tilgung ist enthalten, aber kein steuerlicher Aufwand.</p></section>
    <section class="panel"><div class="panel-head"><h2>Rentabilität & Break-even</h2><span class="tiny">Ergebnisse vor Steuern</span></div>${stat('Bruttomietrendite',percent(gross))}${stat('Nettomietrendite (vereinfacht)',percent(net))}${stat('Cash-on-Cash-Rendite',l.requiredEquity>0?percent(c.annualCashflow/l.requiredEquity*100):'Nicht sinnvoll bei 0 € EK')}${stat('Break-even-Kaltmiete',euro(breakEven(q)),'subtotal')}${stat('Break-even / m²',q.property.area?`${euro(breakEven(q)/q.property.area)} / m²`:'Wohnfläche fehlt')}${stat('Kaltmiete für +250 € Cashflow',euro(breakEven(q,250)))}<p class="caption">Break-even bei unveränderten Zusatzmieten, Kosten und Leerstandsannahmen. Die rechtliche Erzielbarkeit der Miete ist nicht geprüft.</p></section></div>
    <div class="grid cols2 section"><section class="panel"><div class="panel-head"><h2>Langfristiger Cashflow</h2><button class="btn s" data-action="nav" data-value="analysis">Alle Jahre ${icon('arrow',14)}</button></div>${lineChart(fc.years,[{key:'cashflow',label:'Jährlicher Cashflow',color:'var(--accent)'},{key:'cumulative',label:'Kumuliert',color:'var(--blue)'}])}</section>
    <section class="panel"><div class="panel-head"><h2>Finanzierungsverlauf</h2><button class="btn s" data-action="nav" data-value="finance">Tilgungsplan ${icon('arrow',14)}</button></div>${lineChart(fc.years,[{key:'balance',label:'Restschuld',color:'var(--blue)'},{key:'propertyEquity',label:'Rechnerisches Objekt-Eigenkapital',color:'var(--accent)'}])}</section></div>
    ${whatIfPanel(q)}
    <section class="panel section"><div class="panel-head"><h2>Risiko- und Plausibilitätsprüfung</h2><span class="badge ${warnings(q).some(w=>w.level==='danger')?'red':'amber'}">${warnings(q).length} Hinweise</span></div><div class="warnings">${warnings(q).slice(0,5).map(x=>note(x.message,x.level)).join('')||note('Keine rechnerischen Warnsignale; vollständige Kaufprüfung bleibt notwendig.')}</div></section>
    <div class="footer-note">¹ Die Kontobewegung basiert auf den vereinbarten monatlichen Zahlungen bei voller Vermietung und ohne zeitversetzte Betriebskostenabrechnung; der normalisierte Wert berücksichtigt Leerstand, Ausfall und periodengerechte Kostendeckung. * Steuerwirkung nur bei eingeschalteter Simulation. Alle Werte beruhen auf änderbaren Annahmen; keine Bankzusage oder rechtliche Prüfung.</div>`;
}

function whatIfPanel(q){
 const items=[
   ['Kaufpreis','acquisition.price',Math.max(100000,Math.ceil(q.acquisition.price*2/5000)*5000),5000,'€'],
   ['Monatliche Kaltmiete','rent.cold',Math.max(2500,Math.ceil(q.rent.cold*2/100)*100),25,'€'],
   ['Sollzins','finance.rate',12,.1,'%'],
   ['Anfängliche Tilgung','finance.repayment',10,.1,'%'],
   ['Leerstand / Jahr','rent.vacancyMonths',12,.25,'Mon.'],
   ['Private Instandhaltungsrücklage','expenses.privateReserve',500,10,'€']
 ];
 return `<section class="panel section"><div class="panel-head"><h2>Was wäre, wenn?</h2><span class="badge">Live-Sensitivität</span></div>
 <div class="grid cols3">${items.map(([label,path,max,step,unit])=>`<div class="range-field"><label for="quick-${path.replaceAll('.','-')}"><span>${label}</span><output>${number(value(path))} ${unit}</output></label><input id="quick-${path.replaceAll('.','-')}" aria-label="${label}" data-quick="true" data-path="${path}" type="range" min="0" max="${max}" step="${step}" value="${value(path)}" /></div>`).join('')}</div>
 <div id="quick-preview" class="inline-notice section">${quickCashflow()}</div><p class="caption">Schieberegler ändern die aktiven Projektdaten. Der Wert wird sofort neu berechnet; andere Kennzahlen aktualisieren sich beim Loslassen. Die Anpassungen bleiben lokal gespeichert.</p></section>`;
}
function quickCashflow(){const c=cashflow(p()),l=loansFor(p());return `<strong>Monatlicher Cashflow: ${signed(c.economic)}</strong> · Kreditrate ${euro(c.rate)} · Eigenkapitalbedarf ${euro(l.requiredEquity)}`;}

const stateOptions=Object.keys(TAX_BY_STATE);
function purchaseInputs(){const q=p(),ac=acquisition(q);
  const costs=[['Notarkosten','notary'],['Grundbuchkosten','landRegistry'],['Maklerprovision','broker']];
  return `${group('Immobilie & Lage',fields([
    textfield('Projektname','property.name',{full:true}),textfield('Straße & Hausnummer','property.address'),textfield('Postleitzahl','property.zip'),
    textfield('Stadt','property.city'),select('Bundesland','property.state',stateOptions),
    select('Objektart','property.type',['Eigentumswohnung','Apartment','Mikroapartment','Sonstige']),
    n('Wohnfläche','property.area','m²'),n('Zimmer','property.rooms',''),n('Baujahr','property.year',''),
    n('Letzte umfassende Sanierung','property.renovatedYear',''),textfield('Etage','property.floor'),
    select('Energieklasse','property.energyClass',['unbekannt','A+','A','B','C','D','E','F','G','H']),
    textfield('Heizungsart','property.heating'),textfield('Energieträger','property.energySource'),
    select('Vermietungsstand','property.occupancy',[['vermietet','Bereits vermietet'],['leer','Leerstehend / Neuvermietung']]),
    select('Mietpreisbremse','property.rentBrake',[['unknown','Noch nicht geprüft'],['yes','Möglicherweise anwendbar'],['no','Nach Prüfung nicht anwendbar']]),
    datefield('Kauf / Nutzen-Lasten-Übergang','property.purchaseDate'),datefield('Geplanter Mietbeginn','property.rentStart'),
    control('Bekannte bauliche Mängel','property.defects',{type:'textarea'}),control('Geplante Modernisierung','property.modernizations',{type:'textarea'})
  ],true),'Adresse und technische Merkmale ergänzen die Risikoprüfung. Nicht alle Daten verändern den Cashflow.')}
  ${group('Kaufpreis & Erwerbsnebenkosten',`${fields([n('Kaufpreis','acquisition.price','€'),n('Grunderwerbsteuer','acquisition.transferTax','%')])}<p class="caption" style="margin:12px 0">Vorschlagswert für ${esc(q.property.state)}: ${percent(TAX_BY_STATE[q.property.state])}. Manuell überschreibbar · Stand 11.10.2026.</p>
    <div class="fee-list">${costs.map(([label,key])=>`<div class="fee-row"><span class="fee-label">${label}</span><select aria-label="Einheit für ${label}" data-fee-unit="${key}"><option value="pct" ${q.acquisition[key].type==='pct'?'selected':''}>Prozent vom Kaufpreis</option><option value="eur" ${q.acquisition[key].type==='eur'?'selected':''}>Fester Betrag €</option></select><input type="number" min="0" step="any" inputmode="decimal" aria-label="${label}" data-path="acquisition.${key}.value" value="${q.acquisition[key].value}"><strong>${euro(ac.components[key==='notary'?'notar':key==='landRegistry'?'grundbuch':'makler'])}</strong></div>`).join('')}</div>`,
    'Prozentpositionen beziehen sich ausschließlich auf den Kaufpreis. Die angezeigten Werte sind Beispielannahmen.')}
  ${group('Weitere einmalige Ausgaben',fields([
    n('Grundschuldbestellung','acquisition.mortgageRegistration'),n('Gutachter','acquisition.valuation'),
    n('Weitere Finanzierungskosten','acquisition.financingCosts'),n('Sonstige Erwerbsnebenkosten','acquisition.otherFees'),
    n('Anfängliche Renovierung','acquisition.renovation'),n('Anfängliche Modernisierung','acquisition.modernization'),
    n('Küche / Inventar (separat)','acquisition.kitchen'),n('Weitere Ausgaben vor Vermietung','acquisition.otherInitial'),
    n('Zusätzlicher Liquiditätspuffer','acquisition.buffer','€','Nicht Bestandteil der Anschaffungskosten.')
  ],true))}
  <section class="panel" id="cost-preview">${purchasePreview()}</section>
  <p class="caption">${esc(TAX_SOURCE)}</p>`;
}
function purchasePreview(){const a=acquisition(p()),l=loansFor(p());
  return `<div class="panel-head"><h2>Aufteilung des Kapitalbedarfs</h2><span class="badge">Sofort neu berechnet</span></div>${bar('Kaufpreis',a.purchase,a.total,'blue')}${bar('Nebenkosten',a.fees,a.total)}${bar('Renovierung / Modernisierung',a.renovation,a.total)}${bar('Sonstige Ausgaben',a.initialOther,a.total,'red')}${stat('Gesamter Kapitalbedarf',euro(a.total),'subtotal')}${stat('Kreditbetrag',euro(l.totalPrincipal))}${stat('Eigenkapital beim Kauf',euro(l.requiredEquity))}${stat('Zusätzlicher Puffer',euro(a.buffer))}${stat('Benötigte Liquidität',euro(l.cashNeedWithBuffer),'subtotal')}`;
}
function rentInputs(){return `${group('Vertragliche Nettomieten',fields([
    n('Nettokaltmiete','rent.cold'),n('Stellplatzmiete','rent.parking'),n('Garagenmiete','rent.garage'),
    n('Möblierungszuschlag','rent.furniture'),n('Weitere Nettomieten','rent.other'),
    n('Kaltmiete / m² (rechnerisch)','property.area','m²','Wohnfläche im Objektbereich bearbeiten.',{min:0}),
  ],true),'Alle Mietbestandteile können separat erfasst werden. Die Wohnfläche bestimmt die Miete pro m².')}
  ${group('Betriebskosten des Mieters',fields([
    n('Betriebskostenvorauszahlungen','rent.advance'),n('Heizkostenvorauszahlungen','rent.heatAdvance')
  ]),'Vorauszahlungen werden nur in der Liquiditätsansicht als Zahlungseingang berücksichtigt; sie sind kein zusätzlicher Netto-Mietertrag.')}
  ${group('Leerstand, Ausfall & Mietsteigerung',fields([
    n('Erwarteter Leerstand','rent.vacancyMonths','Mon.','Pro Kalenderjahr, 0–12.',{max:12}),
    n('Ausfallquote auf verbleibende Miete','rent.badDebtPercent','%','Ausfälle werden erst nach dem Leerstand berücksichtigt.',{max:100}),
    n('Angenommene jährliche Mietsteigerung','rent.growth','%','Szenario, keine durchsetzbare oder garantierte Erhöhung.',{min:-100})
  ]))}
  <div class="panel">${note('Bestehende Mietverträge gehen beim Wohnungskauf grundsätzlich über. Künftige Mieterhöhungen und mögliche Mietpreisbremse müssen separat rechtlich geprüft werden.')}${stat('Nettokaltmiete inkl. Extras',euro(rentalIncome(p())))}${stat('Berechnet pro m²',p().property.area?`${euro(p().rent.cold/p().property.area)} / m²`:'Wohnfläche fehlt')}${stat('Erwarteter realisierter Ertragsfaktor',percent(occupancyFactor(p())*100))}</div>`;
}
function houseInputs(){const q=p(),o=operating(q);
  return `${group('Hausgeld: getrennte Eigentümerkosten',fields([
    n('Hausgeld laut Wirtschaftsplan','house.total'),n('Nicht umlagefähige WEG-Verwaltung','house.management'),
    n('Sonstige nicht umlagefähige Kosten','house.nonRecoverable'),n('Weitere Hausgeld-Eigentümerkosten','house.other'),
    n('WEG-Erhaltungsrücklagenzuführung','house.reserve'),n('Erhaltungsrücklagenbestand der WEG','house.wegTotalBalance'),
    textfield('Geplante WEG-Arbeiten','house.wegPlannedWorks',{full:true})
  ],true),'Alle Beträge monatlich, sofern nicht anders angegeben.')}
  ${group('Betriebskosten – einzeln aufteilen',`<p class="caption">„Im Hausgeld“ entscheidet, ob die Position bereits an die WEG bezahlt wird. Der Umlageanteil muss individuell nach Mietvertrag und Rechtslage geprüft werden.</p>
  <div class="op-head"><span>Betriebskostenart</span><span>€/Monat</span><span>Mieteranteil %</span><span>Im HG?</span><span></span></div>
  <div id="operating-rows">${q.operating.map((r,i)=>`<div class="op-row"><input aria-label="Kostenart" data-row="${i}" data-key="name" type="text" value="${esc(r.name)}"/><input aria-label="Betrag in Euro" data-row="${i}" data-key="amount" type="number" min="0" step="any" inputmode="decimal" value="${r.amount}"/><input aria-label="Mieteranteil Prozent" data-row="${i}" data-key="tenantShare" type="number" min="0" max="100" step="any" inputmode="decimal" value="${r.tenantShare}"/><input aria-label="Im Hausgeld enthalten" data-row="${i}" data-key="inHouse" type="checkbox" ${r.inHouse?'checked':''}/><button aria-label="Zeile löschen" data-action="delete-operating" data-index="${i}">×</button></div>`).join('')}</div>
  <button class="btn s section" data-action="add-operating">${icon('plus',15)} Position ergänzen</button>`) }
  <section class="panel" id="house-preview">${housePreview()}</section>
  <p class="caption">Hausmeistertätigkeiten für Verwaltung oder Reparaturen können nicht einfach als umlagefähig gelten. Heiz- und CO₂-Kosten können weitere rechtliche Aufteilungen benötigen.</p>`;
}
function housePreview(){const o=operating(p());return `<div class="panel-head"><h2>Hausgeld-Kontrollrechnung</h2><span class="badge ${Math.abs(o.difference)>0.01?'red':'green'}">${Math.abs(o.difference)>0.01?'Abweichung':'Stimmt überein'}</span></div>
  ${stat('Betriebskosten im Hausgeld',euro(o.within))}${stat('Nicht umlagefähiger Hausgeldteil',euro(o.nonRecoverableHouse))}${stat('WEG-Rücklagenzuführung',euro(o.reserve))}${stat('Summe der Komponenten',euro(o.houseComputed),'subtotal')}${stat('Hausgeld laut Eingabe',euro(o.totalHouse))}${stat('Differenz (Eingabe minus Komponenten)',euro(o.difference),'subtotal')}${stat('Außerhalb Hausgeld bezahlte Betriebskosten',euro(o.outside))}${stat('Möglicherweise von Mietern gedeckt',euro(o.tenantShare))}${Math.abs(o.difference)>.01?note(`Hausgeld-Kontrolle ergibt ${euro(Math.abs(o.difference))} Differenz. Bitte Einzelbeträge korrigieren.`,'danger'):''}`;}
function expensesInputs(){const q=p();return `${group('Eigentümerkosten außerhalb Hausgeld',fields([
    n('Sondereigentumsverwaltung','expenses.propertyManager'),n('Zusätzliche Versicherungen','expenses.insurance'),
    n('Rechtsschutz / Rechtsberatung','expenses.legal'),n('Steuerberatung / Buchhaltung','expenses.taxConsulting'),
    n('Bank- und Kontoführung','expenses.bank'),n('Reparaturen der Wohnung','expenses.repairs'),
    n('Vermietung & Inserate','expenses.letting'),n('Erbbauzins','expenses.groundRent'),
    n('Vermieteranteil CO₂-Kosten','expenses.co2Owner'),n('Sonstige laufende Eigentümerkosten','expenses.other')
  ],true),'Beträge pro Monat. Positionen, die bereits im Hausgeld erfasst sind, hier nicht erneut eingeben.')}
  ${group('Private Instandhaltungsplanung',fields([
    n('Eigene Instandhaltungsrücklage','expenses.privateReserve','€','Budget in der normalisierten Analyse; keine steuerlichen Werbungskosten allein durch Ansparung.'),
    flag('Monatliche Sparüberweisung tatsächlich ausführen','expenses.transferPrivateReserve','Nur dann in der echten Liquiditätsansicht abgezogen.')
  ]))}
  <div class="panel">${note('Eine private Rückstellung ist nicht gleich einer Ausgabe. Tatsächliche Reparaturen, die aus bereits angesparten Mitteln bezahlt werden, dürfen in einer Gesamterfolgsrechnung nicht zusätzlich zur früheren Ansparung als neue Vermögenseinbuße gerechnet werden.')}${stat('Externe Eigentümerkosten',euro(sum(Object.entries(q.expenses).filter(([k])=>!['privateReserve','transferPrivateReserve'].includes(k)).map(([,v])=>v))))}${stat('Privater Rücklagentopf / Monat',euro(q.expenses.privateReserve))}</div>`;}
function taxInputs(){const q=p(),t=taxSimulation(q);return `${group('Steuerliche Simulation',fields([
    flag('Simulation aktivieren','tax.enabled','Geschätzte Einkommensteuerwirkung, keine Steuerberatung.'),
    n('Angenommener Grenzsteuersatz','tax.marginalRate','%','Individuell; 0–100.',{max:100}),
    n('Gebäudeanteil der Anschaffungskosten','tax.buildingShare','%','Grund und Boden wird nicht abgeschrieben.',{max:100}),
    n('Lineare Gebäude-AfA','tax.afaRate','%','Je nach Fertigstellungsdatum i.d.R. 2 %, 2,5 % oder 3 %; Sonderfälle nicht automatisch berücksichtigt.',{max:100}),
    n('Alternativ AfA-Bemessungsgrundlage','tax.customBasis','€','0 = automatisch aus Kaufpreis und anrechenbaren Erwerbsnebenkosten.'),
    n('Zusätzliche aktivierte Modernisierung','tax.capitalizedImprovements'),
    n('Weitere tatsächlich abzugsfähige Kosten','tax.otherDeductible','€/Mo.','Nicht bereits in laufenden Eigentümerkosten enthalten.'),
    select('Verlustverrechnung','tax.lossPolicy',[['none','Keine Steuerentlastung'],['full','Volle modellhafte Verrechnung'],['partial','Individuell begrenzte Verrechnung']]),
    n('Individuell verrechenbarer Verlust','tax.deductibleLoss','€/Jahr')
  ],true),'Verluste sind nicht automatisch mit einer Steuererstattung gleichzusetzen.')}
  <section class="panel" id="tax-preview">${taxPreview()}</section>
  <div class="inline-notice">Rechtsstand und AfA-Voraussetzungen vor Anwendung prüfen: <a href="https://usth.bundesfinanzministerium.de/lsth/2026/A-Einkommensteuergesetz/II-Einkommen-2-24b/3-Gewinn-4-7i/Paragraf-7/inhalt.html" target="_blank" rel="noopener noreferrer">EStG § 7 · Amtliche Steuer-Handbücher 2026</a>. Regel-AfA: 3 % ab Fertigstellung 2023, 2 % ab 1925 bis 2022, 2,5 % vor 1925. Steuerliche Details, Sonder-AfA und anschaffungsnahe Herstellungskosten bedürfen gesonderter Prüfung.</div>`;}
function taxPreview(){const q=p(),t=taxSimulation(q);return `<div class="panel-head"><h2>Jährliches vereinfachtes Steuerergebnis</h2><button class="btn s" data-action="afa-suggest">AfA-Satz aus Baujahr vorschlagen</button></div>${!t?note('Steuerliche Simulation ist deaktiviert. Keine Steuerwirkung im angezeigten Cashflow berücksichtigt.'):
  `${stat('Steuerlich modellierte Einnahmen',euro(t.income))}${stat('Abzugsfähige laufende Kosten',`−${euro(t.deductible)}`)}${stat('Schuldzinsen (ohne Tilgung)',`−${euro(t.interest)}`)}${stat('Gebäude-AfA',`−${euro(t.afa)}`)}${stat('Steuerliches Jahresergebnis',signed(t.taxable),'subtotal')}${stat('Modellhafte Steuerwirkung / Jahr',signed(t.effect))}${stat('Cashflow nach Steuerannahme / Monat',signed(t.afterTax),'subtotal')}`}<p class="caption">Die Vorauszahlungen und tatsächlich umlagefähigen Kosten werden symmetrisch in Einnahmen und Ausgaben abgebildet. WEG-Rücklagenzuführungen, Tilgung und rein private Rückstellungen werden nicht als Werbungskosten abgezogen. Bei Veräußerung gelten zusätzliche steuerliche Regeln.</p>`;}
function specialInputs(){const q=p();return `${group('Sonderumlagen & größere Maßnahmen',`<p class="caption">Jahr 1 bezeichnet das erste 12-Monats-Intervall ab Kaufdatum. Rücklagenabzüge dienen der Schätzung des noch selbst zu zahlenden Betrags.</p>
   <div class="form-panels">${q.events.map((e,i)=>`<div class="panel tight" style="background:var(--panel2)"><div class="spacebetween" style="margin-bottom:12px"><strong>Maßnahme ${i+1}</strong><button class="btn s danger" data-action="remove-event" data-index="${i}">${icon('trash',14)} Entfernen</button></div><div class="form-grid three">
   ${eventInput(i,'description','Bezeichnung','text')}${eventInput(i,'year','Projektjahr')}${eventInput(i,'month','Zahlungsmonat')}
   ${eventInput(i,'total','Gesamtkosten')}${eventInput(i,'share','Eigentümeranteil %')}${eventInput(i,'directShare','Direkter Eigenanteil €')}${eventInput(i,'reserveUse','WEG-Rücklagennutzung €')}
   </div></div>`).join('')}</div><button class="btn section" data-action="add-event">${icon('plus',16)} Sonderumlage hinzufügen</button>`, 'Zukünftige Maßnahmen sind Schätzwerte – auch wenn sie noch nicht beschlossen sind.')}
  <section class="panel">${note('Steuerliche Abziehbarkeit einer Sonderumlage und der daraus bezahlten Arbeiten muss im Einzelfall geprüft werden. Die langfristige Prognose belastet den Zahlungszeitpunkt, vermeidet jedoch eine weitere Buchung der bereits bezahlten WEG-Zuführungen.')}</section>`;}
function eventInput(i,key,label,type='number'){const v=p().events[i][key];return `<div class="field"><label>${label}</label><input data-event="${i}" data-key="${key}" type="${type}" ${type==='number'?'inputmode="decimal" step="any" min="0"':''} value="${esc(v??'')}"></div>`}
function inputsPage(){const pages=[['kauf','Kauf & Objekt'],['miete','Mieteinnahmen'],['hausgeld','Hausgeld'],['kosten','Eigentümerkosten'],['steuern','Steuern'],['umlagen','Sonderumlagen']];
 const content={kauf:purchaseInputs,miete:rentInputs,hausgeld:houseInputs,kosten:expensesInputs,steuern:taxInputs,umlagen:specialInputs};
 return `${heading('Objektdaten','Alle Eingaben','Jede Änderung verändert das Modell. Beispielannahmen können vollständig überschrieben werden.')}${`<div id="live-dock">${liveDock()}</div>`}${tabs(pages,inputTab,'input-tab')}<div class="form-panels">${content[inputTab]()}</div>`;
}
function financePage(){const q=p(),f=q.finance;
 const modes=[['100','100-%-Finanzierung','Darlehen entspricht dem Kaufpreis. Kaufnebenkosten separat.'],['110','110-%-Finanzierung','Darlehen entspricht 110 % des Kaufpreises.'],['custom','Individuell','Kreditsumme und Eigenkapital frei steuern.'],['total','Gesamtkosten','Kaufpreis und ausgewählte Nebenkosten finanzieren.']];
 return `${heading('Finanzierung','Kredit intelligent planen','Annuitäten, Zinsbindung, Anschlussfinanzierung und Sondertilgung getrennt rechnen.')}
  <div id="live-dock">${liveDock()}</div>
  ${group('Finanzierungsmodell',`<div class="radio-cards">${modes.map(([key,title,desc])=>`<button class="mode ${f.mode===key?'active':''}" data-action="finance-mode" data-value="${key}"><strong>${title}</strong><small>${desc}</small></button>`).join('')}</div>${f.mode==='total'?`<div class="form-grid section">${flag('Renovierung/Modernisierung mitfinanzieren','finance.financeRenovation')}${flag('Sonstige Anfangsausgaben mitfinanzieren','finance.financeOther')}</div>`:''}`)}
  ${group('Darlehenskonditionen',fields([
    ...(f.mode==='custom'?[n('Individuell gewünschter Kreditbetrag','finance.manualLoan')]:[]),
    n('Verfügbares Eigenkapital','finance.availableEquity'),n('Nominaler Sollzins','finance.rate','%'),
    n('Anfängliche Tilgung','finance.repayment','%'),n('Zinsbindungsdauer','finance.fixedYears','Jahre'),
    n('Monatsrate manuell (optional)','finance.manualPayment','€','0 = automatisch über Zins + anfängliche Tilgung.'),
    n('Feste Gesamtlaufzeit (optional)','finance.termYears','Jahre','0 = anfänglicher Tilgungssatz maßgeblich; bei Laufzeitvorgabe Annuitätenformel.'),
    n('Jährliche Sondertilgung','finance.extraAnnual'),n('Sondertilgung im Monat','finance.extraMonth','1–12','Januar = 1, Dezember = 12.',{min:1,max:12}),
    n('Tilgungsfreie Anfangszeit','finance.interestOnlyMonths','Mon.'),
    n('Erwarteter Anschlusszins','finance.followRate','%','Leeres Feld = keine unbelegte Anschlussprognose.',{min:0}),
    n('Anfängliche Tilgung nach Anschluss','finance.followRepayment','%'),
    n('Monatsrate nach Anschluss (optional)','finance.followPayment','€','0 = Berechnung aus Anschlusszins und Anschluss-Tilgung.')
  ],true),'Sollzinssatz und Tilgung sind frei wählbare Szenarioannahmen, keine Bankangebote.')}
  ${group('Zusätzliche Darlehensbausteine',`<div class="form-panels">${q.loans.map((loan,i)=>`<div class="panel tight" style="background:var(--panel2)"><div class="spacebetween"><strong>${esc(loan.name||'Zusatzdarlehen')}</strong><button class="btn s danger" data-action="remove-loan" data-index="${i}">${icon('trash',14)} Löschen</button></div><div class="form-grid three section">${[
    ['name','Bezeichnung','text'],['principal','Darlehensbetrag'],['rate','Sollzins %'],['repayment','Tilgung %'],
    ['fixedYears','Zinsbindung (Jahre)'],['followRate','Anschlusszins %'],['followRepayment','Anschluss-Tilgung %'],
    ['extraAnnual','Jährliche Sondertilgung'],['manualPayment','Manuelle Monatsrate']
  ].map(([key,label,type])=>`<div class="field"><label>${label}</label><input data-loan="${i}" data-key="${key}" type="${type||'number'}" ${type!=='text'?'inputmode="decimal" min="0" step="any"':''} value="${esc(loan[key]??'')}"></div>`).join('')}</div></div>`).join('')}</div><button class="btn section" data-action="add-loan">${icon('plus',15)} Darlehensbaustein ergänzen</button>`, 'Zusätzliche Kredite werden als getrennte Tilgungspläne aggregiert.')}
  <section id="finance-preview" class="form-panels section">${financePreview()}</section>`;
}
function financePreview(){const q=p(),a=acquisition(q),l=loansFor(q,a),s=scheduleAll(q,600),r=s.rows;
 const first=r[0],m12=r[11];
 const years=[5,10,15,20,30].map(y=>[`${y} Jahre`,r[y*12-1]?.balance??(s.fullPayoffMonth!=null&&s.fullPayoffMonth<=y*12?0:null)]);
 const chartRows=r.filter((x,i)=>(i+1)%12===0).map(x=>({year:x.month/12,balance:x.balance,paidInterest:x.paidInterest,paidPrincipal:l.totalPrincipal-x.balance}));
 return `<div class="grid cols4">${metric('Gesamtfinanzierung',euro(l.totalPrincipal))}${metric('Kauf-Eigenkapital',euro(l.requiredEquity))}${metric('Monatliche Rate',euro(first?.payment||0))}${metric('Zinsanteil, 1. Rate',euro(first?.interest||0))}</div>
   <div class="grid cols2"><section class="panel"><div class="panel-head"><h2>Tilgungsverlauf</h2></div>${lineChart(chartRows,[{key:'balance',label:'Restschuld',color:'var(--blue)'},{key:'paidInterest',label:'Kumulierte Zinsen',color:'var(--red)'},{key:'paidPrincipal',label:'Getilgt',color:'var(--accent)'}])}</section>
   <section class="panel"><div class="panel-head"><h2>Finanzierungsdetails</h2><span class="badge">${l.loans.length} Kreditbaustein(e)</span></div>${stat('Sollzins 1. Monat',euro(first?.interest))}${stat('Tilgung 1. Monat',euro(first?.repayment))}${stat('Sollzins Monat 12',euro(m12?.interest))}${stat('Tilgung Monat 12',euro(m12?.repayment))}${years.map(([label,n])=>stat(`Restschuld nach ${label}`,euro(n))).join('')}${stat('Gesamte modellierte Zinsen',euro(s.totalInterest))}${stat('Rechnerische Entschuldung',s.fullPayoffMonth!=null?`Nach ${number(round(s.fullPayoffMonth/12,1))} Jahren`:'Nicht innerhalb des Modells')}${stat('Darlehen/Kaufpreis',percent(l.loanToPrice))}</section></div>
   ${s.issue.length?`<div class="warnings">${s.issue.map(x=>note(x,'danger')).join('')}</div>`:''}
   <section class="panel"><div class="panel-head"><h2>Monatlicher Tilgungsplan</h2><button class="btn s" data-action="export-tilgung">${icon('download',15)} CSV exportieren</button></div><div class="table-scroll"><table><thead><tr><th>Monat</th><th>Rate</th><th>Zins</th><th>Tilgung</th><th>Sondertilgung</th><th>Restschuld</th></tr></thead><tbody>${r.slice(0,36).map(x=>`<tr><td>${x.month}</td><td>${euro(x.payment)}</td><td>${euro(x.interest)}</td><td>${euro(x.repayment)}</td><td>${euro(x.extra)}</td><td>${euro(x.balance)}</td></tr>`).join('')}</tbody></table></div><div class="table-note">Erste 36 Monate sichtbar. Der CSV-Export enthält den gesamten modellierten Tilgungsplan.</div></section>`;
}

function analysisPage(){
 const q=p(),c=cashflow(q),a=acquisition(q),l=loansFor(q),fc=forecast(q),s=saleSimulation(q);
 const subtabs=[['forecast','Prognose'],['break','Break-even'],['sale','Verkauf'],['checks','Kaufprüfung'],['compare','Objektvergleich']];
 const analysis={
 forecast:()=>`${group('Prognoseannahmen',fields([
   n('Betrachtungshorizont','assumptions.years','Jahre','1–50',{min:1,max:50}),
   n('Jährliche Mietentwicklung','rent.growth','%','Szenario, keine zugesagte Mieterhöhung',{min:-100}),
   n('Jährliche Kostensteigerung','assumptions.costGrowth','%', '',{min:-100}),
   n('Jährliche Marktwertentwicklung','assumptions.valueGrowth','%','Unverbindliche Annahme, kein realisierter Ertrag',{min:-100})
 ],true))}
 <div id="analysis-preview">${forecastPreview()}</div>`,
 break:()=>`${group('Break-even und Investitionsgrenzen',`<div class="grid cols3">${[0,100,250,500].map(v=>metric(v===0?'Cashflow = 0 €':`Cashflow +${v} €`,euro(breakEven(q,v)),'Erforderliche monatliche Kaltmiete')).join('')}</div><div class="section">${stat('Break-even pro m²',q.property.area&&breakEven(q)!=null?`${euro(breakEven(q)/q.property.area)} / m²`:'Wohnfläche fehlt')}${stat('Maximaler Kaufpreis für neutralen Cashflow',euro(maxPurchasePrice(q)))}${stat('Aktueller Kaufpreis',euro(a.purchase))}${stat('Erforderliche Kaltmietänderung',breakEven(q)!=null?signed(breakEven(q)-q.rent.cold):'Nicht berechenbar')}</div><p class="caption">Bei festem Finanzierungstyp, Kostenmodell und Ertragsfaktor rechnerisch ermittelte Schwellenwerte. Eine marktfähige oder rechtlich zulässige Kaltmiete wird nicht zugesichert.</p>`)}`,
 sale:()=>`${group('Verkaufssimulation',fields([
   n('Verkauf im Projektjahr','sale.year','Jahr','1–50',{min:1,max:50}),
   n('Manueller Verkaufspreis (0 = Szenariowert)','sale.manualPrice'),
   n('Verkaufsprovision','sale.brokerPct','%'),n('Sonstige Verkaufskosten','sale.otherCosts'),
   n('Vorfälligkeitsentschädigung','sale.prepaymentPenalty'),n('Angenommene Verkaufsteuer','sale.saleTax','€','Nur individuelle Prüfannahme')
 ],true),'Rechnerische Projektion mit tatsächlicher Restschuld, ohne unterstellte Steuerfreiheit.')}
 <section class="panel section" id="sale-preview">${salePreview()}</section>`,
 checks:()=>`${group('Kaufprüfung & Risiken',`<div class="spacebetween"><p class="caption" style="margin:0">Prüfstatus bleibt lokal in deinem Projekt gespeichert. Dokumente nicht automatisch bewertet.</p><span class="badge">${Object.keys(q.checklist||{}).filter(k=>q.checklist[k]==='ok').length} erledigt</span></div>
 ${Object.entries(CHECKLIST).map(([name,items])=>`<div class="check-group"><h3>${esc(name)}</h3>${items.map(item=>`<div class="check-row"><label>${esc(item)}</label><select aria-label="Status ${esc(item)}" data-check="${esc(item)}">${[['open','Noch offen'],['ok','Unauffällig'],['warn','Auffälligkeit'],['na','Nicht relevant']].map(([key,txt])=>`<option value="${key}" ${(q.checklist||{})[item]===key?'selected':''}>${txt}</option>`).join('')}</select></div>`).join('')}</div>`).join('')}`)}`,
 compare:()=>`${group('Mehrere Projekte vergleichen',`<p class="caption">Es werden alle lokal gespeicherten Projekte angezeigt. Finanzierungsvarianten können über „Projekt duplizieren“ angelegt werden.</p><div class="table-scroll"><table><thead><tr><th>Immobilie</th><th>Kaufpreis</th><th>Kredit</th><th>Eigenkapital</th><th>Monats-CF</th><th>Restschuld 10 J.</th></tr></thead><tbody>${state.projects.map(pp=>{const aa=acquisition(pp),ll=loansFor(pp),cc=cashflow(pp),ss=scheduleAll(pp,120);return `<tr><td>${esc(pp.property.name)}</td><td>${euro(aa.purchase)}</td><td>${euro(ll.totalPrincipal)}</td><td>${euro(ll.requiredEquity)}</td><td>${signed(cc.economic)}</td><td>${euro(ss.rows[119]?.balance??(ss.fullPayoffMonth!==null&&ss.fullPayoffMonth<=120?0:null))}</td></tr>`}).join('')}</tbody></table></div>`)}`
 };
 return `${heading('Auswertung','Immobilienanalyse','Ertragskraft, Risikofaktoren und langfristige Vermögensentwicklung transparent betrachten.')}<div id="live-dock">${liveDock()}</div>${tabs(subtabs,analysisTab,'analysis-tab')}<div class="form-panels">${analysis[analysisTab]()}</div>`;
}
function forecastPreview(){const fc=forecast(p());const yrs=fc.years;
 return `${fc.incomplete?note(`Die Prognose wurde verkürzt: ${fc.issue.join(' · ')||'Finanzierungsdaten fehlen.'}`,'danger'):''}
 <div class="grid cols4 section">${metric('Kumulierter Cashflow',euro(yrs.at(-1)?.cumulative))}${metric('Restschuld am Horizont',euro(yrs.at(-1)?.balance))}${metric('Hypothetischer Marktwert',euro(yrs.at(-1)?.marketValue))}${metric('Rechnerisches Objektvermögen',euro(yrs.at(-1)?.propertyEquity))}</div>
 <div class="grid cols2 section"><section class="panel"><h2>Liquidität im Zeitverlauf</h2>${lineChart(yrs,[{key:'cashflow',label:'Cashflow im Jahr',color:'var(--accent)'},{key:'cumulative',label:'Kumulierter Cashflow',color:'var(--blue)'}])}</section>
 <section class="panel"><h2>Wertannahme und Restschuld</h2>${lineChart(yrs,[{key:'marketValue',label:'Szenario-Marktwert',color:'var(--blue)'},{key:'balance',label:'Restschuld',color:'var(--red)'},{key:'propertyEquity',label:'Objekt-Eigenkapital',color:'var(--accent)'}])}</section></div>
 <section class="panel section"><div class="panel-head"><h2>Jahresprognose</h2><button class="btn s" data-action="export-csv">${icon('download',15)} CSV</button></div><div class="table-scroll"><table><thead><tr><th>Jahr</th><th>Mieterträge</th><th>Objektkosten</th><th>Kreditdienst</th><th>Sonderumlagen</th><th>Cashflow</th><th>Restschuld</th><th>Objektvermögen</th></tr></thead><tbody>${yrs.map(x=>`<tr><td>${x.year}</td><td>${euro(x.income)}</td><td>${euro(x.operCost+x.ownerCost+x.reserves)}</td><td>${euro(x.debtPaid)}</td><td>${euro(x.special)}</td><td>${signed(x.cashflow)}</td><td>${euro(x.balance)}</td><td>${euro(x.propertyEquity)}</td></tr>`).join('')}</tbody></table></div><p class="table-note">Die Prognose aggregiert Monatswerte, beginnend zum Nutzen-Lasten-Wechsel. Marktwerte und künftige Zinsen bleiben veränderbare Annahmen. Sonderumlagen fallen im angegebenen Projektmonat an.</p></section>`;
}
function salePreview(){const result=saleSimulation(p());
 if(!result)return note('Verkauf kann erst modelliert werden, wenn alle Kreditkonditionen bis zum geplanten Verkaufsjahr vorliegen.','danger');
 return `${stat('Hypothetischer Verkaufspreis',euro(result.price))}${stat('Verkaufskosten inkl. eventueller Vorfälligkeit',`− ${euro(result.sellingFees)}`)}${stat('Restschuld bei Verkauf',`− ${euro(result.remainingDebt)}`)}${stat('Manuell angenommene Verkaufssteuer',`− ${euro(result.taxes)}`)}${stat('Nettoerlös nach Ablösung',signed(result.proceeds),'subtotal')}${stat('Kumulierter operativer Cashflow',signed(result.operatingCashflows))}${stat('Anfänglich eingesetztes Eigenkapital',`− ${euro(result.initialEquity)}`)}${stat('Modellierter Investmenterfolg',signed(result.result),'subtotal')}<p class="caption">Veräußerungsgewinn und mögliche Besteuerung (insbesondere innerhalb der zehnjährigen Frist) müssen individuell geprüft werden. Zukünftige Marktwerte sind hypothetisch; unmodellierte Steuern oder Transaktionen sind nicht enthalten.</p>`;
}
function scenarioPage(){const q=p(),samples=scenarioCompare(q);const title=(id)=>samples.find(x=>x.id===id);
 return `${heading('Was-wäre-wenn','Finanzierung & Risiko testen','Vier unabhängig gerechnete Varianten. Das Stressszenario verändert niemals die Basiseingaben.')}
 <div id="live-dock">${liveDock()}</div><div class="grid cols4">${samples.map(x=>`<div class="scenario"><strong>${esc(x.name)}</strong><div class="num ${x.cashflow<0?'negative':'positive'}">${signed(x.cashflow)}</div><small>Monatlicher normalisierter Cashflow</small></div>`).join('')}</div>
 <div class="grid cols2 section">${group('Dein Stressszenario',fields([
   n('Sollzins im Stress','stress.rate','%'),n('Anschlusszins im Stress','stress.followRate','%'),
   n('Leerstand','stress.vacancyMonths','Monate','Monate pro Jahr',{max:12}),
   n('Weitere Eigentümerkosten','stress.additionalCosts','€/Monat'),
   n('Jährliche Kostensteigerung','stress.costGrowth','%'),n('Jährliche Mietentwicklung','stress.rentGrowth','%','',{min:-100}),
   n('Immobilienwertentwicklung','stress.valueGrowth','%','',{min:-100}),
   n('Zusätzliche Sonderumlage in Jahr 1','stress.specialCharge','€')
 ],true),'Annahmen für dieses Szenario können unabhängig vom Basisprojekt geändert werden.')}
 <section class="panel"><h2>Auswertung der Stressfaktoren</h2><p class="caption">Die Verschlechterung des Cashflows gegenüber der Basis ist keine Eintrittswahrscheinlichkeit, sondern die rechnerische Folge deiner Stresswerte.</p>
 ${stat('Cashflow Basis',signed(title('base').cashflow))}${stat('Cashflow Stress',signed(title('custom').cashflow))}${stat('Monatliche Differenz',signed(title('custom').cashflow-title('base').cashflow),'subtotal')}
 ${stat('Eigenkapitalbedarf im Stress',euro(title('custom').equity))}${stat('Restschuld nach 10 Jahren',euro(title('custom').debt10))}${stat('Kumulierter 10-Jahres-Cashflow',euro(title('custom').cumulative10))}
 ${title('custom').incomplete?note('Langfristiger Stressvergleich wegen fehlender Anschlussbedingungen unvollständig.','danger'):''}</section></div>
 <section class="panel section"><div class="panel-head"><h2>Szenarien nebeneinander</h2><span class="badge">Alle Werte aus Eingaben berechnet</span></div><div class="table-scroll"><table><thead><tr><th>Fall</th><th>Monat</th><th>Jahr</th><th>Eigenkapital</th><th>Nach Steuer*</th><th>Restschuld 10 J.</th><th>CF kum. 10 J.</th><th>Objektvermögen 10 J.</th></tr></thead><tbody>${samples.map(x=>`<tr><td>${esc(x.name)}</td><td>${signed(x.cashflow)}</td><td>${signed(x.annual)}</td><td>${euro(x.equity)}</td><td>${x.afterTax==null?'–':signed(x.afterTax)}</td><td>${euro(x.debt10)}</td><td>${euro(x.cumulative10)}</td><td>${euro(x.propertyEquity10)}</td></tr>`).join('')}</tbody></table></div><p class="caption">* Nur bei eingeschalteter Steuer-Simulation. Optimistische und pessimistische Annahmen sind illustrative, veränderbare Varianten und keine Prognosegarantien.</p></section>`;
}
function render(keepScroll=false){
 const lastY=window.scrollY;
 const body={dashboard,inputs:inputsPage,finance:financePage,analysis:analysisPage,scenarios:scenarioPage}[page]();
 app.innerHTML=`<div class="shell">${pageNav()}<main class="main">${topbar()}${body}<div class="footer-note">ImmoCash · Alle Finanzdaten bleiben auf diesem Gerät, solange du sie nicht exportierst. Unverbindliche Modellrechnung – keine Steuer-, Rechts- oder Finanzierungsberatung.</div></main></div>`;
 if(keepScroll) window.scrollTo(0,lastY); else window.scrollTo(0,0);
}
function updateVisible(){
 const dock=document.querySelector('#live-dock');if(dock)dock.innerHTML=liveDock();
 const panels={"#cost-preview":purchasePreview,"#house-preview":housePreview,"#tax-preview":taxPreview,"#finance-preview":financePreview,"#analysis-preview":forecastPreview,"#sale-preview":salePreview};
 for(const [selector,fun] of Object.entries(panels)){const el=document.querySelector(selector);if(el)el.innerHTML=fun();}
 // Bei Dashboard & Stressvergleich sind sämtliche Felder schreibgeschützt: vollständiges Rendern ist sicher.
 if(page==='dashboard'||page==='scenarios'||(page==='analysis'&&!['forecast','sale'].includes(analysisTab)))render(true);
}
function markEdited(){p().example=false;persist()}
function writePath(input){
 const path=input.dataset.path;if(!path)return;
 let v=input.value;
 if(input.type==='number')v=v===''&&path==='finance.followRate'?null:(v===''?0:Number(v));
 if(input.type==='number'&&!Number.isFinite(v)&&v!==null)return;
 if(input.type==='number'&&v!==null){const lower=input.min!==''?Number(input.min):-Infinity;const upper=input.max!==''?Number(input.max):Infinity;v=Math.min(upper,Math.max(lower,v));}
 if(path==='assumptions.years')v=Math.max(1,Math.min(50,Math.round(v)));
 if(path==='sale.year')v=Math.max(1,Math.min(50,Math.round(v)));
 set(path,v);
 if(path==='property.state' && TAX_BY_STATE[v]!=null){set('acquisition.transferTax',TAX_BY_STATE[v]);}
 markEdited();
}
function csvQuote(x){const s=String(x??'');return `"${s.replaceAll('"','""')}"`;}
function csvOutput(header,records){return '\uFEFF'+[header,...records].map(row=>row.map(csvQuote).join(';')).join('\r\n');}
function fileDownload(data,name,mime){const blob=new Blob([data],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function safeName(){return (p().property.name||'immocash').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,50)||'immocash';}
function exportCSV(kind){if(kind==='forecast'){
 const rows=forecast(p()).years;
 fileDownload(csvOutput(['Jahr','Mieterträge EUR','Betriebskosten EUR','Eigentümerkosten EUR','Rücklagen EUR','Kreditdienst EUR','Sonderumlagen EUR','Zins EUR','Tilgung EUR','Cashflow EUR','Kumulierter Cashflow EUR','Restschuld EUR','Immobilienwert EUR','Objekt-Eigenkapital EUR'],rows.map(x=>[x.year,x.income,x.operCost,x.ownerCost,x.reserves,x.debtPaid,x.special,x.interest,x.repayment,x.cashflow,x.cumulative,x.balance,x.marketValue,x.propertyEquity])),`${safeName()}-prognose.csv`,'text/csv;charset=utf-8');
 }else{const rows=scheduleAll(p(),600).rows;
 fileDownload(csvOutput(['Monat','Gesamtzahlung EUR','Zinsen EUR','Reguläre Tilgung EUR','Sondertilgung EUR','Restschuld EUR'],rows.map(x=>[x.month,x.payment,x.interest,x.repayment,x.extra,x.balance])),`${safeName()}-tilgungsplan.csv`,'text/csv;charset=utf-8');}}
function normalizeProject(x){if(!x || typeof x!=='object'||!x.property||!x.acquisition||!x.finance||!x.rent||!x.house)throw Error('Keine gültigen ImmoCash-Projektdaten.');
 const def=makeProject(true);
 const merge=(target,source)=>{for(const [key,val] of Object.entries(target)){const proposed=Object.hasOwn(source||{},key)?source[key]:val;if(Array.isArray(val))target[key]=Array.isArray(proposed)?proposed.slice(0,250):val;
 else if(val&&typeof val==='object')merge(val,proposed&&typeof proposed==='object'?proposed:{});
 else if(typeof val==='number')target[key]=Number.isFinite(proposed)?proposed:val;
 else if(typeof val==='boolean')target[key]=typeof proposed==='boolean'?proposed:val;
 else if(val===null)target[key]=proposed===null||Number.isFinite(proposed)?proposed:val;
 else target[key]=typeof proposed==='string'?proposed.slice(0,2000):val;
 }return target;};
 const result=merge(def,x);result.id=crypto.randomUUID?.()||String(Date.now()+Math.random());
 result.example=false;result.loans=Array.isArray(x.loans)?x.loans.filter(l=>l&&typeof l==='object').slice(0,16).map(l=>({...l,name:String(l.name||'Zusatzdarlehen').slice(0,90),principal:Math.max(0,Number(l.principal)||0)})):[];
 result.operating=Array.isArray(x.operating)?x.operating.filter(l=>l&&typeof l==='object').slice(0,60).map(l=>({name:String(l.name||'Betriebskosten').slice(0,100),amount:Math.max(0,Number(l.amount)||0),inHouse:!!l.inHouse,tenantShare:Math.max(0,Math.min(100,Number(l.tenantShare)||0))})):def.operating;
 result.events=Array.isArray(x.events)?x.events.filter(e=>e&&typeof e==='object').slice(0,50).map(e=>({description:String(e.description||'Sonderumlage').slice(0,200),year:Math.max(1,Math.round(Number(e.year)||1)),month:Math.max(1,Math.min(12,Math.round(Number(e.month)||12))),total:Math.max(0,Number(e.total)||0),share:Math.max(0,Math.min(100,Number(e.share)||0)),directShare:Math.max(0,Number(e.directShare)||0),reserveUse:Math.max(0,Number(e.reserveUse)||0)})):[];
 result.checklist=Object.fromEntries(Object.entries(x.checklist||{}).filter(([k,v])=>k.length<150&&['open','ok','warn','na'].includes(v)));
 return result;
}
function prepareReport(){
 const q=p(),ac=acquisition(q),l=loansFor(q),c=cashflow(q),t=taxSimulation(q),s=scheduleAll(q,360),fc=forecast(q),sc=scenarioCompare(q);
 const row=(k,v)=>`<tr><td>${esc(k)}</td><td>${esc(String(v))}</td></tr>`;
 const kv=values=>`<table>${values.map(([k,v])=>row(k,v)).join('')}</table>`;
 return `<h1>ImmoCash – Immobilien-Investment-Bericht</h1><p>${esc(q.property.name)} · erstellt am ${new Date().toLocaleDateString('de-DE')} · ${q.example?'Fiktives Beispiel':'Individuelle Berechnung'}</p>
 <h2>Objekt und Kauf</h2>${kv([['Anschrift',[q.property.address,q.property.zip,q.property.city].join(' ')],['Wohnfläche',number(q.property.area)+' m²'],['Kaufpreis',euro(ac.purchase)],['Erwerbsnebenkosten',euro(ac.fees)],['Weitere Anfangsausgaben',euro(ac.renovation+ac.initialOther)],['Gesamter Kapitalbedarf',euro(ac.total)],['Zusätzlicher Liquiditätspuffer',euro(ac.buffer)]])}
 <h2>Finanzierung</h2>${kv([['Finanzierungsmodell',q.finance.mode],['Darlehen insgesamt',euro(l.totalPrincipal)],['Benötigtes Eigenkapital',euro(l.requiredEquity)],['Darlehensrate',euro(c.rate)],['Zins und Tilgung im ersten Monat',`${euro(s.rows[0]?.interest||0)} / ${euro(s.rows[0]?.repayment||0)}`],['Restschuld nach 10 Jahren',euro(s.rows[119]?.balance)],['Hinweise',s.issue.join(' | ')||'–']])}
 <h2>Miete und Liquidität</h2>${kv([['Nettokaltmiete inkl. Extras',euro(rentalIncome(q))],['Betriebskostenvorauszahlungen',euro(c.tenantPayments)],['Hausgeld laut Plan',euro(q.house.total)],['WEG-Rücklage',euro(q.house.reserve)],['Normalisierter Monats-Cashflow',signed(c.economic)],['Monatliche Kontobewegung',signed(c.actual)],['Geschätzte Steuerwirkung im Monat',t?euro(t.perMonth):'deaktiviert'],['Break-even-Kaltmiete',euro(breakEven(q))]])}
 <h2>Szenarien</h2>${kv(sc.map(x=>[x.name,`${euro(x.cashflow)} / Monat · Restschuld 10 Jahre: ${euro(x.debt10)}`]))}
 <h2>Jahresprognose</h2><table><thead><tr><th>Jahr</th><th>Cashflow</th><th>Kumuliert</th><th>Restschuld</th><th>Objektvermögen</th></tr></thead><tbody>${fc.years.map(x=>`<tr><td>${x.year}</td><td>${euro(x.cashflow)}</td><td>${euro(x.cumulative)}</td><td>${euro(x.balance)}</td><td>${euro(x.propertyEquity)}</td></tr>`).join('')}</tbody></table>
 <h2>Risiken und Annahmen</h2><p>${warnings(q).map(w=>esc(w.message)).join(' | ')}</p><p class="print-legal">Unverbindliche vereinfachte Modellrechnung; keine Beratung, Bankzusage oder Gewähr für Steuervorteile. Keine Rechtsprüfung der Miethöhe oder Umlagefähigkeit von Kosten. Steigerungs- und Zinssätze sind Annahmen.</p>`;
}
async function pdfReport(){
 const button=document.activeElement;try{if(button instanceof HTMLButtonElement){button.disabled=true;button.dataset.originalText=button.textContent;button.textContent='PDF wird erstellt …';}
 const { jsPDF }=await import('jspdf');const pdf=new jsPDF({unit:'mm',format:'a4'});
 const q=p(),a=acquisition(q),l=loansFor(q),c=cashflow(q),t=taxSimulation(q),sc=scheduleAll(q,600),fc=forecast(q),sample=scenarioCompare(q);
 let y=20;const left=17,right=192,width=right-left;
 const clean=x=>String(x??'').replaceAll('€','EUR').replaceAll('²','2').replaceAll('–','-').replaceAll('−','-').replace(/[äÄöÖüÜß]/g,x=>({ä:'ae',Ä:'Ae',ö:'oe',Ö:'Oe',ü:'ue',Ü:'Ue',ß:'ss'}[x]));
 const ensure=(height)=>{if(y+height>275){pdf.addPage();y=19;}};
 const line=(text,head=false)=>{pdf.setFont('helvetica',head?'bold':'normal');pdf.setFontSize(head?12:9.5);const lines=pdf.splitTextToSize(clean(text),width);ensure(lines.length*(head?6:4.6)+3);pdf.text(lines,left,y);y+=lines.length*(head?6:4.6)+3;};
 const section=name=>{ensure(13);pdf.setDrawColor(210,225,230);pdf.line(left,y-2,right,y-2);line(name,true);};
 const item=(k,v)=>{line(`${k}: ${v}`);};
 pdf.setFont('helvetica','bold');pdf.setFontSize(19);pdf.text('ImmoCash',left,y);y+=11;line(`Investmentbericht | ${q.property.name} | ${new Date().toLocaleDateString('de-DE')}`);
 section('Objekt und Kauf');item('Adresse',[q.property.address,q.property.zip,q.property.city].join(' '));item('Kaufpreis',euro(a.purchase));item('Erwerbsnebenkosten',euro(a.fees));item('Weitere Anfangskosten',euro(a.renovation+a.initialOther));item('Gesamtkapitalbedarf',euro(a.total));item('Liquiditaetspuffer',euro(a.buffer));
 section('Finanzierung');item('Modell',q.finance.mode);item('Kredite',euro(l.totalPrincipal));item('Eigenkapitalbedarf',euro(l.requiredEquity));item('Monatsrate',euro(c.rate));item('Erster Monat Zins / Tilgung',`${euro(sc.rows[0]?.interest)} / ${euro(sc.rows[0]?.repayment)}`);item('Restschuld nach 10 Jahren',euro(sc.rows[119]?.balance));
 section('Miete und monatliche Kosten');item('Nettokaltmiete inklusive Extras',euro(rentalIncome(q)));item('Betriebskostenvorauszahlungen',euro(c.tenantPayments));item('Hausgeld',euro(q.house.total));item('Eigene Ruecklage',euro(c.privateBudget));item('Normalisierter Cashflow',signed(c.economic));item('Kontobewegung',signed(c.actual));item('Break-even-Kaltmiete',euro(breakEven(q)));if(t)item('Vereinfachte Steuerwirkung',euro(t.perMonth));
 section('Szenarien');sample.forEach(x=>item(x.name,`${euro(x.cashflow)} im Monat, Restschuld nach 10 J. ${euro(x.debt10)}`));
 section('Jahresprognose');fc.years.forEach(x=>item(`Jahr ${x.year}`,`CF ${euro(x.cashflow)}, kum. ${euro(x.cumulative)}, Restschuld ${euro(x.balance)}`));
 section('Wichtige Warnhinweise');warnings(q).forEach(x=>line(`- ${x.message}`));
 section('Rechtlicher Hinweis');line('Unverbindliche modellhafte Berechnung. Keine Bankzusage oder Rechts-/Steuerberatung. Steuersimulation, Mietsteigerungen, Finanzierungskonditionen und Wertentwicklungen sind Annahmen.');
 pdf.save(`${safeName()}-investmentbericht.pdf`);
 }catch(error){alert(`PDF-Export fehlgeschlagen: ${error.message}`)}finally{if(button instanceof HTMLButtonElement){button.disabled=false;button.textContent=button.dataset.originalText||'PDF erstellen';}}
}
function dispatchAction(action,target){const q=p();const idx=Number(target.dataset.index),val=target.dataset.value;
 switch(action){
 case 'nav':page=val;menuOpen=false;render();return;
 case 'input-tab':inputTab=val;render(true);return;
 case 'analysis-tab':analysisTab=val;render(true);return;
 case 'finance-mode':q.finance.mode=val;markEdited();render(true);return;
 case 'tax-view':afterTax=val==='after';render(true);return;
 case 'menu':menuOpen=!menuOpen;render(true);return;
 case 'theme':theme=theme==='dark'?'light':'dark';localStorage.setItem('immocash-theme',theme);document.documentElement.dataset.theme=theme;render(true);return;
 case 'new':{const np=makeProject(true);state.projects.push(np);state.activeId=np.id;inputTab='kauf';page='inputs';menuOpen=false;persist();render();return;}
 case 'duplicate':{const clone=normalizeProject(q);clone.property.name=`${q.property.name} – Kopie`;state.projects.push(clone);state.activeId=clone.id;menuOpen=false;persist();render();return;}
 case 'delete':if(!confirm(`Projekt „${q.property.name}“ wirklich löschen?`))return;state.projects=state.projects.filter(x=>x.id!==q.id);if(!state.projects.length)state.projects.push(makeProject(true));state.activeId=state.projects[0].id;menuOpen=false;persist();render();return;
 case 'add-loan':q.loans.push({name:`Kredit ${q.loans.length+2}`,principal:20000,rate:4,repayment:2,fixedYears:10,followRate:null,followRepayment:2,extraAnnual:0,extraMonth:12,manualPayment:0});markEdited();render(true);return;
 case 'remove-loan':q.loans.splice(idx,1);markEdited();render(true);return;
 case 'add-event':q.events.push({description:'Neue Maßnahme',year:2,month:12,total:10000,share:10,directShare:0,reserveUse:0});markEdited();render(true);return;
 case 'remove-event':q.events.splice(idx,1);markEdited();render(true);return;
 case 'add-operating':q.operating.push({name:'Neue Betriebskosten',amount:0,tenantShare:0,inHouse:false});markEdited();render(true);return;
 case 'delete-operating':q.operating.splice(idx,1);markEdited();render(true);return;
 case 'afa-suggest':q.tax.afaRate=q.property.year>0?(q.property.year<1925?2.5:q.property.year>=2023?3:2):2;markEdited();render(true);return;
 case 'export-json':fileDownload(JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),projects:state.projects,activeId:state.activeId},null,2),`${safeName()}-backup.json`,'application/json;charset=utf-8');menuOpen=false;render(true);return;
 case 'import-json':{const f=document.createElement('input');f.type='file';f.accept='.json,application/json';f.onchange=async()=>{try{const file=f.files?.[0];if(!file)return;if(file.size>3e6)throw Error('JSON-Datei zu groß.');const parsed=JSON.parse(await file.text());const incoming=Array.isArray(parsed.projects)?parsed.projects:[parsed];if(!incoming.length||incoming.length>100)throw Error('Ungültige Anzahl Projekte.');const list=incoming.map(normalizeProject);state.projects.push(...list);state.activeId=list[0].id;persist();menuOpen=false;render();}catch(err){alert(`Import fehlgeschlagen: ${err.message}`)}};f.click();return;}
 case 'export-csv':exportCSV('forecast');return;
 case 'export-tilgung':exportCSV('loans');return;
 case 'export-pdf':void pdfReport();return;
 case 'print':document.querySelector('#print-report').innerHTML=prepareReport();window.print();return;
 }
}
app.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button&&app.contains(button))dispatchAction(button.dataset.action,button);});
app.addEventListener('input',e=>{const el=e.target;
 if(el.dataset.quick){
   writePath(el);
   const valueNode=el.closest('.range-field')?.querySelector('output');if(valueNode)valueNode.textContent=`${number(el.valueAsNumber)} ${el.dataset.path==='finance.rate'||el.dataset.path==='finance.repayment'?'%':el.dataset.path==='rent.vacancyMonths'?'Mon.':'€'}`;
   const preview=document.querySelector('#quick-preview');if(preview)preview.innerHTML=quickCashflow();
   return;
 }
 if(el.dataset.path){writePath(el);updateVisible();return;}
 if(el.dataset.row!==undefined){const row=p().operating[Number(el.dataset.row)];if(!row)return;row[el.dataset.key]=el.type==='checkbox'?el.checked:el.type==='number'?Math.max(0,Number(el.value)||0):el.value;markEdited();updateVisible();return;}
 if(el.dataset.event!==undefined){const ev=p().events[Number(el.dataset.event)];if(!ev)return;ev[el.dataset.key]=el.type==='number'?Math.max(0,Number(el.value)||0):el.value;markEdited();updateVisible();return;}
 if(el.dataset.loan!==undefined){const loan=p().loans[Number(el.dataset.loan)];if(!loan)return;loan[el.dataset.key]=el.type==='number'?(el.value===''&&el.dataset.key==='followRate'?null:Math.max(0,Number(el.value)||0)):el.value;markEdited();updateVisible();return;}
});
app.addEventListener('change',e=>{const el=e.target;
 if(el.dataset.action==='project-change'){state.activeId=el.value;persist();render();return;}
 if(el.dataset.path){writePath(el);render(true);return;}
 if(el.dataset.feeUnit){p().acquisition[el.dataset.feeUnit].type=el.value;markEdited();render(true);return;}
 if(el.dataset.check){p().checklist[el.dataset.check]=el.value;markEdited();return;}
 if(el.dataset.row!==undefined||el.dataset.event!==undefined||el.dataset.loan!==undefined){markEdited();updateVisible();return;}
});
render();
