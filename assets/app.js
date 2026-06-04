
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfigs = {
  dezenas: {
    apiKey: "AIzaSyBI4-JqRRcqVAI0v7dXI9WtIx2unASVXys",
    authDomain: "sorteio-dono-da-banca.firebaseapp.com",
    projectId: "sorteio-dono-da-banca",
    storageBucket: "sorteio-dono-da-banca.firebasestorage.app",
    messagingSenderId: "394364598624",
    appId: "1:394364598624:web:97fc79bc06300cd8090605",
    measurementId: "G-SXFX6LQ969"
  },
  centenas: {
    apiKey: "AIzaSyBI4-JqRRcqVAI0v7dXI9WtIx2unASVXys",
    authDomain: "sorteio-dono-da-banca.firebaseapp.com",
    projectId: "sorteio-dono-da-banca",
    storageBucket: "sorteio-dono-da-banca.firebasestorage.app",
    messagingSenderId: "394364598624",
    appId: "1:394364598624:web:ecd75f94921260e8090605",
    measurementId: "G-45RSZGM8DL"
  }
};

const firebaseConfig = firebaseConfigs[window.SORTEIO_CONFIG?.tipo] || firebaseConfigs.dezenas;
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const ADMIN_PASSWORD = 'Marjorie06092025';
const cfg = window.SORTEIO_CONFIG || {tipo:'dezenas',label:'Dezenas',itemName:'dezena',total:100,digits:2};

let currentSorteioId = null;
let selectedNumeros = [];
let sorteios = [];
let participantes = [];
let ganhadores = [];
let settings = {nome:'SorteClub',rodape:'Kelly Menezes',cadastroUrl:''};

const $ = (id) => document.getElementById(id);
const col = (nome) => collection(firestore, `${nome}_${cfg.tipo}`);
const configDoc = () => doc(firestore, 'config', `site_${cfg.tipo}`);

Object.assign(window,{
  showPage,openParticipar,selecionarNumero,closeModal,salvarParticipacao,
  openLogin,loginAdmin,logoutAdmin,adminTab,criarSorteio,toggleSorteio,
  excluirSorteio,sortearGanhador,salvarAparencia,limparTudo,abrirCadastro
});

function iniciarFirebase(){
  onSnapshot(col('sorteios'), snap=>{sorteios=snap.docs.map(d=>({id:d.id,...d.data()}));renderAll();});
  onSnapshot(col('participantes'), snap=>{participantes=snap.docs.map(d=>({id:d.id,...d.data()}));renderAll();});
  onSnapshot(col('ganhadores'), snap=>{ganhadores=snap.docs.map(d=>({id:d.id,...d.data()}));renderAll();});
  onSnapshot(configDoc(), snap=>{if(snap.exists()) settings={...settings,...snap.data()};renderAll();});
}

function hideAllPages(){
  ['homePage','ganhadoresPage','adminPage'].forEach(id=>$(id)?.classList.add('hidden'));
}

function showPage(page){
  const home = document.getElementById('homePage');
  const ganhadores = document.getElementById('ganhadoresPage');
  const admin = document.getElementById('adminPage');

  if(home) home.classList.add('hidden');
  if(ganhadores) ganhadores.classList.add('hidden');
  if(admin) admin.classList.add('hidden');

  if(page === 'ganhadores'){
    if(ganhadores) ganhadores.classList.remove('hidden');
    renderAll();
    window.scrollTo({top:0, behavior:'smooth'});
    return;
  }

  if(page === 'admin'){
    if(sessionStorage.getItem('adminLogado') !== 'sim'){
      openLogin();
      return;
    }
    if(admin) admin.classList.remove('hidden');
    renderAll();
    adminTab('dashboard');
    window.scrollTo({top:0, behavior:'smooth'});
    return;
  }

  if(home) home.classList.remove('hidden');
  renderAll();
  window.scrollTo({top:0, behavior:'smooth'});
}

function openLogin(){
  const modal = document.getElementById('loginModal');
  const senha = document.getElementById('adminSenha');

  if(senha) senha.value = '';
  if(modal){
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  setTimeout(()=>senha?.focus(),100);
}

function loginAdmin(){
  const senha = document.getElementById('adminSenha')?.value || '';
  if(senha === ADMIN_PASSWORD){
    sessionStorage.setItem('adminLogado','sim');
    closeModal('loginModal');
    showPage('admin');
    return;
  }
  sessionStorage.removeItem('adminLogado');
  alert('Senha incorreta. Acesso negado.');
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

  renderAdmin();

  const tabs = {
    dashboard: document.getElementById('tabDashboard'),
    sorteios: document.getElementById('tabSorteios'),
    participantes: document.getElementById('tabParticipantes'),
    premiados: document.getElementById('tabPremiados'),
    aparencia: document.getElementById('tabAparencia')
  };

  document.querySelectorAll('.admin-tab').forEach(el => el.classList.add('hidden'));

  if(tabs[tab]){
    tabs[tab].classList.remove('hidden');
  }
}

function todosNumeros(){return Array.from({length:cfg.total},(_,i)=>String(i).padStart(cfg.digits,'0'))}
function numerosOcupados(sorteioId){
  return participantes
    .filter(p=>p.sorteioId===sorteioId)
    .flatMap(p=>Array.isArray(p.numeros) ? p.numeros : (p.numero ? [p.numero] : []));
}

function limiteSorteio(sorteio){
  const n = Number(sorteio?.limiteNumeros || 1);
  return n === 2 ? 2 : 1;
}
function numerosDoParticipante(p){
  if(Array.isArray(p.numeros)) return p.numeros;
  if(p.numero) return [p.numero];
  return [];
}
function textoNumeros(p){
  return numerosDoParticipante(p).join(', ');
}

function normalizarWhats(w){return String(w||'').replace(/[^0-9]/g,'')}
function formatDate(d){
  if(!d) return '-';
  if(String(d).includes('-')){const [y,m,day]=String(d).split('-');return `${day}/${m}/${y}`;}
  return d;
}
function capitalize(s){return String(s||'').charAt(0).toUpperCase()+String(s||'').slice(1)}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function escapeAttr(v){return escapeHtml(v).replace(/"/g,'&quot;')}

function abrirCadastro(){
  const url=String(settings.cadastroUrl||'').trim();
  if(!url) return alert('Cadastre a URL da banca no Admin > Aparência.');
  window.open(url,'_blank');
}

function renderAll(){
  if($('siteLogo')) $('siteLogo').innerHTML='<span>'+escapeHtml(settings.nome)+'</span>';
  if($('footerName')) $('footerName').textContent=settings.rodape;
  if($('year')) $('year').textContent=new Date().getFullYear();

  if($('countSorteios')) $('countSorteios').textContent=sorteios.length;
  if($('countParticipantes')) $('countParticipantes').textContent=participantes.length;
  if($('countGanhadores')) $('countGanhadores').textContent=ganhadores.length;

  const ativos=sorteios.filter(s=>s.status==='ativo');
  const sorteiosGrid=$('sorteiosGrid');
  if(sorteiosGrid){
    sorteiosGrid.innerHTML=ativos.map(s=>{
      const ocupadas=numerosOcupados(s.id).length;
      const livres=cfg.total-ocupadas;
      const limite=limiteSorteio(s);
      return `<div class="sorteio">
        <div>
          <span class="tag">ATIVO</span>
          <h3>${escapeHtml(s.titulo)}</h3>
          <p>${escapeHtml(s.descricao||'')}</p>
          <div class="price">${escapeHtml(s.premio)}</div>
          <p>Data: ${formatDate(s.data)}</p>
          <span class="limit-chip">Cada cliente escolhe ${limite} ${cfg.itemName}${limite>1?'s':''}</span>
          <div class="numero-info">
            <span class="mini-tag">${livres} ${cfg.itemName}s livres</span>
            <span class="mini-tag">${ocupadas} escolhidas</span>
          </div>
        </div>
        <button type="button" class="btn ok" onclick="openParticipar('${s.id}')">🎯 Quero Participar</button>
      </div>`;
    }).join('') || `<div class="sorteio">Nenhum sorteio de ${cfg.label.toLowerCase()} ativo no momento.</div>`;
  }

  const ganhadoresGrid=$('ganhadoresGrid');
  if(ganhadoresGrid){
    ganhadoresGrid.innerHTML=ganhadores.map(g=>`<div class="sorteio">
      <span class="tag">GANHADOR</span>
      <h3>${escapeHtml(g.nome)}</h3>
      <p>Sorteio: ${escapeHtml(g.sorteioTitulo)}</p>
      <div class="price">${escapeHtml(g.premio)}</div>
      <p>${capitalize(cfg.itemName)}: <strong>${escapeHtml(g.numero || textoNumeros(g) || '-')}</strong></p>
      <p>WhatsApp: ${escapeHtml(g.whats)}</p>
      <p>Data: ${formatDate(g.data)}</p>
    </div>`).join('') || '<div class="sorteio">Nenhum ganhador divulgado ainda.</div>';
  }

  if(sessionStorage.getItem('adminLogado')==='sim') renderAdmin();
}

function openParticipar(id){
  currentSorteioId=id;
  selectedNumeros=[];
  const s=sorteios.find(x=>x.id===id);
  if(!s) return alert('Sorteio não encontrado.');
  const ocupadas=numerosOcupados(id);
  const limite=limiteSorteio(s);

  $('participarInfo').innerHTML=`<p class="lead"><strong>${escapeHtml(s.titulo)}</strong><br>${escapeHtml(s.premio)}</p>
    <div class="notice">Escolha ${limite} ${cfg.itemName}${limite>1?'s':''} disponível${limite>1?'is':''}. Cada WhatsApp pode participar uma vez neste sorteio.</div>
    <div id="contadorEscolhas" class="choice-counter">Selecionadas: 0 de ${limite}</div>
    <div class="numeros-grid">${todosNumeros().map(n=>`<button type="button" class="numero-btn ${ocupadas.includes(n)?'taken':''}" ${ocupadas.includes(n)?'disabled':''} onclick="selecionarNumero('${n}')">${n}</button>`).join('')}</div>
    <div id="numeroEscolhido" class="notice hidden"></div>`;

  if($('pNome')) $('pNome').value='';
  if($('pWhats')) $('pWhats').value='';
  $('participarModal')?.classList.remove('hidden');
}

function selecionarNumero(numero){
  const s=sorteios.find(x=>x.id===currentSorteioId);
  const limite=limiteSorteio(s);

  if(selectedNumeros.includes(numero)){
    selectedNumeros=selectedNumeros.filter(n=>n!==numero);
  }else{
    if(selectedNumeros.length >= limite){
      alert(`Você só pode escolher ${limite} ${cfg.itemName}${limite>1?'s':''} neste sorteio.`);
      return;
    }
    selectedNumeros.push(numero);
  }

  document.querySelectorAll('.numero-btn').forEach(btn=>{
    btn.classList.toggle('selected', selectedNumeros.includes(btn.textContent));
  });

  const contador=$('contadorEscolhas');
  if(contador) contador.textContent=`Selecionadas: ${selectedNumeros.length} de ${limite}`;

  const box=$('numeroEscolhido');
  if(box){
    box.textContent=selectedNumeros.length ? `${capitalize(cfg.itemName)} escolhida${selectedNumeros.length>1?'s':''}: ${selectedNumeros.join(', ')}` : '';
    box.classList.toggle('hidden', selectedNumeros.length===0);
  }
}

function closeModal(id){
  const modal = document.getElementById(id);
  if(modal){
    modal.classList.add('hidden');
    modal.style.display = '';
  }
}

async async function salvarParticipacao(){
  const nome=$('pNome')?.value.trim() || '';
  const whats=$('pWhats')?.value.trim() || '';
  const whatsLimpo=normalizarWhats(whats);

  const s=sorteios.find(x=>x.id===currentSorteioId);
  if(!s) return alert('Sorteio não encontrado.');
  const limite=limiteSorteio(s);

  if(!nome||!whats) return alert('Preencha nome e WhatsApp.');
  if(whatsLimpo.length<10 || whatsLimpo.length>11) return alert('Digite um WhatsApp válido usando apenas números, com DDD.');
  if(selectedNumeros.length !== limite) return alert(`Escolha exatamente ${limite} ${cfg.itemName}${limite>1?'s':''} para participar.`);

  const snapWhats=await getDocs(query(col('participantes'),where('sorteioId','==',s.id),where('whatsLimpo','==',whatsLimpo)));
  if(!snapWhats.empty) return alert('Este WhatsApp já participou deste sorteio.');

  for(const numero of selectedNumeros){
    const snapNumero=await getDocs(query(col('participantes'),where('sorteioId','==',s.id),where('numeros','array-contains',numero)));
    const snapNumeroAntigo=await getDocs(query(col('participantes'),where('sorteioId','==',s.id),where('numero','==',numero)));
    if(!snapNumero.empty || !snapNumeroAntigo.empty) return alert(`A ${cfg.itemName} ${numero} já foi escolhida.`);
  }

  await addDoc(col('participantes'),{
    tipo:cfg.tipo,
    sorteioId:s.id,
    sorteioTitulo:s.titulo,
    nome,
    whats,
    whatsLimpo,
    numeros:[...selectedNumeros],
    numero:selectedNumeros.join(', '),
    limiteNumeros:limite,
    data:new Date().toISOString().slice(0,10),
    criadoEm:serverTimestamp()
  });

  selectedNumeros=[];
  closeModal('participarModal');
  alert(`Participação confirmada! Boa sorte.`);
}

function renderAdmin(){
  if(sessionStorage.getItem('adminLogado')!=='sim') return;

  if($('tabDashboard')) $('tabDashboard').innerHTML=`
    <h2 class="section-title">Painel Admin - ${cfg.label}</h2>
    <div class="stats">
      <div class="stat"><strong>${sorteios.length}</strong>Sorteios</div>
      <div class="stat"><strong>${participantes.length}</strong>Participantes</div>
      <div class="stat"><strong>${ganhadores.length}</strong>Premiados</div>
    </div>
    <div class="notice">Firebase ativo: ${cfg.itemName}s atualizam em tempo real.</div>`;

  if($('tabSorteios')) $('tabSorteios').innerHTML=`
    <h2 class="section-title">Gerenciar Sorteios</h2>
    <div class="form">
      <label>Título do sorteio</label>
      <input id="sTitulo" placeholder="Ex: Sorteio das 21H">
      <label>Descrição</label>
      <textarea id="sDesc" placeholder="Descrição do sorteio"></textarea>
      <label>Prêmio</label>
      <input id="sPremio" placeholder="Ex: R$ 50,00">
      <label>Data</label>
      <input id="sData" type="date">
      <label>Quantidade que cada cliente pode escolher</label>
      <select id="sLimiteNumeros">
        <option value="1">1 ${cfg.itemName}</option>
        <option value="2">2 ${cfg.itemName}s</option>
      </select>
      <button type="button" class="btn ok" onclick="criarSorteio()">➕ Criar Sorteio</button>
    </div><br>${tableSorteios()}`;

  if($('tabParticipantes')) $('tabParticipantes').innerHTML=`
    <h2 class="section-title">Participantes</h2>${tableParticipantes()}`;

  if($('tabPremiados')) $('tabPremiados').innerHTML=`
    <h2 class="section-title">Selecionar Ganhador</h2>
    <div class="form">
      <div class="notice">Escolha o participante que acertou a ${cfg.itemName}.</div>
      <select id="ganhadorManual">
        <option value="">Selecione o ganhador</option>
        ${participantes.map(p=>`<option value="${p.id}">${escapeHtml(textoNumeros(p))} - ${escapeHtml(p.nome)} | ${escapeHtml(p.sorteioTitulo)}</option>`).join('')}
      </select>
      <button type="button" class="btn ok" onclick="sortearGanhador()">🏆 Confirmar Ganhador</button>
    </div><br>${tableGanhadores()}`;

  if($('tabAparencia')) $('tabAparencia').innerHTML=`
    <h2 class="section-title">Aparência</h2>
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
  return `<div class="table-wrap"><table class="table">
    <tr><th>Título</th><th>Prêmio</th><th>Escolhas</th><th>${cfg.label}</th><th>Status</th><th>Ação</th></tr>
    ${sorteios.map(s=>{
      const qtd=numerosOcupados(s.id).length;
      const limite=limiteSorteio(s);
      return `<tr>
        <td>${escapeHtml(s.titulo)}</td><td>${escapeHtml(s.premio)}</td><td>${limite}</td><td>${qtd}/${cfg.total}</td><td>${s.status}</td>
        <td><button type="button" class="btn secondary" onclick="toggleSorteio('${s.id}')">Ativar/Pausar</button>
        <button type="button" class="btn danger" onclick="excluirSorteio('${s.id}')">Excluir</button></td>
      </tr>`;
    }).join('')}
  </table></div>`;
}
function tableParticipantes(){
  return `<div class="table-wrap"><table class="table">
    <tr><th>${capitalize(cfg.itemName)}(s)</th><th>Nome</th><th>WhatsApp</th><th>Sorteio</th></tr>
    ${participantes.map(p=>`<tr><td><strong>${escapeHtml(textoNumeros(p) || '-')}</strong></td><td>${escapeHtml(p.nome)}</td><td>${escapeHtml(p.whats)}</td><td>${escapeHtml(p.sorteioTitulo)}</td></tr>`).join('')}
  </table></div>`;
}
function tableGanhadores(){
  return `<div class="table-wrap"><table class="table">
    <tr><th>${capitalize(cfg.itemName)}(s)</th><th>Nome</th><th>Sorteio</th><th>Prêmio</th><th>Data</th></tr>
    ${ganhadores.map(g=>`<tr><td><strong>${escapeHtml(g.numero || textoNumeros(g) || '-')}</strong></td><td>${escapeHtml(g.nome)}</td><td>${escapeHtml(g.sorteioTitulo)}</td><td>${escapeHtml(g.premio)}</td><td>${formatDate(g.data)}</td></tr>`).join('')}
  </table></div>`;
}

async async function criarSorteio(){
  const titulo=$('sTitulo')?.value.trim() || '';
  const descricao=$('sDesc')?.value.trim() || '';
  const premio=$('sPremio')?.value.trim() || '';
  const data=$('sData')?.value || new Date().toISOString().slice(0,10);
  const limiteNumeros=Number($('sLimiteNumeros')?.value || 1);

  if(!titulo || !premio) return alert('Preencha título e prêmio.');

  try{
    await addDoc(col('sorteios'),{
      tipo:cfg.tipo,
      titulo,
      descricao: descricao || `Escolha ${limiteNumeros} ${cfg.itemName}${limiteNumeros>1?'s':''} disponível${limiteNumeros>1?'is':''} para participar.`,
      premio,
      limiteNumeros,
      status:'ativo',
      data,
      criadoEm:serverTimestamp()
    });

    ['sTitulo','sDesc','sPremio','sData'].forEach(id=>{if($(id)) $(id).value='';});
    if($('sLimiteNumeros')) $('sLimiteNumeros').value='1';
    alert('Sorteio criado com sucesso!');
    renderAll();
    adminTab('sorteios');
  }catch(err){
    console.error(err);
    alert('Erro ao criar sorteio. Confira as regras do Firebase.');
  }
}

async function toggleSorteio(id){
  const s=sorteios.find(x=>x.id===id);
  if(!s) return;
  await updateDoc(doc(firestore,`sorteios_${cfg.tipo}`,id),{status:s.status==='ativo'?'pausado':'ativo'});
}
async function excluirSorteio(id){
  if(!confirm('Excluir este sorteio? Isso também apaga participantes e ganhadores dele.')) return;
  await deleteDoc(doc(firestore,`sorteios_${cfg.tipo}`,id));
  const partSnap=await getDocs(query(col('participantes'),where('sorteioId','==',id)));
  for(const item of partSnap.docs) await deleteDoc(doc(firestore,`participantes_${cfg.tipo}`,item.id));
  const ganhSnap=await getDocs(query(col('ganhadores'),where('sorteioId','==',id)));
  for(const item of ganhSnap.docs) await deleteDoc(doc(firestore,`ganhadores_${cfg.tipo}`,item.id));
}
async async function sortearGanhador(){
  const participanteId=$('ganhadorManual')?.value || '';
  if(!participanteId) return alert('Selecione um participante.');
  const p=participantes.find(x=>x.id===participanteId);
  if(!p) return alert('Participante não encontrado.');
  const s=sorteios.find(x=>x.id===p.sorteioId);
  const nums=numerosDoParticipante(p);
  const ja=ganhadores.some(g=>g.participanteId===p.id);
  if(ja) return alert('Esse participante já está marcado como ganhador.');

  await addDoc(col('ganhadores'),{
    tipo:cfg.tipo,
    participanteId:p.id,
    nome:p.nome,
    whats:p.whats,
    numeros:nums,
    numero:nums.join(', '),
    sorteioId:p.sorteioId,
    sorteioTitulo:p.sorteioTitulo,
    premio:s?.premio||'Prêmio',
    data:new Date().toISOString().slice(0,10),
    criadoEm:serverTimestamp()
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
  for(const s of sorteios) await deleteDoc(doc(firestore,`sorteios_${cfg.tipo}`,s.id));
  for(const p of participantes) await deleteDoc(doc(firestore,`participantes_${cfg.tipo}`,p.id));
  for(const g of ganhadores) await deleteDoc(doc(firestore,`ganhadores_${cfg.tipo}`,g.id));
}

document.addEventListener('DOMContentLoaded',()=>{
  $('adminSenha')?.addEventListener('keydown',e=>{if(e.key==='Enter') loginAdmin();});
  if(location.hash==='#admin') openLogin();
});
window.addEventListener('mousemove',e=>{
  document.body.style.setProperty('--mx',`${(e.clientX/window.innerWidth)*100}%`);
  document.body.style.setProperty('--my',`${(e.clientY/window.innerHeight)*100}%`);
});

iniciarFirebase();


// Exposição global dos botões do HTML
window.showPage = showPage;
window.openLogin = openLogin;
window.loginAdmin = loginAdmin;
window.closeModal = closeModal;
window.adminTab = adminTab;
