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

// Estado dos filtros
let filtros = {
  busca: '',
  marca: '',
  modelo: '',
  cor: '',
  combustivel: '',
  anoMin: 2005,
  anoMax: 2026,
  carrocerias: []
};

// ── Normalizar texto (remove duplicatas como BRANCA / Branca / branca)
function normalizar(str) {
  if (!str) return '';
  return str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();
}

// ── Formatar km
function formatKm(km) {
  return parseInt(km).toLocaleString('pt-BR') + ' km';
}

// ── PASSO 1: Carregar primeira página imediatamente e mostrar os carros
async function iniciar() {
  const loading = document.getElementById('loadingEstado');
  const erroEl  = document.getElementById('erroEstado');

  loading.style.display = 'flex';
  erroEl.style.display  = 'none';

  try {
    // Busca só a primeira página (rápido)
    const res  = await fetch(`${API_LIONS}?pagina=1&quantidade=16`);
    const data = await res.json();

    // Normaliza e salva no cache
    const primeiros = (data.veiculos || []).map(normalizarVeiculo);
    todosOsCarros   = primeiros;
    carrosFiltrados = primeiros;

    // Mostra os carros imediatamente
    loading.style.display = 'none';
    carregarPagina(1);

    // PASSO 2: Carrega o resto em segundo plano, sem travar a tela
    carregarRestoEmSegundoPlano(data.totalPaginas || 1);

  } catch (err) {
    erroEl.style.display  = 'block';
    loading.style.display = 'none';
  }
}

// ── Normalizar campos de um veículo
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

// ── PASSO 2: Carrega páginas restantes silenciosamente
async function carregarRestoEmSegundoPlano(totalPaginas) {
  try {
    for (let p = 2; p <= totalPaginas; p++) {
      const res  = await fetch(`${API_LIONS}?pagina=${p}&quantidade=100`);
      const data = await res.json();
      const novos = (data.veiculos || []).map(normalizarVeiculo);
      todosOsCarros = todosOsCarros.concat(novos);
    }
  } catch (err) {
    // Se falhar no meio, usa o que já tem
  }

  carregamentoCompleto = true;
  popularFiltros(todosOsCarros);

  // Atualiza contador se não houver filtro ativo
  const temFiltroAtivo = filtros.busca || filtros.marca || filtros.modelo ||
    filtros.cor || filtros.combustivel || filtros.carrocerias.length > 0;
  if (!temFiltroAtivo) {
    carrosFiltrados = todosOsCarros;
    document.getElementById('estoqueContador').textContent =
      `${todosOsCarros.length} carros encontrados`;
  }
}

// ── Popular dropdowns com dados normalizados
function popularFiltros(carros) {
  const marcas       = [...new Set(carros.map(v => v.marca).filter(Boolean))].sort();
  const cores        = [...new Set(carros.map(v => v.cor).filter(Boolean))].sort();
  const combustiveis = [...new Set(carros.map(v => v.combustivel).filter(Boolean))].sort();

  const anos = carros.map(v => parseInt(v.ano_modelo)).filter(Boolean);
  const anoRealMin = Math.min(...anos);
  const anoRealMax = Math.max(...anos);

  const sliderMin = document.getElementById('anoMin');
  const sliderMax = document.getElementById('anoMax');

  // Só atualiza o slider se ainda não foi mexido pelo usuário
  if (!filtros._sliderMexido) {
    sliderMin.min = anoRealMin; sliderMin.max = anoRealMax; sliderMin.value = anoRealMin;
    sliderMax.min = anoRealMin; sliderMax.max = anoRealMax; sliderMax.value = anoRealMax;
    filtros.anoMin = anoRealMin;
    filtros.anoMax = anoRealMax;
    atualizarRangeUI();
  }

  // Recria dropdowns preservando seleção atual
  recriarSelect('filtroMarca', marcas, filtros.marca);
  recriarSelect('filtroCor', cores, filtros.cor);
  recriarSelect('filtroCombustivel', combustiveis, filtros.combustivel);
}

function recriarSelect(id, lista, valorAtual) {
  const sel = document.getElementById(id);
  const valorSalvo = valorAtual || sel.value;
  sel.innerHTML = '<option value="">Selecione uma opção</option>';
  lista.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    if (item === valorSalvo) opt.selected = true;
    sel.appendChild(opt);
  });
}

function preencherSelect(id, lista) {
  const sel = document.getElementById(id);
  lista.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    sel.appendChild(opt);
  });
}

// ── Atualizar dropdown de modelo conforme marca selecionada
function atualizarModelos(marca) {
  const sel = document.getElementById('filtroModelo');
  sel.innerHTML = '<option value="">Selecione uma opção</option>';
  if (!marca) return;
  const modelos = [...new Set(
    todosOsCarros.filter(v => v.marca === marca).map(v => v.modelo).filter(Boolean)
  )].sort();
  modelos.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    sel.appendChild(opt);
  });
}

// ── Aplicar todos os filtros e renderizar
function aplicarFiltros() {
  const termo = filtros.busca.toLowerCase();

  carrosFiltrados = todosOsCarros.filter(v => {
    if (termo) {
      const bate =
        (v.marca  || '').toLowerCase().includes(termo) ||
        (v.modelo || '').toLowerCase().includes(termo) ||
        (v.cor    || '').toLowerCase().includes(termo) ||
        (v.ano_fabricacao || '').toString().includes(termo);
      if (!bate) return false;
    }
    if (filtros.marca && v.marca !== filtros.marca) return false;
    if (filtros.modelo && v.modelo !== filtros.modelo) return false;
    if (filtros.cor && v.cor !== filtros.cor) return false;
    if (filtros.combustivel && v.combustivel !== filtros.combustivel) return false;
    const ano = parseInt(v.ano_modelo) || 0;
    if (ano < filtros.anoMin || ano > filtros.anoMax) return false;
    if (filtros.carrocerias.length > 0 && !filtros.carrocerias.includes(v.carroceria)) return false;
    return true;
  });

  // Avisa se o carregamento ainda não terminou
  const temFiltro = filtros.busca || filtros.marca || filtros.modelo ||
    filtros.cor || filtros.combustivel || filtros.carrocerias.length > 0 ||
    filtros._sliderMexido;
  if (!carregamentoCompleto && temFiltro) {
    document.getElementById('estoqueContador').textContent =
      '⏳ Carregando estoque completo… resultado parcial';
  }

  carregarPagina(1);
}

// ── Renderizar página
function carregarPagina(pagina) {
  paginaAtual = pagina;
  const grid      = document.getElementById('estoqueGrid');
  const loading   = document.getElementById('loadingEstado');
  const contador  = document.getElementById('estoqueContador');
  const paginacao = document.getElementById('paginacao');

  loading.style.display = 'none';
  grid.innerHTML        = '';
  paginacao.innerHTML   = '';

  const temFiltro = filtros.busca || filtros.marca || filtros.modelo ||
    filtros.cor || filtros.combustivel || filtros.carrocerias.length > 0 ||
    filtros._sliderMexido;

  if (!carregamentoCompleto && temFiltro) {
    contador.textContent = `⏳ ${carrosFiltrados.length} encontrados (carregando mais…)`;
  } else {
    contador.textContent = `${carrosFiltrados.length} carros encontrados`;
  }

  if (!carrosFiltrados.length) {
    grid.innerHTML = '<p class="sem-resultados-txt">Nenhum carro encontrado com esses filtros.</p>';
    return;
  }

  const porPagina = 16;
  const totalPag  = Math.ceil(carrosFiltrados.length / porPagina);
  const inicio    = (pagina - 1) * porPagina;
  carrosFiltrados.slice(inicio, inicio + porPagina).forEach(v => renderCard(grid, v));
  renderizarPaginacao(pagina, totalPag);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Renderizar card individual
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

// ── Paginação
function renderizarPaginacao(atual, total) {
  const paginacao = document.getElementById('paginacao');
  paginacao.innerHTML = '';
  if (total <= 1) return;

  const criar = (texto, pagina, ativo = false, desabilitado = false) => {
    const btn = document.createElement('button');
    btn.className = 'pag-btn' + (ativo ? ' ativo' : '') + (desabilitado ? ' desabilitado' : '');
    btn.textContent = texto;
    if (!desabilitado) btn.addEventListener('click', () => carregarPagina(pagina));
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

// ── Range slider (ano)
function atualizarRangeUI() {
  const sliderMin = document.getElementById('anoMin');
  const sliderMax = document.getElementById('anoMax');
  const fill      = document.getElementById('rangeFill');
  const minVal    = document.getElementById('anoMinVal');
  const maxVal    = document.getElementById('anoMaxVal');
  const label     = document.getElementById('anoLabel');

  const min = parseInt(sliderMin.min);
  const max = parseInt(sliderMin.max);
  const valMin = parseInt(sliderMin.value);
  const valMax = parseInt(sliderMax.value);

  const pctMin = ((valMin - min) / (max - min)) * 100;
  const pctMax = ((valMax - min) / (max - min)) * 100;

  fill.style.left  = pctMin + '%';
  fill.style.width = (pctMax - pctMin) + '%';

  minVal.textContent = valMin;
  maxVal.textContent = valMax;

  if (valMin === min && valMax === max) {
    label.textContent = 'Todos';
  } else {
    label.textContent = valMin + ' / ' + valMax;
  }
}

document.getElementById('anoMin').addEventListener('input', function() {
  if (parseInt(this.value) > parseInt(document.getElementById('anoMax').value)) {
    this.value = document.getElementById('anoMax').value;
  }
  filtros.anoMin = parseInt(this.value);
  filtros._sliderMexido = true;
  atualizarRangeUI();
  dispararFiltro();
});

document.getElementById('anoMax').addEventListener('input', function() {
  if (parseInt(this.value) < parseInt(document.getElementById('anoMin').value)) {
    this.value = document.getElementById('anoMin').value;
  }
  filtros.anoMax = parseInt(this.value);
  filtros._sliderMexido = true;
  atualizarRangeUI();
  dispararFiltro();
});

// ── Debounce
let debounceTimer;
function dispararFiltro() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(aplicarFiltros, 400);
}

// ── Eventos dos filtros
document.getElementById('buscaInput').addEventListener('input', function() {
  filtros.busca = this.value.trim();
  dispararFiltro();
});

document.getElementById('filtroMarca').addEventListener('change', function() {
  filtros.marca  = this.value;
  filtros.modelo = '';
  document.getElementById('filtroModelo').value = '';
  atualizarModelos(this.value);
  aplicarFiltros();
});

document.getElementById('filtroModelo').addEventListener('change', function() {
  filtros.modelo = this.value;
  aplicarFiltros();
});

document.getElementById('filtroCor').addEventListener('change', function() {
  filtros.cor = this.value;
  aplicarFiltros();
});

document.getElementById('filtroCombustivel').addEventListener('change', function() {
  filtros.combustivel = this.value;
  aplicarFiltros();
});

// ── Checkboxes de carroceria
document.getElementById('checkboxCarroceria').addEventListener('change', function(e) {
  if (!e.target.matches('input[type=checkbox]')) return;
  const val = e.target.value;
  if (e.target.checked) {
    filtros.carrocerias.push(val);
  } else {
    filtros.carrocerias = filtros.carrocerias.filter(c => c !== val);
  }
  aplicarFiltros();
});

// ── Limpar filtros
document.getElementById('btnLimparFiltros').addEventListener('click', function() {
  filtros = { busca: '', marca: '', modelo: '', cor: '', combustivel: '', anoMin: 0, anoMax: 9999, carrocerias: [], _sliderMexido: false };

  document.getElementById('buscaInput').value = '';
  document.getElementById('filtroMarca').value = '';
  document.getElementById('filtroModelo').value = '';
  document.getElementById('filtroModelo').innerHTML = '<option value="">Selecione uma opção</option>';
  document.getElementById('filtroCor').value = '';
  document.getElementById('filtroCombustivel').value = '';

  const sliderMin = document.getElementById('anoMin');
  const sliderMax = document.getElementById('anoMax');
  filtros.anoMin = parseInt(sliderMin.min);
  filtros.anoMax = parseInt(sliderMax.max);
  sliderMin.value = sliderMin.min;
  sliderMax.value = sliderMax.max;
  atualizarRangeUI();

  document.querySelectorAll('#checkboxCarroceria input[type=checkbox]').forEach(cb => cb.checked = false);

  carrosFiltrados = todosOsCarros;
  carregarPagina(1);
});

// ── Sidebar mobile
document.getElementById('btnFiltrosMobile').addEventListener('click', function() {
  document.querySelector('.filtros-sidebar').classList.add('aberta');
  document.getElementById('sidebarOverlay').classList.add('ativo');
});
document.getElementById('sidebarOverlay').addEventListener('click', function() {
  document.querySelector('.filtros-sidebar').classList.remove('aberta');
  this.classList.remove('ativo');
});

// ── Popup
function abrirPopup(v) {
  carroSelecionado = v;
  document.getElementById('popupCarroInfo').innerHTML = `
    <strong>${v.marca} ${v.modelo}</strong>
    ${v.ano_fabricacao}/${v.ano_modelo} • ${formatKm(v.km)} • ${v.cor}
  `;
  ['popupNome','popupWpp','popupEmail'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('popupLoja').value = '';
  document.getElementById('popupErro').style.display = 'none';
  document.getElementById('popupEnviar').classList.remove('loading');
  document.getElementById('popupOverlay').classList.add('ativo');
}

document.getElementById('popupFechar').addEventListener('click', () => {
  document.getElementById('popupOverlay').classList.remove('ativo');
});
document.getElementById('popupOverlay').addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('ativo');
});

// ── Máscara WhatsApp
document.getElementById('popupWpp').addEventListener('input', function() {
  let v = this.value.replace(/\D/g,'').slice(0,11);
  v = v.length <= 10 ? v.replace(/^(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3') : v.replace(/^(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3');
  this.value = v.trim().replace(/-$/,'');
});

// ── Envio popup
document.getElementById('popupEnviar').addEventListener('click', async function() {
  const nome  = document.getElementById('popupNome').value.trim();
  const wpp   = document.getElementById('popupWpp').value.trim();
  const email = document.getElementById('popupEmail').value.trim();
  const loja  = document.getElementById('popupLoja').value;
  const erro  = document.getElementById('popupErro');
  const btn   = this;
  const v     = carroSelecionado;

  erro.style.display = 'none';
  if (!nome || !wpp || !email || !loja) {
    erro.textContent = 'Preencha todos os campos.';
    erro.style.display = 'block';
    return;
  }
  const wppLimpo = wpp.replace(/\D/g,'');
  if (wppLimpo.length < 10) {
    erro.textContent = 'WhatsApp inválido.';
    erro.style.display = 'block';
    return;
  }

  btn.classList.add('loading');

  const descricao = `Cliente tem interesse em: ${v.marca} ${v.modelo} | ${v.ano_fabricacao}/${v.ano_modelo} | ${formatKm(v.km)} | ${v.cor} | Loja: ${loja}`;

  const payloadSupabase = { nome_cliente: nome, whatsapp_cliente: wppLimpo, email_cliente: email, loja, descricao, matricula_parceiro: MATRICULA_PARCEIRO, email_parceiro: EMAIL_PARCEIRO, origem: 'estoque-cesar', criado_em: new Date().toISOString() };
  const payloadWebhook  = { nome_cliente: nome, whatsapp_cliente: wppLimpo, loja, descricao, matricula_parceiro: MATRICULA_PARCEIRO, email_parceiro: EMAIL_PARCEIRO, origem: 'estoque-cesar', criado_em: new Date().toISOString() };

  try {
    if (SUPABASE_URL && SUPABASE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify(payloadSupabase)
      });
    }
    if (WEBHOOK_URL) {
      await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadWebhook) });
    }
    window.location.href = 'obrigado.html';
  } catch {
    btn.classList.remove('loading');
    erro.textContent = 'Erro ao enviar. Tente novamente.';
    erro.style.display = 'block';
  }
});

// ── Iniciar
iniciar();
