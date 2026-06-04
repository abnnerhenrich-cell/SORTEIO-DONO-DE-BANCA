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
let settings = {nome:'Sorteios da Kelly',rodape:'Kelly Menezes',cadastroUrl:''};

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

function col(nome){ return collection(firestore, `${nome}_${cfg.tipo}`); }
function configDoc(){ return doc(firestore, 'config', `site_${cfg.tipo}`); }

async function iniciarFirebase(){
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

function showPage(page){
  const pages = {
    home: document.getElementById('homePage'),
    ganhadores: document.getElementById('ganhadoresPage'),
    admin: document.getElementById('adminPage')
  };

  Object.values(pages).forEach(el => {
    if(el) el.classList.add('hidden');
  });

  if(page === 'admin'){
    if(sessionStorage.getItem('adminLogado') !== 'sim'){
      return openLogin();
    }
    if(pages.admin) pages.admin.classList.remove('hidden');
    renderAll();
    adminTab('dashboard');
    return;
  }

  if(page === 'ganhadores'){
    if(pages.ganhadores) pages.ganhadores.classList.remove('hidden');
    renderAll();
    return;
  }

  if(pages.home) pages.home.classList.remove('hidden');
  renderAll();
}
function todosNumeros(){return Array.from({length:cfg.total},(_,i)=>String(i).padStart(cfg.digits,'0'))}
function numerosOcupados(sorteioId){return participantes.filter(p=>p.sorteioId===sorteioId).map(p=>p.numero)}
function formatDate(d){
  if(!d) return '-';
  if(String(d).includes('-')){ const [y,m,day]=String(d).split('-'); return `${day}/${m}/${y}`; }
  return d;
}
function normalizarWhats(w){return String(w||'').replace(/[^0-9]/g,'')}

function abrirCadastro(){
  const url = String(settings.cadastroUrl || '').trim();
  if(!url) return alert('Cadastre a URL da banca no Admin > Aparência.');
  window.open(url, '_blank');
}

function renderAll(){
  siteLogo.innerHTML='<span>'+settings.nome+'</span>';
  footerName.textContent=settings.rodape;
  year.textContent=new Date().getFullYear();

  const ativos=sorteios.filter(s=>s.status==='ativo');
  countSorteios.textContent=sorteios.length;
  countParticipantes.textContent=participantes.length;
  countGanhadores.textContent=ganhadores.length;

  sorteiosGrid.innerHTML=ativos.map(s=>{
    const ocupadas=numerosOcupados(s.id).length;
    const livres=cfg.total-ocupadas;
    return `<div class="card sorteio"><div><span class="tag">ATIVO</span><h3>${escapeHtml(s.titulo)}</h3><p>${escapeHtml(s.descricao||'')}</p><div class="price">${escapeHtml(s.premio)}</div><p>Data: ${formatDate(s.data)}</p><div class="numero-info"><span class="mini-tag">${livres} ${cfg.itemName}s livres</span><span class="mini-tag">${ocupadas} escolhidas</span></div></div><button class="btn ok" onclick="openParticipar('${s.id}')">🎯 Quero Participar</button></div>`;
  }).join('') || `<div class="card">Nenhum sorteio de ${cfg.label.toLowerCase()} ativo no momento.</div>`;

  ganhadoresGrid.innerHTML=ganhadores.map(g=>`<div class="card"><span class="tag">GANHADOR</span><h3>${escapeHtml(g.nome)}</h3><p>Sorteio: ${escapeHtml(g.sorteioTitulo)}</p><div class="price">${escapeHtml(g.premio)}</div><p>${capitalize(cfg.itemName)} sorteada: <strong>${g.numero||'-'}</strong></p><p>WhatsApp: ${escapeHtml(g.whats)}</p><p>Data: ${formatDate(g.data)}</p></div>`).join('') || '<div class="card">Nenhum ganhador divulgado ainda.</div>';

  renderAdmin();
}

function openParticipar(id){
  currentSorteioId=id;
  selectedNumero=null;
  const s=sorteios.find(x=>x.id===id);
  const ocupadas=numerosOcupados(id);
  participarInfo.innerHTML=`<p class="lead"><strong>${escapeHtml(s.titulo)}</strong><br>${escapeHtml(s.premio)}</p><div class="notice">Escolha uma ${cfg.itemName} disponível. Cada WhatsApp pode participar com apenas 1 ${cfg.itemName} neste sorteio.</div><div class="numeros-grid">${todosNumeros().map(n=>`<button class="numero-btn ${ocupadas.includes(n)?'taken':''}" ${ocupadas.includes(n)?'disabled':''} onclick="selecionarNumero('${n}')">${n}</button>`).join('')}</div><div id="numeroEscolhido" class="notice hidden"></div>`;
  pNome.value='';
  pWhats.value='';
  participarModal.classList.remove('hidden');
}

function selecionarNumero(numero){
  selectedNumero=numero;
  document.querySelectorAll('.numero-btn').forEach(btn=>btn.classList.remove('selected'));
  [...document.querySelectorAll('.numero-btn')].find(btn=>btn.textContent===numero)?.classList.add('selected');
  numeroEscolhido.textContent=capitalize(cfg.itemName)+' escolhida: '+numero;
  numeroEscolhido.classList.remove('hidden');
}

function closeModal(id){document.getElementById(id).classList.add('hidden')}

async function salvarParticipacao(){
  const nome=pNome.value.trim(), whats=pWhats.value.trim();
  const whatsLimpo = normalizarWhats(whats);
  if(!nome||!whats) return alert('Preencha nome e WhatsApp.');
  if(whatsLimpo.length < 10 || whatsLimpo.length > 11) return alert('Digite um WhatsApp válido usando apenas números, com DDD. Exemplo: 14999999999');
  if(!selectedNumero) return alert(`Escolha uma ${cfg.itemName} para participar.`);
  const s=sorteios.find(x=>x.id===currentSorteioId);

  const qWhats=query(col('participantes'),where('sorteioId','==',s.id),where('whatsLimpo','==',whatsLimpo));
  const snapWhats=await getDocs(qWhats);
  if(!snapWhats.empty) return alert(`Este WhatsApp já participou deste sorteio. É permitido apenas 1 ${cfg.itemName} por pessoa.`);

  const qNumero=query(col('participantes'),where('sorteioId','==',s.id),where('numero','==',selectedNumero));
  const snapNumero=await getDocs(qNumero);
  if(!snapNumero.empty) return alert(`Essa ${cfg.itemName} já foi escolhida. Escolha outra.`);

  await addDoc(col('participantes'),{
    tipo:cfg.tipo,
    sorteioId:s.id,
    sorteioTitulo:s.titulo,
    nome,
    whats,
    whatsLimpo,
    numero:selectedNumero,
    data:new Date().toISOString().slice(0,10),
    criadoEm:serverTimestamp()
  });
  selectedNumero=null;
  closeModal('participarModal');
  alert(`Participação confirmada! Sua ${cfg.itemName} foi reservada. Boa sorte.`);
}

function openLogin(){
  const input = document.getElementById('adminSenha');
  if(input) input.value = '';
  const modal = document.getElementById('loginModal');
  if(modal) modal.classList.remove('hidden');
}
function loginAdmin(){
  const senha = document.getElementById('adminSenha')?.value || '';
  if(senha === ADMIN_PASSWORD){
    sessionStorage.setItem('adminLogado','sim');
    closeModal('loginModal');
    const admin = document.getElementById('adminPage');
    const home = document.getElementById('homePage');
    const ganhadores = document.getElementById('ganhadoresPage');
    if(home) home.classList.add('hidden');
    if(ganhadores) ganhadores.classList.add('hidden');
    if(admin) admin.classList.remove('hidden');
    renderAll();
    adminTab('dashboard');
  } else {
    alert('Senha incorreta.');
  }
}
function logoutAdmin(){
  sessionStorage.removeItem('adminLogado');
  const input = document.getElementById('adminSenha');
  if(input) input.value = '';
  showPage('home');
}
function adminTab(tab){
  const tabs = {
    dashboard: tabDashboard,
    sorteios: tabSorteios,
    participantes: tabParticipantes,
    premiados: tabPremiados,
    aparencia: tabAparencia
  };
  document.querySelectorAll('.admin-tab').forEach(e=>e.classList.add('hidden'));
  if(tabs[tab]) tabs[tab].classList.remove('hidden');
  renderAdmin();
}

function renderAdmin(){
  if(sessionStorage.getItem('adminLogado')!=='sim') return;

  tabDashboard.innerHTML =
    `<h2 class="section-title">Painel Admin - ${cfg.label}</h2>
    <div class="stats">
      <div class="stat"><strong>${sorteios.length}</strong>Sorteios</div>
      <div class="stat"><strong>${participantes.length}</strong>Participantes</div>
      <div class="stat"><strong>${ganhadores.length}</strong>Premiados</div>
    </div>
    <div class="notice">Firebase ativo: ${cfg.itemName}s atualizam em tempo real entre celulares diferentes.</div>`;

  tabSorteios.innerHTML =
    `<h2 class="section-title">Gerenciar Sorteios</h2>
    <div class="form">
      <label>Título do sorteio</label>
      <input id="sTitulo" placeholder="Ex: Sorteio das 21H">
      <label>Descrição</label>
      <textarea id="sDesc" placeholder="Descrição do sorteio"></textarea>
      <label>Prêmio</label>
      <input id="sPremio" placeholder="Ex: 30,00">
      <label>Data</label>
      <input id="sData" type="date">
      <button type="button" class="btn ok" onclick="criarSorteio()">➕ Criar Sorteio</button>
    </div>
    <br>${tableSorteios()}`;

  tabParticipantes.innerHTML =
    `<h2 class="section-title">Participantes</h2>${tableParticipantes()}`;

  tabPremiados.innerHTML =
    `<h2 class="section-title">Selecionar Ganhador</h2>
    <div class="form">
      <div class="notice">Escolha manualmente o participante que acertou a ${cfg.itemName} para marcar como ganhador.</div>
      <select id="ganhadorManual">
        <option value="">Selecione o ganhador pela ${cfg.itemName}</option>
        ${participantes.map(p=>`<option value="${p.id}">${p.numero} - ${escapeHtml(p.nome)} | ${escapeHtml(p.sorteioTitulo)}</option>`).join('')}
      </select>
      <button type="button" class="btn ok pulse" onclick="sortearGanhador()">🏆 Confirmar Ganhador</button>
    </div>
    <br>${tableGanhadores()}`;

  tabAparencia.innerHTML =
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
    return `<tr><td>${escapeHtml(s.titulo)}</td><td>${escapeHtml(s.premio)}</td><td>${qtd}/${cfg.total}</td><td>${s.status}</td><td><button class="btn secondary" onclick="toggleSorteio('${s.id}')">Ativar/Pausar</button> <button class="btn danger" onclick="excluirSorteio('${s.id}')">Excluir</button></td></tr>`
  }).join('')}</table></div>`
}
function tableParticipantes(){
  return `<div class="table-wrap"><table class="table"><tr><th>${capitalize(cfg.itemName)}</th><th>Nome</th><th>WhatsApp</th><th>Sorteio</th></tr>${participantes.map(p=>`<tr><td><strong>${p.numero||'-'}</strong></td><td>${escapeHtml(p.nome)}</td><td>${escapeHtml(p.whats)}</td><td>${escapeHtml(p.sorteioTitulo)}</td></tr>`).join('')}</table></div>`
}
function tableGanhadores(){
  return `<div class="table-wrap"><table class="table"><tr><th>${capitalize(cfg.itemName)}</th><th>Nome</th><th>Sorteio</th><th>Prêmio</th><th>Data</th></tr>${ganhadores.map(g=>`<tr><td><strong>${g.numero||'-'}</strong></td><td>${escapeHtml(g.nome)}</td><td>${escapeHtml(g.sorteioTitulo)}</td><td>${escapeHtml(g.premio)}</td><td>${formatDate(g.data)}</td></tr>`).join('')}</table></div>`
}

async function criarSorteio(){
  const tituloEl = document.getElementById('sTitulo');
  const descEl = document.getElementById('sDesc');
  const premioEl = document.getElementById('sPremio');
  const dataEl = document.getElementById('sData');

  const titulo = (tituloEl?.value || '').trim();
  const descricao = (descEl?.value || '').trim();
  const premio = (premioEl?.value || '').trim();
  const data = dataEl?.value || new Date().toISOString().slice(0,10);

  if(!titulo || !premio) return alert('Preencha título e prêmio.');

  try{
    await addDoc(col('sorteios'),{
      tipo:cfg.tipo,
      titulo,
      descricao: descricao || `Escolha uma ${cfg.itemName} disponível para participar.`,
      premio,
      status:'ativo',
      data,
      criadoEm:serverTimestamp()
    });

    if(tituloEl) tituloEl.value='';
    if(descEl) descEl.value='';
    if(premioEl) premioEl.value='';
    if(dataEl) dataEl.value='';

    alert('Sorteio criado com sucesso!');
  }catch(erro){
    console.error(erro);
    alert('Erro ao criar sorteio. Confira se o Firebase está ativo e se as regras permitem gravação.');
  }
}

async function toggleSorteio(id){
  const s=sorteios.find(x=>x.id===id);
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
  const select = document.getElementById('ganhadorManual');
  const participanteId = select?.value || '';
  if(!participanteId) return alert('Selecione um participante para marcar como ganhador.');

  const p=participantes.find(x=>x.id===participanteId);
  if(!p) return alert('Participante não encontrado. Atualize a página e tente novamente.');

  const s=sorteios.find(x=>x.id===p.sorteioId);
  const jaPremiado=ganhadores.some(g=>g.participanteId===p.id || (g.sorteioId===p.sorteioId && g.numero===p.numero));
  if(jaPremiado) return alert(`Esse participante/${cfg.itemName} já está marcado como ganhador.`);

  try{
    await addDoc(col('ganhadores'),{
      tipo:cfg.tipo,
      participanteId:p.id,
      nome:p.nome,
      whats:p.whats,
      numero:p.numero,
      sorteioId:p.sorteioId,
      sorteioTitulo:p.sorteioTitulo,
      premio:s?.premio||'Prêmio',
      data:new Date().toISOString().slice(0,10),
      criadoEm:serverTimestamp()
    });
    alert('Ganhador confirmado: '+p.nome+' | '+capitalize(cfg.itemName)+': '+p.numero);
  }catch(erro){
    console.error(erro);
    alert('Erro ao salvar ganhador. Confira o Firebase.');
  }
}

async function salvarAparencia(){
  const nome = document.getElementById('setNome')?.value || settings.nome;
  const rodape = document.getElementById('setRodape')?.value || settings.rodape;
  const cadastroUrl = document.getElementById('setCadastroUrl')?.value || '';

  try{
    await setDoc(configDoc(),{nome,rodape,cadastroUrl},{merge:true});
    alert('Aparência salva com sucesso!');
  }catch(erro){
    console.error(erro);
    alert('Erro ao salvar aparência. Confira o Firebase.');
  }
}

async function limparTudo(){
  if(!confirm(`Tem certeza? Isso apaga sorteios, participantes e ganhadores de ${cfg.label}.`)) return;
  for(const s of sorteios){ await deleteDoc(doc(firestore, `sorteios_${cfg.tipo}`, s.id)); }
  for(const p of participantes){ await deleteDoc(doc(firestore, `participantes_${cfg.tipo}`, p.id)); }
  for(const g of ganhadores){ await deleteDoc(doc(firestore, `ganhadores_${cfg.tipo}`, g.id)); }
}

function escapeHtml(v){
  return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function escapeAttr(v){ return escapeHtml(v).replace(/"/g,'&quot;'); }
function capitalize(s){ return String(s||'').charAt(0).toUpperCase()+String(s||'').slice(1); }

iniciarFirebase();


// Fundo interativo acompanhando o toque/mouse
window.addEventListener('mousemove', e => {
  document.body.style.setProperty('--mx', `${(e.clientX / window.innerWidth) * 100}%`);
  document.body.style.setProperty('--my', `${(e.clientY / window.innerHeight) * 100}%`);
});
window.addEventListener('touchmove', e => {
  const t = e.touches && e.touches[0];
  if(!t) return;
  document.body.style.setProperty('--mx', `${(t.clientX / window.innerWidth) * 100}%`);
  document.body.style.setProperty('--my', `${(t.clientY / window.innerHeight) * 100}%`);
}, {passive:true});


// Mostra erro real caso algum clique falhe
window.addEventListener('error', function(e){
  console.error('Erro no site:', e.message, e.error);
});
window.addEventListener('unhandledrejection', function(e){
  console.error('Erro de promessa/Firebase:', e.reason);
});
