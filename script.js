// ─────────────────────────────────────────────
//  Configurações (injetadas pelo Vercel via env.js)
// ─────────────────────────────────────────────
const SUPABASE_URL  = window.__ENV__?.SUPABASE_URL      || '';
const SUPABASE_KEY  = window.__ENV__?.SUPABASE_ANON_KEY || '';
const WEBHOOK_URL   = window.__ENV__?.N8N_WEBHOOK_URL   || '';

// ─────────────────────────────────────────────
//  Estoque simulado (substitua pela chamada real ao n8n)
//  Estrutura esperada do n8n:
//  [{ modelo, preco, ano, km, cidade, foto, link }]
// ─────────────────────────────────────────────
const ESTOQUE_MOCK = [
  {
    modelo: 'HB20 1.0 Sense',
    preco: 'R$ 62.900',
    ano: '2022',
    km: '38.000 km',
    cidade: 'São Paulo',
    foto: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&q=80',
    link: '#interesse'
  },
  {
    modelo: 'Onix Plus Premier',
    preco: 'R$ 79.500',
    ano: '2021',
    km: '52.000 km',
    cidade: 'São Paulo',
    foto: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=80',
    link: '#interesse'
  },
  {
    modelo: 'Polo 200 TSI Highline',
    preco: 'R$ 91.000',
    ano: '2023',
    km: '18.000 km',
    cidade: 'Campinas',
    foto: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400&q=80',
    link: '#interesse'
  },
  {
    modelo: 'Compass Longitude',
    preco: 'R$ 148.000',
    ano: '2022',
    km: '41.000 km',
    cidade: 'Campinas',
    foto: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400&q=80',
    link: '#interesse'
  },
  {
    modelo: 'Corolla XEI 2.0',
    preco: 'R$ 139.900',
    ano: '2021',
    km: '60.000 km',
    cidade: 'Ribeirão Preto',
    foto: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&q=80',
    link: '#interesse'
  },
  {
    modelo: 'Renegade Sport T270',
    preco: 'R$ 105.000',
    ano: '2023',
    km: '22.000 km',
    cidade: 'Ribeirão Preto',
    foto: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&q=80',
    link: '#interesse'
  }
];

// ─────────────────────────────────────────────
//  Estado da aplicação
// ─────────────────────────────────────────────
let todosOsCarros = [];
let cidadeAtiva   = 'todos';

// ─────────────────────────────────────────────
//  Carregar estoque (n8n ou mock)
// ─────────────────────────────────────────────
async function carregarEstoque() {
  const loading  = document.getElementById('loadingEstado');
  const erroEl   = document.getElementById('erroEstado');
  const container = document.getElementById('estoqueContainer');

  loading.style.display  = 'flex';
  erroEl.style.display   = 'none';
  container.innerHTML    = '';

  try {
    // Tenta buscar do n8n; se falhar, usa mock
    let carros = [];

    if (WEBHOOK_URL) {
      try {
        const res = await fetch(WEBHOOK_URL + '/estoque', { method: 'GET' });
        if (res.ok) {
          carros = await res.json();
        } else {
          throw new Error('n8n não retornou dados');
        }
      } catch (_) {
        // Silencioso: usa mock como fallback
        carros = ESTOQUE_MOCK;
      }
    } else {
      carros = ESTOQUE_MOCK;
    }

    todosOsCarros = carros;
    construirFiltros(carros);
    renderizarCarros(carros);

  } catch (err) {
    console.error(err);
    erroEl.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}

// ─────────────────────────────────────────────
//  Construir botões de filtro por cidade
// ─────────────────────────────────────────────
function construirFiltros(carros) {
  const cidades = [...new Set(carros.map(c => c.cidade))].sort();
  const filtros = document.getElementById('filtros');

  // Remove cidades antigas (mantém o "Todos")
  filtros.querySelectorAll('[data-cidade]:not([data-cidade="todos"])').forEach(el => el.remove());

  cidades.forEach(cidade => {
    const btn = document.createElement('button');
    btn.className = 'filtro-btn';
    btn.dataset.cidade = cidade;
    btn.textContent = cidade;
    btn.addEventListener('click', () => filtrarPorCidade(cidade, btn));
    filtros.appendChild(btn);
  });
}

// ─────────────────────────────────────────────
//  Filtrar por cidade
// ─────────────────────────────────────────────
function filtrarPorCidade(cidade, btnClicado) {
  cidadeAtiva = cidade;

  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
  btnClicado.classList.add('ativo');

  const filtrados = cidade === 'todos'
    ? todosOsCarros
    : todosOsCarros.filter(c => c.cidade === cidade);

  renderizarCarros(filtrados);
}

// Filtro "Todos"
document.getElementById('filtros').addEventListener('click', function(e) {
  if (e.target.dataset.cidade === 'todos') {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
    e.target.classList.add('ativo');
    renderizarCarros(todosOsCarros);
  }
});

// ─────────────────────────────────────────────
//  Renderizar cards de carros
// ─────────────────────────────────────────────
function renderizarCarros(carros) {
  const container    = document.getElementById('estoqueContainer');
  const semResultados = document.getElementById('semResultados');
  container.innerHTML = '';

  if (!carros.length) {
    semResultados.style.display = 'block';
    return;
  }

  semResultados.style.display = 'none';

  carros.forEach(carro => {
    const card = document.createElement('div');
    card.className = 'carro-card';
    card.innerHTML = `
      <div class="carro-foto">
        <img src="${carro.foto || 'https://via.placeholder.com/400x220/1a1a1a/666?text=Foto+em+breve'}"
             alt="${carro.modelo}"
             loading="lazy"
             onerror="this.src='https://via.placeholder.com/400x220/1a1a1a/666?text=Foto+em+breve'" />
        <span class="carro-cidade">${carro.cidade}</span>
      </div>
      <div class="carro-info">
        <h3 class="carro-modelo">${carro.modelo}</h3>
        <div class="carro-detalhes">
          <span>📅 ${carro.ano}</span>
          <span>🛣️ ${carro.km}</span>
        </div>
        <div class="carro-preco">${carro.preco}</div>
        <a href="${carro.link || '#interesse'}" class="btn-carro">Tenho interesse</a>
      </div>
    `;
    container.appendChild(card);
  });
}

// ─────────────────────────────────────────────
//  Máscara WhatsApp
// ─────────────────────────────────────────────
const inputWhatsapp = document.getElementById('whatsapp');
if (inputWhatsapp) {
  inputWhatsapp.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 10) {
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      v = v.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    this.value = v.trim().replace(/-$/, '');
  });
}

// ─────────────────────────────────────────────
//  Envio do formulário
// ─────────────────────────────────────────────
document.getElementById('btnEnviar').addEventListener('click', async function () {
  const nome      = document.getElementById('nome').value.trim();
  const whatsapp  = document.getElementById('whatsapp').value.trim();
  const email     = document.getElementById('email').value.trim();
  const msgErro   = document.getElementById('msgErro');
  const msgSucesso = document.getElementById('msgSucesso');
  const btn       = this;

  msgErro.style.display   = 'none';
  msgSucesso.style.display = 'none';

  // Validação
  if (!nome || !whatsapp || !email) {
    msgErro.textContent = 'Por favor, preencha todos os campos.';
    msgErro.style.display = 'block';
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    msgErro.textContent = 'Informe um e-mail válido.';
    msgErro.style.display = 'block';
    return;
  }

  const whatsappLimpo = whatsapp.replace(/\D/g, '');
  if (whatsappLimpo.length < 10) {
    msgErro.textContent = 'Informe um WhatsApp válido com DDD.';
    msgErro.style.display = 'block';
    return;
  }

  btn.classList.add('loading');

  const payload = {
    nome,
    whatsapp: whatsappLimpo,
    email,
    origem: 'indicacao-lions',
    criado_em: new Date().toISOString()
  };

  try {
    // 1. Salvar no Supabase
    if (SUPABASE_URL && SUPABASE_KEY) {
      const resSupa = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
      if (!resSupa.ok) throw new Error('Erro Supabase');
    }

    // 2. Webhook n8n
    if (WEBHOOK_URL) {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    // 3. Redirecionar
    window.location.href = 'obrigado.html';

  } catch (error) {
    console.error(error);
    btn.classList.remove('loading');
    msgErro.textContent = 'Ocorreu um erro. Tente novamente.';
    msgErro.style.display = 'block';
  }
});

// ─────────────────────────────────────────────
//  Inicializar
// ─────────────────────────────────────────────
carregarEstoque();
