import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAP0ITU9ZuHkEpZ8T1SED8kKdTB8nvmbVA",
  authDomain: "sorteio-kelly.firebaseapp.com",
  projectId: "sorteio-kelly",
  storageBucket: "sorteio-kelly.firebasestorage.app",
  messagingSenderId: "792044241286",
  appId: "1:792044241286:web:ff417bb6d36625b835ec07",
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const ADMIN_PASSWORD = 'Marjorie06092025';
const cfg = window.SORTEIO_CONFIG || {tipo:'dezenas',label:'Dezenas',itemName:'dezena',total:100,digits:2};

let currentSorteioId = null;
let selectedNumero = null;
let sorteios = [];
let participantes = [];
let ganhadores = [];
let settings = {nome:'SorteClub',rodape:'Kelly Menezes',cadastroUrl:''};

const $ = (id) => document.getElementById(id);
const col = (nome) => collection(firestore, `${nome}_${cfg.tipo}`);
const configDoc = () => doc(firestore, 'config', `site_${cfg.tipo}`);

window.showPage = showPage;
window.openParticipar = openParticipar;
window.selecionarNumero = selecionarNumero;
window.closeModal = closeModal;
window.salvarParticipacao = salvarParticipacao;
window.openLogin = openLogin;
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.adminTab = adminTab;
window.criarSorteio = criarSorteio;
window.toggleSorteio = toggleSorteio;
window.excluirSorteio = excluirSorteio;
window.sortearGanhador = sortearGanhador;
window.salvarAparencia = salvarAparencia;
window.limparTudo = limparTudo;
window.abrirCadastro = abrirCadastro;

function iniciarFirebase(){
  onSnapshot(col('sorteios'), snap=>{
    sorteios = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderAll();
  });
  onSnapshot(col('participantes'), snap=>{
    participantes = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderAll();
  });
  onSnapshot(col('ganhadores'), snap=>{
    ganhadores = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderAll();
  });
  onSnapshot(configDoc(), snap=>{
    if(snap.exists()) settings = {...settings,...snap.data()};
    renderAll();
  });
}

function hideAllPages(){
  ['homePage','ganhadoresPage','adminPage'].forEach(id => {
    const el = $(id);
    if(el) el.classList.add('hidden');
  });
}

function showPage(page){
  hideAllPages();

  if(page === 'admin'){
    if(sessionStorage.getItem('adminLogado') !== 'sim'){
      openLogin();
      return;
    }
    $('adminPage')?.classList.remove('hidden');
    renderAll();
    adminTab('dashboard');
    return;
  }

  if(page === 'ganhadores'){
    $('ganhadoresPage')?.classList.remove('hidden');
    renderAll();
    return;
  }

  $('homePage')?.classList.remove('hidden');
  renderAll();
}

function openLogin(){
  hideAllPages();
  $('homePage')?.classList.remove('hidden');
  const senha = $('adminSenha');
  if(senha) senha.value = '';
  $('loginModal')?.classList.remove('hidden');
  setTimeout(()=>senha?.focus(), 100);
}

function loginAdmin(){
  const senha = $('adminSenha')?.value || '';
  if(senha === ADMIN_PASSWORD){
    sessionStorage.setItem('adminLogado','sim');
    closeModal('loginModal');
    showPage('admin');
  }else{
    sessionStorage.removeItem('adminLogado');
    alert('Senha incorreta. Acesso negado.');
  }
}

function logoutAdmin(){
  sessionStorage.removeItem('adminLogado');
  showPage('home');
}

function adminTab(tab){
  if(sessionStorage.getItem('adminLogado') !== 'sim'){
    openLogin();
    return;
  }
  const tabs = {
    dashboard: $('tabDashboard'),
    sorteios: $('tabSorteios'),
    participantes: $('tabParticipantes'),
    premiados: $('tabPremiados'),
    aparencia: $('tabAparencia')
  };
  document.querySelectorAll('.admin-tab').forEach(e=>e.classList.add('hidden'));
  tabs[tab]?.classList.remove('hidden');
}

function todosNumeros(){
  return Array.from({length:cfg.total},(_,i)=>String(i).padStart(cfg.digits,'0'));
}
function numerosOcupados(sorteioId){
  return participantes.filter(p=>p.sorteioId===sorteioId).map(p=>p.numero);
}
function formatDate(d){
  if(!d) return '-';
  if(String(d).includes('-')){
    const [y,m,day]=String(d).split('-');
    return `${day}/${m}/${y}`;
  }
  return d;
}
function normalizarWhats(w){return String(w||'').replace(/[^0-9]/g,'')}
function capitalize(s){ return String(s||'').charAt(0).toUpperCase()+String(s||'').slice(1); }
function escapeHtml(v){
  return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function escapeAttr(v){ return escapeHtml(v).replace(/"/g,'&quot;'); }

function abrirCadastro(){
  const url = String(settings.cadastroUrl || '').trim();
  if(!url){
    alert('Cadastre a URL da banca no Admin > Aparência.');
    return;
  }
  window.open(url, '_blank');
}

function renderAll(){
  if($('siteLogo')) $('siteLogo').innerHTML='<span>'+escapeHtml(settings.nome)+'</span>';
  if($('footerName')) $('footerName').textContent=settings.rodape;
  if($('year')) $('year').textContent=new Date().getFullYear();

  const ativos=sorteios.filter(s=>s.status==='ativo');
  if($('countSorteios')) $('countSorteios').textContent=sorteios.length;
  if($('countParticipantes')) $('countParticipantes').textContent=participantes.length;
  if($('countGanhadores')) $('countGanhadores').textContent=ganhadores.length;

  const sorteiosGrid = $('sorteiosGrid');
  if(sorteiosGrid){
    sorteiosGrid.innerHTML=ativos.map(s=>{
      const ocupadas=numerosOcupados(s.id).length;
      const livres=cfg.total-ocupadas;
      return `<div class="card sorteio">
        <div>
          <span class="tag">ATIVO</span>
          <h3>${escapeHtml(s.titulo)}</h3>
          <p>${escapeHtml(s.descricao||'')}</p>
          <div class="price">${escapeHtml(s.premio)}</div>
          <p>Data: ${formatDate(s.data)}</p>
          <div class="numero-info">
            <span class="mini-tag">${livres} ${cfg.itemName}s livres</span>
            <span class="mini-tag">${ocupadas} escolhidas</span>
          </div>
        </div>
        <button type="button" class="btn ok" onclick="openParticipar('${s.id}')">🎯 Quero Participar</button>
      </div>`;
    }).join('') || `<div class="card sorteio">Nenhum sorteio de ${cfg.label.toLowerCase()} ativo no momento.</div>`;
  }

  const ganhadoresGrid = $('ganhadoresGrid');
  if(ganhadoresGrid){
    ganhadoresGrid.innerHTML=ganhadores.map(g=>`<div class="card sorteio">
      <span class="tag">GANHADOR</span>
      <h3>${escapeHtml(g.nome)}</h3>
      <p>Sorteio: ${escapeHtml(g.sorteioTitulo)}</p>
      <div class="price">${escapeHtml(g.premio)}</div>
      <p>${capitalize(cfg.itemName)} sorteada: <strong>${g.numero||'-'}</strong></p>
      <p>WhatsApp: ${escapeHtml(g.whats)}</p>
      <p>Data: ${formatDate(g.data)}</p>
    </div>`).join('') || '<div class="card sorteio">Nenhum ganhador divulgado ainda.</div>';
  }

  renderAdmin();
}

function openParticipar(id){
  currentSorteioId=id;
  selectedNumero=null;
  const s=sorteios.find(x=>x.id===id);
  if(!s) return alert('Sorteio não encontrado.');
  const ocupadas=numerosOcupados(id);
  $('participarInfo').innerHTML=`<p class="lead"><strong>${escapeHtml(s.titulo)}</strong><br>${escapeHtml(s.premio)}</p>
    <div class="notice">Escolha uma ${cfg.itemName} disponível. Cada WhatsApp pode participar com apenas 1 ${cfg.itemName} neste sorteio.</div>
    <div class="numeros-grid">${todosNumeros().map(n=>`<button type="button" class="numero-btn ${ocupadas.includes(n)?'taken':''}" ${ocupadas.includes(n)?'disabled':''} onclick="selecionarNumero('${n}')">${n}</button>`).join('')}</div>
    <div id="numeroEscolhido" class="notice hidden"></div>`;
  if($('pNome')) $('pNome').value='';
  if($('pWhats')) $('pWhats').value='';
  $('participarModal')?.classList.remove('hidden');
}

function selecionarNumero(numero){
  selectedNumero=numero;
  document.querySelectorAll('.numero-btn').forEach(btn=>btn.classList.remove('selected'));
  [...document.querySelectorAll('.numero-btn')].find(btn=>btn.textContent===numero)?.classList.add('selected');
  const box = $('numeroEscolhido');
  if(box){
    box.textContent=capitalize(cfg.itemName)+' escolhida: '+numero;
    box.classList.remove('hidden');
  }
}

function closeModal(id){
  $(id)?.classList.add('hidden');
}

async function salvarParticipacao(){
  const nome=$('pNome')?.value.trim() || '';
  const whats=$('pWhats')?.value.trim() || '';
  const whatsLimpo = normalizarWhats(whats);
  if(!nome||!whats) return alert('Preencha nome e WhatsApp.');
  if(whatsLimpo.length < 10 || whatsLimpo.length > 11) return alert('Digite um WhatsApp válido usando apenas números, com DDD.');
  if(!selectedNumero) return alert(`Escolha uma ${cfg.itemName} para participar.`);
  const s=sorteios.find(x=>x.id===currentSorteioId);
  if(!s) return alert('Sorteio não encontrado.');

  const qWhats=query(col('participantes'),where('sorteioId','==',s.id),where('whatsLimpo','==',whatsLimpo));
  const snapWhats=await getDocs(qWhats);
  if(!snapWhats.empty) return alert(`Este WhatsApp já participou deste sorteio.`);

  const qNumero=query(col('participantes'),where('sorteioId','==',s.id),where('numero','==',selectedNumero));
  const snapNumero=await getDocs(qNumero);
  if(!snapNumero.empty) return alert(`Essa ${cfg.itemName} já foi escolhida. Escolha outra.`);

  await addDoc(col('participantes'),{
    tipo:cfg.tipo,sorteioId:s.id,sorteioTitulo:s.titulo,nome,whats,whatsLimpo,
    numero:selectedNumero,data:new Date().toISOString().slice(0,10),criadoEm:serverTimestamp()
  });
  selectedNumero=null;
  closeModal('participarModal');
  alert(`Participação confirmada! Sua ${cfg.itemName} foi reservada. Boa sorte.`);
}

function renderAdmin(){
  if(sessionStorage.getItem('adminLogado')!=='sim') return;

  if($('tabDashboard')) $('tabDashboard').innerHTML =
    `<h2 class="section-title">Painel Admin - ${cfg.label}</h2>
    <div class="stats">
      <div class="stat"><strong>${sorteios.length}</strong>Sorteios</div>
      <div class="stat"><strong>${participantes.length}</strong>Participantes</div>
      <div class="stat"><strong>${ganhadores.length}</strong>Premiados</div>
    </div>
    <div class="notice">Firebase ativo: ${cfg.itemName}s atualizam em tempo real.</div>`;

  if($('tabSorteios')) $('tabSorteios').innerHTML =
    `<h2 class="section-title">Gerenciar Sorteios</h2>
    <div class="form">
      <label>Título do sorteio</label>
      <input id="sTitulo" placeholder="Ex: Sorteio das 21H">
      <label>Descrição</label>
      <textarea id="sDesc" placeholder="Descrição do sorteio"></textarea>
      <label>Prêmio</label>
      <input id="sPremio" placeholder="Ex: R$ 50,00">
      <label>Data</label>
      <input id="sData" type="date">
      <button type="button" class="btn ok" onclick="criarSorteio()">➕ Criar Sorteio</button>
    </div><br>${tableSorteios()}`;

  if($('tabParticipantes')) $('tabParticipantes').innerHTML =
    `<h2 class="section-title">Participantes</h2>${tableParticipantes()}`;

  if($('tabPremiados')) $('tabPremiados').innerHTML =
    `<h2 class="section-title">Selecionar Ganhador</h2>
    <div class="form">
      <div class="notice">Escolha manualmente o participante que acertou a ${cfg.itemName}.</div>
      <select id="ganhadorManual">
        <option value="">Selecione o ganhador pela ${cfg.itemName}</option>
        ${participantes.map(p=>`<option value="${p.id}">${p.numero} - ${escapeHtml(p.nome)} | ${escapeHtml(p.sorteioTitulo)}</option>`).join('')}
      </select>
      <button type="button" class="btn ok pulse" onclick="sortearGanhador()">🏆 Confirmar Ganhador</button>
    </div><br>${tableGanhadores()}`;

  if($('tabAparencia')) $('tabAparencia').innerHTML =
    `<h2 class="section-title">Aparência</h2>
    <div class="form">
      <label>Nome do site</label>
      <input id="setNome" value="${escapeAttr(settings.nome)}">
      <label>Rodapé/assinatura</label>
      <input id="setRodape" value="${escapeAttr(settings.rodape)}">
      <label>URL do botão de cadastro</label>
      <input id="setCadastroUrl" placeholder="https://seulinkdecadastro.com" value="${escapeAttr(settings.cadastroUrl||'')}">
      <button type="button" class="btn ok" onclick="salvarAparencia()">Salvar Aparência</button>
      <button type="button" class="btn danger" onclick="limparTudo()">Limpar todos os dados de ${cfg.label}</button>
    </div>`;
}

function tableSorteios(){
  return `<div class="table-wrap"><table class="table"><tr><th>Título</th><th>Prêmio</th><th>${cfg.label}</th><th>Status</th><th>Ação</th></tr>${sorteios.map(s=>{
    const qtd=numerosOcupados(s.id).length;
    return `<tr><td>${escapeHtml(s.titulo)}</td><td>${escapeHtml(s.premio)}</td><td>${qtd}/${cfg.total}</td><td>${s.status}</td><td><button type="button" class="btn secondary" onclick="toggleSorteio('${s.id}')">Ativar/Pausar</button> <button type="button" class="btn danger" onclick="excluirSorteio('${s.id}')">Excluir</button></td></tr>`;
  }).join('')}</table></div>`;
}

function tableParticipantes(){
  return `<div class="table-wrap"><table class="table"><tr><th>${capitalize(cfg.itemName)}</th><th>Nome</th><th>WhatsApp</th><th>Sorteio</th></tr>${participantes.map(p=>`<tr><td><strong>${p.numero||'-'}</strong></td><td>${escapeHtml(p.nome)}</td><td>${escapeHtml(p.whats)}</td><td>${escapeHtml(p.sorteioTitulo)}</td></tr>`).join('')}</table></div>`;
}

function tableGanhadores(){
  return `<div class="table-wrap"><table class="table"><tr><th>${capitalize(cfg.itemName)}</th><th>Nome</th><th>Sorteio</th><th>Prêmio</th><th>Data</th></tr>${ganhadores.map(g=>`<tr><td><strong>${g.numero||'-'}</strong></td><td>${escapeHtml(g.nome)}</td><td>${escapeHtml(g.sorteioTitulo)}</td><td>${escapeHtml(g.premio)}</td><td>${formatDate(g.data)}</td></tr>`).join('')}</table></div>`;
}

async function criarSorteio(){
  const titulo = $('sTitulo')?.value.trim() || '';
  const descricao = $('sDesc')?.value.trim() || '';
  const premio = $('sPremio')?.value.trim() || '';
  const data = $('sData')?.value || new Date().toISOString().slice(0,10);
  if(!titulo || !premio) return alert('Preencha título e prêmio.');

  await addDoc(col('sorteios'),{
    tipo:cfg.tipo,
    titulo,
    descricao: descricao || `Escolha uma ${cfg.itemName} disponível para participar.`,
    premio,
    status:'ativo',
    data,
    criadoEm:serverTimestamp()
  });
  alert('Sorteio criado com sucesso!');
}

async function toggleSorteio(id){
  const s=sorteios.find(x=>x.id===id);
  if(!s) return;
  await updateDoc(doc(firestore, `sorteios_${cfg.tipo}`, id),{status:s.status==='ativo'?'pausado':'ativo'});
}

async function excluirSorteio(id){
  if(!confirm('Excluir este sorteio? Isso também vai apagar os participantes e ganhadores desse sorteio.')) return;
  await deleteDoc(doc(firestore, `sorteios_${cfg.tipo}`, id));
  const partSnap=await getDocs(query(col('participantes'),where('sorteioId','==',id)));
  for(const item of partSnap.docs){ await deleteDoc(doc(firestore, `participantes_${cfg.tipo}`, item.id)); }
  const ganhSnap=await getDocs(query(col('ganhadores'),where('sorteioId','==',id)));
  for(const item of ganhSnap.docs){ await deleteDoc(doc(firestore, `ganhadores_${cfg.tipo}`, item.id)); }
}

async function sortearGanhador(){
  const participanteId=$('ganhadorManual')?.value || '';
  if(!participanteId) return alert('Selecione um participante.');
  const p=participantes.find(x=>x.id===participanteId);
  if(!p) return alert('Participante não encontrado.');
  const s=sorteios.find(x=>x.id===p.sorteioId);
  const jaPremiado=ganhadores.some(g=>g.participanteId===p.id || (g.sorteioId===p.sorteioId && g.numero===p.numero));
  if(jaPremiado) return alert('Esse participante já está marcado como ganhador.');

  await addDoc(col('ganhadores'),{
    tipo:cfg.tipo,participanteId:p.id,nome:p.nome,whats:p.whats,numero:p.numero,
    sorteioId:p.sorteioId,sorteioTitulo:p.sorteioTitulo,premio:s?.premio||'Prêmio',
    data:new Date().toISOString().slice(0,10),criadoEm:serverTimestamp()
  });
  alert('Ganhador confirmado: '+p.nome);
}

async function salvarAparencia(){
  await setDoc(configDoc(),{
    nome:$('setNome')?.value || settings.nome,
    rodape:$('setRodape')?.value || settings.rodape,
    cadastroUrl:$('setCadastroUrl')?.value || ''
  },{merge:true});
  alert('Aparência salva com sucesso!');
}

async function limparTudo(){
  if(!confirm(`Tem certeza? Isso apaga sorteios, participantes e ganhadores de ${cfg.label}.`)) return;
  for(const s of sorteios){ await deleteDoc(doc(firestore, `sorteios_${cfg.tipo}`, s.id)); }
  for(const p of participantes){ await deleteDoc(doc(firestore, `participantes_${cfg.tipo}`, p.id)); }
  for(const g of ganhadores){ await deleteDoc(doc(firestore, `ganhadores_${cfg.tipo}`, g.id)); }
}

document.addEventListener('DOMContentLoaded', () => {
  const campoSenha = $('adminSenha');
  if(campoSenha){
    campoSenha.addEventListener('keydown', (e) => {
      if(e.key === 'Enter') loginAdmin();
    });
  }

  if(location.hash === '#admin'){
    openLogin();
  }
});

window.addEventListener('mousemove', e => {
  document.body.style.setProperty('--mx', `${(e.clientX / window.innerWidth) * 100}%`);
  document.body.style.setProperty('--my', `${(e.clientY / window.innerHeight) * 100}%`);
});

iniciarFirebase();
