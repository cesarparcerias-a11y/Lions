// ── Configurações
const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || '';
const SUPABASE_KEY = window.__ENV__?.SUPABASE_ANON_KEY || '';
const WEBHOOK_URL  = window.__ENV__?.N8N_WEBHOOK_URL || '';
const MATRICULA_PARCEIRO = '40756';
const EMAIL_PARCEIRO     = 'cesar.parcerias@gmail.com';
const API_LIONS = 'https://n8n-production-1b10.up.railway.app/webhook/estoque-lions';

let paginaAtual   = 1;
let totalPaginas  = 1;
let carroSelecionado = null;
let filtroBusca   = '';
let filtroCarroceria = 'todos';

// ── Formatar km
function formatKm(km) {
  return parseInt(km).toLocaleString('pt-BR') + ' km';
}

// ── Carregar página do estoque
async function carregarPagina(pagina) {
  const grid      = document.getElementById('estoqueGrid');
  const loading   = document.getElementById('loadingEstado');
  const erroEl    = document.getElementById('erroEstado');
  const contador  = document.getElementById('estoqueContador');
  const paginacao = document.getElementById('paginacao');

  loading.style.display  = 'flex';
  erroEl.style.display   = 'none';
  grid.innerHTML         = '';
  paginacao.innerHTML    = '';

  try {
    let url = `${API_LIONS}?pagina=${pagina}&quantidade=12`;
    if (filtroCarroceria !== 'todos') url += `&carroceria=${filtroCarroceria}`;
    if (filtroBusca) url += `&busca=${encodeURIComponent(filtroBusca)}`;

    const res  = await fetch(url);
    const data = await res.json();

    paginaAtual  = data.paginaAtual;
    totalPaginas = data.totalPaginas;

    contador.textContent = `${data.totalRegistros} carros encontrados`;

    if (!data.veiculos.length) {
      grid.innerHTML = '<p class="sem-resultados-txt">Nenhum carro encontrado.</p>';
      loading.style.display = 'none';
      return;
    }

    data.veiculos.forEach(v => {
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
    });

    renderizarPaginacao(paginaAtual, totalPaginas);

  } catch (err) {
    erroEl.style.display = 'block';
  } finally {
    loading.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
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

// ── Filtros por carroceria
document.getElementById('filtrosChips').addEventListener('click', function(e) {
  if (!e.target.dataset.filtro) return;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('ativo'));
  e.target.classList.add('ativo');
  filtroCarroceria = e.target.dataset.filtro;
  carregarPagina(1);
});

// ── Busca com debounce
let debounceTimer;
document.getElementById('buscaInput').addEventListener('input', function() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    filtroBusca = this.value.trim();
    carregarPagina(1);
  }, 500);
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
carregarPagina(1);
