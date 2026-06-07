// ── Configurações
const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || '';
const SUPABASE_KEY = window.__ENV__?.SUPABASE_ANON_KEY || '';
const WEBHOOK_URL  = window.__ENV__?.N8N_WEBHOOK_URL || '';

// ── Dados fixos do parceiro
const MATRICULA_PARCEIRO = '40756';
const EMAIL_PARCEIRO     = 'cesar.parcerias@gmail.com';

// ── Estoque manual (Fase 1 — substituir pelo n8n futuramente)
const ESTOQUE_MOCK = [
  { modelo:'HB20 1.0 Sense', preco:'R$ 62.900', ano:'2022', km:'38.000 km', cidade:'Santo Amaro / SP', foto:'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&q=80' },
  { modelo:'Onix Plus Premier', preco:'R$ 79.500', ano:'2021', km:'52.000 km', cidade:'Osasco / SP', foto:'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=80' },
  { modelo:'Polo 200 TSI', preco:'R$ 91.000', ano:'2023', km:'18.000 km', cidade:'Campinas / SP', foto:'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400&q=80' },
  { modelo:'Compass Longitude', preco:'R$ 148.000', ano:'2022', km:'41.000 km', cidade:'São Bernardo do Campo / SP', foto:'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400&q=80' },
  { modelo:'Corolla XEI 2.0', preco:'R$ 139.900', ano:'2021', km:'60.000 km', cidade:'Mogi das Cruzes / SP', foto:'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&q=80' },
  { modelo:'Renegade Sport', preco:'R$ 105.000', ano:'2023', km:'22.000 km', cidade:'São Miguel / SP', foto:'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&q=80' },
  { modelo:'T-Cross Comfortline', preco:'R$ 118.000', ano:'2022', km:'31.000 km', cidade:'Vila Prudente / SP', foto:'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&q=80' },
  { modelo:'Gol 1.6 MSI', preco:'R$ 58.000', ano:'2021', km:'45.000 km', cidade:'Nova Iguaçu / RJ', foto:'https://images.unsplash.com/photo-1471444928139-48c5bf5173f8?w=400&q=80' },
  { modelo:'Sandero Stepway', preco:'R$ 72.000', ano:'2022', km:'28.000 km', cidade:'Niterói / RJ', foto:'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&q=80' },
  { modelo:'Tracker Premier', preco:'R$ 132.000', ano:'2023', km:'15.000 km', cidade:'Duque de Caxias / RJ', foto:'https://images.unsplash.com/photo-1581540222194-0def2dda95b8?w=400&q=80' },
  { modelo:'HB20S 1.6', preco:'R$ 68.000', ano:'2021', km:'49.000 km', cidade:'Campo Grande / RJ', foto:'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&q=80' },
  { modelo:'Cronos Drive', preco:'R$ 77.000', ano:'2022', km:'33.000 km', cidade:'Barra Mansa / RJ', foto:'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=80' },
  { modelo:'Argo Drive', preco:'R$ 65.000', ano:'2022', km:'40.000 km', cidade:'Limeira / SP', foto:'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400&q=80' },
  { modelo:'Pulse Audace', preco:'R$ 98.000', ano:'2023', km:'12.000 km', cidade:'Piracicaba / SP', foto:'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400&q=80' },
  { modelo:'Kicks Advance', preco:'R$ 125.000', ano:'2022', km:'26.000 km', cidade:'Indaiatuba / SP', foto:'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&q=80' },
  { modelo:'Sandero Intens', preco:'R$ 85.000', ano:'2022', km:'35.000 km', cidade:'Madureira / RJ', foto:'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&q=80' },
];

let todosOsCarros = [];

async function carregarEstoque() {
  const loading   = document.getElementById('loadingEstado');
  const erroEl    = document.getElementById('erroEstado');
  const container = document.getElementById('estoqueContainer');
  loading.style.display = 'flex';
  erroEl.style.display  = 'none';
  container.innerHTML   = '';
  try {
    todosOsCarros = ESTOQUE_MOCK;
    construirFiltros(todosOsCarros);
    renderizarCarros(todosOsCarros);
  } catch (err) {
    erroEl.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}

function construirFiltros(carros) {
  const cidades = [...new Set(carros.map(c => c.cidade))].sort();
  const filtros = document.getElementById('filtros');
  filtros.querySelectorAll('[data-cidade]:not([data-cidade="todos"])').forEach(el => el.remove());
  cidades.forEach(cidade => {
    const btn = document.createElement('button');
    btn.className = 'filtro-btn';
    btn.dataset.cidade = cidade;
    btn.textContent = cidade;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      renderizarCarros(todosOsCarros.filter(c => c.cidade === cidade));
    });
    filtros.appendChild(btn);
  });
}

document.getElementById('filtros').addEventListener('click', function(e) {
  if (e.target.dataset.cidade === 'todos') {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
    e.target.classList.add('ativo');
    renderizarCarros(todosOsCarros);
  }
});

function renderizarCarros(carros) {
  const container     = document.getElementById('estoqueContainer');
  const semResultados = document.getElementById('semResultados');
  container.innerHTML = '';
  if (!carros.length) { semResultados.style.display = 'block'; return; }
  semResultados.style.display = 'none';
  carros.forEach(carro => {
    const card = document.createElement('div');
    card.className = 'carro-card';
    card.innerHTML = `
      <div class="carro-foto">
        <img src="${carro.foto}" alt="${carro.modelo}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/400x220/1a1a1a/666?text=Foto+em+breve'" />
        <span class="carro-cidade">${carro.cidade}</span>
      </div>
      <div class="carro-info">
        <h3 class="carro-modelo">${carro.modelo}</h3>
        <div class="carro-detalhes"><span>📅 ${carro.ano}</span><span>🛣️ ${carro.km}</span></div>
        <div class="carro-preco">${carro.preco}</div>
        <a href="#interesse" class="btn-carro">Tenho interesse</a>
      </div>`;
    container.appendChild(card);
  });
}

const inputWpp = document.getElementById('whatsapp');
if (inputWpp) {
  inputWpp.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').slice(0, 11);
    v = v.length <= 10
      ? v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
      : v.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    this.value = v.trim().replace(/-$/, '');
  });
}

document.getElementById('btnEnviar').addEventListener('click', async function () {
  const nome     = document.getElementById('nome').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();
  const msgErro  = document.getElementById('msgErro');
  const btn      = this;

  msgErro.style.display = 'none';

  if (!nome || !whatsapp) {
    msgErro.textContent = 'Por favor, preencha seu nome e WhatsApp.';
    msgErro.style.display = 'block';
    return;
  }

  const wppLimpo = whatsapp.replace(/\D/g, '');
  if (wppLimpo.length < 10) {
    msgErro.textContent = 'Informe um WhatsApp válido com DDD.';
    msgErro.style.display = 'block';
    return;
  }

  btn.classList.add('loading');

  const payload = {
    nome_cliente:       nome,
    whatsapp_cliente:   wppLimpo,
    email_parceiro:     EMAIL_PARCEIRO,
    matricula_parceiro: MATRICULA_PARCEIRO,
    origem:             'indicacao-cesar',
    criado_em:          new Date().toISOString()
  };

  try {
    if (SUPABASE_URL && SUPABASE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
    }
    if (WEBHOOK_URL) {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    window.location.href = 'obrigado.html';
  } catch (error) {
    btn.classList.remove('loading');
    msgErro.textContent = 'Erro ao enviar. Tente novamente.';
    msgErro.style.display = 'block';
  }
});

carregarEstoque();
