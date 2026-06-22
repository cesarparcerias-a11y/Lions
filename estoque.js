// ── Configurações
const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || '';
const SUPABASE_KEY = window.__ENV__?.SUPABASE_ANON_KEY || '';
const WEBHOOK_URL  = window.__ENV__?.N8N_WEBHOOK_URL || '';
const MATRICULA_PARCEIRO = '40756';
const EMAIL_PARCEIRO     = 'cesar.parcerias@gmail.com';
const API_LIONS = 'https://n8n-production-1b10.up.railway.app/webhook/estoque-lions';

let paginaAtual      = 1;
let carroSelecionado = null;
let todosOsCarros    = [];
let carrosFiltrados  = [];
let carregamentoCompleto = false;

let filtros = {
  busca: '',
  marca: '',
  modelo: '',
  cor: '',
  combustivel: '',
  anoMin: 0,
  anoMax: 9999,
  carrocerias: [],
  _sliderMexido: false
};

// ── Normalizar texto (BRANCA / Branca / branca → Branca)
function normalizar(str) {
  if (!str) return '';
  return str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();
}

function normalizarVeiculo(v) {
  return {
    ...v,
    marca:       normalizar(v.marca),
    modelo:      v.modelo ? v.modelo.trim() : '',
    cor:         normalizar(v.cor),
    combustivel: normalizar(v.combustivel),
    carroceria:  v.carroceria ? v.carroceria.trim() : ''
  };
}

function formatKm(km) {
  return parseInt(km).toLocaleString('pt-BR') + ' km';
}

// ── Barra de progresso na sidebar
function atualizarProgresso(atual, total) {
  const pct   = Math.round((atual / total) * 100);
  const barra = document.getElementById('barraProgresso');
  const txt   = document.getElementById('progressoTxt');
  if (barra) barra.style.width = pct + '%';
  if (txt)   txt.textContent   = `Carregando estoque… ${pct}%`;
  if (pct >= 100) {
    setTimeout(() => {
      const prog = document.getElementById('sidebarProgresso');
      if (prog) prog.style.display = 'none';
    }, 600);
  }
}

// ── INICIAR: mostra primeiros carros rápido e carrega o resto em segundo plano
async function iniciar() {
  const loading = document.getElementById('loadingEstado');
  const erroEl  = document.getElementById('erroEstado');

  loading.style.display = 'flex';
  erroEl.style.display  = 'none';
  document.getElementById('sidebarProgresso').style.display = 'block';

  try {
    // Primeira página — mostra rápido
    const res1  = await fetch(`${API_LIONS}?pagina=1&quantidade=18`);
    const data1 = await res1.json();
    const totalPaginas = data1.totalPaginas || 1;

    const primeiros = (data1.veiculos || []).map(normalizarVeiculo);
    todosOsCarros   = primeiros;
    carrosFiltrados = primeiros;

    loading.style.display = 'none';
    document.getElementById('estoqueContador').textContent = `Carregando estoque…`;
    renderGrid(1);

    atualizarProgresso(1, totalPaginas);

    // Carrega o resto em segundo plano
    carregarRestoEmSegundoPlano(totalPaginas);

  } catch (err) {
    document.getElementById('erroEstado').style.display = 'block';
    loading.style.display = 'none';
  }
}

async function carregarRestoEmSegundoPlano(totalPaginas) {
  try {
    for (let p = 2; p <= totalPaginas; p++) {
      const res  = await fetch(`${API_LIONS}?pagina=${p}&quantidade=100`);
      const data = await res.json();
      todosOsCarros = todosOsCarros.concat((data.veiculos || []).map(normalizarVeiculo));
      atualizarProgresso(p, totalPaginas);
    }
  } catch (e) { /* usa o que já tem */ }

  carregamentoCompleto = true;
  popularFiltros(todosOsCarros);

  const total = todosOsCarros.length;

  // Atualiza título da página estoque com número real
  const tituloEm = document.querySelector('.estoque-page-titulo em');
  if (tituloEm) tituloEm.textContent = `+${total} carros disponíveis`;

  // Salva o total no Supabase para a home ler
  salvarTotalNoSupabase(total);

  // Gera bloco SEO com todos os carros para o Google indexar
  gerarSEOCarros(todosOsCarros);

  // Só atualiza grid/contador se nenhum filtro estiver ativo
  const temFiltro = filtros.busca || filtros.marca || filtros.modelo ||
    filtros.cor || filtros.combustivel || filtros.carrocerias.length > 0 || filtros._sliderMexido;

  if (!temFiltro) {
    carrosFiltrados = todosOsCarros;
    document.getElementById('estoqueContador').textContent = `${total} carros disponíveis no estoque`;
    renderGrid(paginaAtual); // re-renderiza com paginação completa
  }
}

// ── Popular dropdowns
function popularFiltros(carros) {
  const marcas       = [...new Set(carros.map(v => v.marca).filter(Boolean))].sort();
  const cores        = [...new Set(carros.map(v => v.cor).filter(Boolean))].sort();
  const combustiveis = [...new Set(carros.map(v => v.combustivel).filter(Boolean))].sort();

  const anos = carros.map(v => parseInt(v.ano_modelo)).filter(Boolean);
  const anoMin = Math.min(...anos);
  const anoMax = Math.max(...anos);

  const slMin = document.getElementById('anoMin');
  const slMax = document.getElementById('anoMax');
  if (!filtros._sliderMexido) {
    slMin.min = anoMin; slMin.max = anoMax; slMin.value = anoMin;
    slMax.min = anoMin; slMax.max = anoMax; slMax.value = anoMax;
    filtros.anoMin = anoMin;
    filtros.anoMax = anoMax;
    atualizarRangeUI();
  }

  preencherSelect('filtroMarca',       marcas,       filtros.marca);
  preencherSelect('filtroCor',         cores,        filtros.cor);
  preencherSelect('filtroCombustivel', combustiveis, filtros.combustivel);
}

function preencherSelect(id, lista, valorAtual) {
  const sel = document.getElementById(id);
  const valSalvo = valorAtual || sel.value;
  sel.innerHTML = '<option value="">Selecione uma opção</option>';
  lista.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item; opt.textContent = item;
    if (item === valSalvo) opt.selected = true;
    sel.appendChild(opt);
  });
}

function atualizarModelos(marca) {
  const sel = document.getElementById('filtroModelo');
  sel.innerHTML = '<option value="">Selecione uma opção</option>';
  if (!marca) return;
  [...new Set(todosOsCarros.filter(v => v.marca === marca).map(v => v.modelo).filter(Boolean))].sort()
    .forEach(m => {
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = m;
      sel.appendChild(opt);
    });
}

// ── Aplicar filtros (usa todosOsCarros — completo ou parcial)
function aplicarFiltros() {
  const termo = filtros.busca.toLowerCase();
  carrosFiltrados = todosOsCarros.filter(v => {
    if (termo) {
      const bate = (v.marca||'').toLowerCase().includes(termo) ||
        (v.modelo||'').toLowerCase().includes(termo) ||
        (v.cor||'').toLowerCase().includes(termo) ||
        (v.ano_fabricacao||'').toString().includes(termo);
      if (!bate) return false;
    }
    if (filtros.marca       && v.marca       !== filtros.marca)       return false;
    if (filtros.modelo      && v.modelo      !== filtros.modelo)      return false;
    if (filtros.cor         && v.cor         !== filtros.cor)         return false;
    if (filtros.combustivel && v.combustivel !== filtros.combustivel) return false;
    const ano = parseInt(v.ano_modelo) || 0;
    if (ano < filtros.anoMin || ano > filtros.anoMax) return false;
    if (filtros.carrocerias.length > 0 && !filtros.carrocerias.includes(v.carroceria)) return false;
    return true;
  });

  const aviso = !carregamentoCompleto ? ' (carregando mais…)' : ' disponíveis no estoque';
  document.getElementById('estoqueContador').textContent =
    `${carrosFiltrados.length} carros${aviso}`;

  renderGrid(1);
}

// ── Detectar mobile
function isMobile() {
  return window.innerWidth <= 768;
}

// ── Renderizar grid
function renderGrid(pagina) {
  paginaAtual = pagina;
  const grid      = document.getElementById('estoqueGrid');
  const paginacao = document.getElementById('paginacao');
  grid.innerHTML      = '';
  paginacao.innerHTML = '';

  if (!carrosFiltrados.length) {
    grid.innerHTML = '<p class="sem-resultados-txt">Nenhum carro encontrado com esses filtros.</p>';
    return;
  }

  if (isMobile()) {
    // Mobile: rolagem infinita — mostra tudo de uma vez
    carrosFiltrados.forEach(v => renderCard(grid, v));
  } else {
    // Desktop: paginação com 18 carros (6 linhas × 3 colunas)
    const porPagina = 18;
    const totalPag  = Math.ceil(carrosFiltrados.length / porPagina);
    const inicio    = (pagina - 1) * porPagina;
    carrosFiltrados.slice(inicio, inicio + porPagina).forEach(v => renderCard(grid, v));
    renderizarPaginacao(pagina, totalPag);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function renderCard(grid, v) {
  const card = document.createElement('div');
  card.className = 'ep-card';
  card.innerHTML = `
    <div class="ep-foto">
      <img src="${v.media_links.frente}" alt="${v.marca} ${v.modelo}" loading="lazy"
           onerror="this.src='https://via.placeholder.com/280x180/1a1a1a/666?text=Sem+foto'" />
    </div>
    <div class="ep-info">
      <p class="ep-marca">${v.marca}</p>
      <h3 class="ep-modelo">${v.modelo}</h3>
      <div class="ep-detalhes">
        <span>📅 ${v.ano_fabricacao}/${v.ano_modelo}</span>
        <span>🛣️ ${formatKm(v.km)}</span>
        <span>🎨 ${v.cor}</span>
      </div>
      <button class="btn-carro" onclick='abrirPopup(${JSON.stringify(v)})'>Tenho interesse</button>
    </div>`;
  grid.appendChild(card);
}

function renderizarPaginacao(atual, total) {
  const paginacao = document.getElementById('paginacao');
  if (total <= 1) return;
  const criar = (texto, pagina, ativo = false, desabilitado = false) => {
    const btn = document.createElement('button');
    btn.className = 'pag-btn' + (ativo ? ' ativo' : '') + (desabilitado ? ' desabilitado' : '');
    btn.textContent = texto;
    if (!desabilitado) btn.addEventListener('click', () => renderGrid(pagina));
    paginacao.appendChild(btn);
  };
  criar('‹', atual - 1, false, atual === 1);
  const inicio = Math.max(1, atual - 2);
  const fim    = Math.min(total, atual + 2);
  if (inicio > 1) { criar('1', 1); if (inicio > 2) criar('…', null, false, true); }
  for (let i = inicio; i <= fim; i++) criar(i, i, i === atual);
  if (fim < total) { if (fim < total - 1) criar('…', null, false, true); criar(total, total); }
  criar('›', atual + 1, false, atual === total);
}

// ── Range slider
function atualizarRangeUI() {
  const slMin  = document.getElementById('anoMin');
  const slMax  = document.getElementById('anoMax');
  const fill   = document.getElementById('rangeFill');
  const minTxt = document.getElementById('anoMinVal');
  const maxTxt = document.getElementById('anoMaxVal');
  const label  = document.getElementById('anoLabel');
  const min = parseInt(slMin.min), max = parseInt(slMin.max);
  const vMin = parseInt(slMin.value), vMax = parseInt(slMax.value);
  fill.style.left  = ((vMin - min) / (max - min) * 100) + '%';
  fill.style.width = ((vMax - vMin) / (max - min) * 100) + '%';
  minTxt.textContent = vMin;
  maxTxt.textContent = vMax;
  label.textContent  = (vMin === min && vMax === max) ? 'Todos' : `${vMin} / ${vMax}`;
}

document.getElementById('anoMin').addEventListener('input', function() {
  if (parseInt(this.value) > parseInt(document.getElementById('anoMax').value))
    this.value = document.getElementById('anoMax').value;
  filtros.anoMin = parseInt(this.value); filtros._sliderMexido = true;
  atualizarRangeUI(); dispararFiltro();
});
document.getElementById('anoMax').addEventListener('input', function() {
  if (parseInt(this.value) < parseInt(document.getElementById('anoMin').value))
    this.value = document.getElementById('anoMin').value;
  filtros.anoMax = parseInt(this.value); filtros._sliderMexido = true;
  atualizarRangeUI(); dispararFiltro();
});

// ── Debounce
let debounceTimer;
function dispararFiltro() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(aplicarFiltros, 400);
}

// ── Busca desktop (sidebar)
document.getElementById('buscaInput').addEventListener('input', function() {
  filtros.busca = this.value.trim();
  // sincroniza com mobile
  document.getElementById('buscaInputMobile').value = this.value;
  dispararFiltro();
});

// ── Busca mobile (topbar)
document.getElementById('buscaInputMobile').addEventListener('input', function() {
  filtros.busca = this.value.trim();
  // sincroniza com desktop
  document.getElementById('buscaInput').value = this.value;
  dispararFiltro();
});

document.getElementById('filtroMarca').addEventListener('change', function() {
  filtros.marca = this.value; filtros.modelo = '';
  document.getElementById('filtroModelo').value = '';
  atualizarModelos(this.value); aplicarFiltros();
});
document.getElementById('filtroModelo').addEventListener('change', function() {
  filtros.modelo = this.value; aplicarFiltros();
});
document.getElementById('filtroCor').addEventListener('change', function() {
  filtros.cor = this.value; aplicarFiltros();
});
document.getElementById('filtroCombustivel').addEventListener('change', function() {
  filtros.combustivel = this.value; aplicarFiltros();
});
document.getElementById('checkboxCarroceria').addEventListener('change', function(e) {
  if (!e.target.matches('input[type=checkbox]')) return;
  const val = e.target.value;
  if (e.target.checked) filtros.carrocerias.push(val);
  else filtros.carrocerias = filtros.carrocerias.filter(c => c !== val);
  aplicarFiltros();
});

// ── Limpar
document.getElementById('btnLimparFiltros').addEventListener('click', function() {
  filtros = { busca:'', marca:'', modelo:'', cor:'', combustivel:'',
    anoMin:0, anoMax:9999, carrocerias:[], _sliderMexido:false };
  document.getElementById('buscaInput').value = '';
  document.getElementById('buscaInputMobile').value = '';
  document.getElementById('filtroMarca').value = '';
  document.getElementById('filtroModelo').innerHTML = '<option value="">Selecione uma opção</option>';
  document.getElementById('filtroCor').value = '';
  document.getElementById('filtroCombustivel').value = '';
  const slMin = document.getElementById('anoMin'), slMax = document.getElementById('anoMax');
  filtros.anoMin = parseInt(slMin.min); filtros.anoMax = parseInt(slMax.max);
  slMin.value = slMin.min; slMax.value = slMax.max;
  atualizarRangeUI();
  document.querySelectorAll('#checkboxCarroceria input[type=checkbox]').forEach(cb => cb.checked = false);
  carrosFiltrados = todosOsCarros;
  document.getElementById('estoqueContador').textContent = `${todosOsCarros.length} carros encontrados`;
  renderGrid(1);
});

// ── Sidebar mobile
function abrirSidebar() {
  document.getElementById('filtrosSidebar').classList.add('aberta');
  document.getElementById('sidebarOverlay').classList.add('ativo');
  document.body.style.overflow = 'hidden';
}
function fecharSidebar() {
  document.getElementById('filtrosSidebar').classList.remove('aberta');
  document.getElementById('sidebarOverlay').classList.remove('ativo');
  document.body.style.overflow = '';
}
document.getElementById('btnFiltrosMobile').addEventListener('click', abrirSidebar);
document.getElementById('sidebarOverlay').addEventListener('click', fecharSidebar);
document.getElementById('btnFecharSidebar').addEventListener('click', fecharSidebar);

// ── Popup
function abrirPopup(v) {
  carroSelecionado = v;
  document.getElementById('popupCarroInfo').innerHTML = `
    <strong>${v.marca} ${v.modelo}</strong>
    ${v.ano_fabricacao}/${v.ano_modelo} • ${formatKm(v.km)} • ${v.cor}`;
  ['popupNome','popupWpp','popupEmail'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('popupLoja').value = '';
  document.getElementById('popupErro').style.display = 'none';
  document.getElementById('popupEnviar').classList.remove('loading');
  document.getElementById('popupOverlay').classList.add('ativo');
}
document.getElementById('popupFechar').addEventListener('click', () =>
  document.getElementById('popupOverlay').classList.remove('ativo'));
document.getElementById('popupOverlay').addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('ativo');
});
document.getElementById('popupWpp').addEventListener('input', function() {
  let v = this.value.replace(/\D/g,'').slice(0,11);
  v = v.length <= 10 ? v.replace(/^(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3')
                     : v.replace(/^(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3');
  this.value = v.trim().replace(/-$/,'');
});
document.getElementById('popupEnviar').addEventListener('click', async function() {
  const nome  = document.getElementById('popupNome').value.trim();
  const wpp   = document.getElementById('popupWpp').value.trim();
  const email = document.getElementById('popupEmail').value.trim();
  const loja  = document.getElementById('popupLoja').value;
  const erro  = document.getElementById('popupErro');
  const v     = carroSelecionado;
  erro.style.display = 'none';
  if (!nome || !wpp || !email || !loja) {
    erro.textContent = 'Preencha todos os campos.'; erro.style.display = 'block'; return;
  }
  const wppLimpo = wpp.replace(/\D/g,'');
  if (wppLimpo.length < 10) {
    erro.textContent = 'WhatsApp inválido.'; erro.style.display = 'block'; return;
  }
  this.classList.add('loading');
  const descricao = `Cliente tem interesse em: ${v.marca} ${v.modelo} | ${v.ano_fabricacao}/${v.ano_modelo} | ${formatKm(v.km)} | ${v.cor} | Loja: ${loja}`;
  const payloadSupabase = { nome_cliente:nome, whatsapp_cliente:wppLimpo, email_cliente:email, loja, descricao, matricula_parceiro:MATRICULA_PARCEIRO, email_parceiro:EMAIL_PARCEIRO, origem:'estoque-cesar', criado_em:new Date().toISOString() };
  const payloadWebhook  = { nome_cliente:nome, whatsapp_cliente:wppLimpo, loja, descricao, matricula_parceiro:MATRICULA_PARCEIRO, email_parceiro:EMAIL_PARCEIRO, origem:'estoque-cesar', criado_em:new Date().toISOString() };
  try {
    if (SUPABASE_URL && SUPABASE_KEY)
      await fetch(`${SUPABASE_URL}/rest/v1/leads`, { method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'return=minimal'},
        body:JSON.stringify(payloadSupabase) });
    if (WEBHOOK_URL)
      await fetch(WEBHOOK_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payloadWebhook) });
    window.location.href = 'obrigado.html';
  } catch {
    this.classList.remove('loading');
    erro.textContent = 'Erro ao enviar. Tente novamente.'; erro.style.display = 'block';
  }
});

// ── Salva total do estoque no Supabase (para a home ler)
async function salvarTotalNoSupabase(total) {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    await fetch(`${SUPABASE_URL}/rest/v1/config_site`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ chave: 'total_estoque', valor: String(total) })
    });
  } catch(e) {}
}

// ── Gerar bloco SEO com carros reais para indexação do Google
function gerarSEOCarros(carros) {
  const el = document.getElementById('seoCarros');
  if (!el) return;

  // Lista única de "Marca Modelo Ano" para o Google ler
  const itens = [...new Set(
    carros.map(v => `${v.marca} ${v.modelo} ${v.ano_modelo}`.trim())
  )].sort();

  // Marcas únicas
  const marcas = [...new Set(carros.map(v => v.marca).filter(Boolean))].sort();

  el.innerHTML = `
    <p>Seminovos disponíveis no estoque Lions: ${itens.join(', ')}.</p>
    <p>Marcas no estoque: ${marcas.join(', ')}. Total de ${carros.length} veículos seminovos disponíveis para financiamento. Compre seu carro seminovo pela indicação do Cesar Bittencourt, parceiro Lions Seminovos.</p>
  `;
}

// ── Iniciar
iniciar();
