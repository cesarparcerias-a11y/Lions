// ── Configurações
const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || '';
const SUPABASE_KEY = window.__ENV__?.SUPABASE_ANON_KEY || '';
const WEBHOOK_URL  = window.__ENV__?.N8N_WEBHOOK_URL || '';
const MATRICULA_PARCEIRO = '40756';
const EMAIL_PARCEIRO     = 'cesar.parcerias@gmail.com';
const API_LIONS = 'https://n8n-production-1b10.up.railway.app/webhook/estoque-lions';
let carroSelecionado = null;

function formatKm(km) {
  return parseInt(km).toLocaleString('pt-BR') + ' km';
}

// ══ CARROSSEL ══
let carrosselIndex = 0;
let carrosselCarros = [];
let carrosselAuto;

async function carregarCarrossel() {
  const track = document.getElementById('carrosselTrack');
  if (!track) return;
  try {
    const res  = await fetch(`${API_LIONS}?pagina=1&quantidade=14`);
    const data = await res.json();
    carrosselCarros = data.veiculos;
    renderizarCarrossel();
    iniciarAutoPlay();
  } catch {
    track.innerHTML = '<p style="color:#aaa;padding:20px">Estoque indisponível no momento.</p>';
  }
}

function renderizarCarrossel() {
  const track = document.getElementById('carrosselTrack');
  track.innerHTML = '';
  carrosselCarros.forEach((v, i) => {
    const card = document.createElement('div');
    card.className = 'mini-card';
    card.innerHTML = `
      <div class="mini-foto">
        <img src="${v.media_links.frente}" alt="${v.marca} ${v.modelo}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/220x140/1a1a1a/666?text=Sem+foto'" />
      </div>
      <div class="mini-info">
        <p class="mini-marca">${v.marca}</p>
        <h3 class="mini-modelo">${v.modelo}</h3>
        <div class="mini-detalhes">
          <span>${v.ano_fabricacao}/${v.ano_modelo}</span>
          <span>${formatKm(v.km)}</span>
        </div>
        <button class="mini-btn" onclick='abrirPopup(${JSON.stringify(v)})'>Tenho interesse</button>
      </div>`;
    track.appendChild(card);
  });
  atualizarPosicaoCarrossel();
}

function atualizarPosicaoCarrossel() {
  const track    = document.getElementById('carrosselTrack');
  const cardW    = track.querySelector('.mini-card')?.offsetWidth || 220;
  const gap      = 16;
  track.style.transform = `translateX(-${carrosselIndex * (cardW + gap)}px)`;
}

function iniciarAutoPlay() {
  carrosselAuto = setInterval(() => {
    const max = Math.max(0, carrosselCarros.length - visiveis());
    carrosselIndex = carrosselIndex >= max ? 0 : carrosselIndex + 1;
    atualizarPosicaoCarrossel();
  }, 3500);
}

function visiveis() {
  return window.innerWidth < 600 ? 1 : window.innerWidth < 900 ? 2 : window.innerWidth < 1200 ? 3 : 4;
}

document.getElementById('carrosselPrev')?.addEventListener('click', () => {
  clearInterval(carrosselAuto);
  carrosselIndex = Math.max(0, carrosselIndex - 1);
  atualizarPosicaoCarrossel();
  iniciarAutoPlay();
});

document.getElementById('carrosselNext')?.addEventListener('click', () => {
  clearInterval(carrosselAuto);
  const max = Math.max(0, carrosselCarros.length - visiveis());
  carrosselIndex = Math.min(max, carrosselIndex + 1);
  atualizarPosicaoCarrossel();
  iniciarAutoPlay();
});

window.addEventListener('resize', atualizarPosicaoCarrossel);

// ══ POPUP ══
function abrirPopup(v) {
  carroSelecionado = v;
  const modelo = v.modelo || v.nome || '';
  const marca  = v.marca  || '';
  const ano    = v.ano_fabricacao ? `${v.ano_fabricacao}/${v.ano_modelo}` : v.ano || '';
  const km     = v.km ? formatKm(v.km) : v.km_fmt || '';
  const cor    = v.cor || '';

  document.getElementById('popupCarroInfo').innerHTML = `
    <strong>${marca} ${modelo}</strong>
    ${[ano, km, cor].filter(Boolean).join(' • ')}
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

// ══ MÁSCARA WhatsApp ══
function aplicarMascaraWpp(input) {
  input?.addEventListener('input', function() {
    let v = this.value.replace(/\D/g,'').slice(0,11);
    v = v.length <= 10 ? v.replace(/^(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3') : v.replace(/^(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3');
    this.value = v.trim().replace(/-$/,'');
  });
}
aplicarMascaraWpp(document.getElementById('whatsapp'));
aplicarMascaraWpp(document.getElementById('popupWpp'));

// ══ FUNÇÃO CENTRAL DE ENVIO ══
async function enviarLead({ nome, whatsapp, email, loja, carro, btnEl, erroEl }) {
  erroEl.style.display = 'none';
  if (!nome || !whatsapp || !email || !loja) {
    erroEl.textContent = 'Preencha todos os campos, incluindo a loja.';
    erroEl.style.display = 'block';
    return;
  }
  const wppLimpo = whatsapp.replace(/\D/g,'');
  if (wppLimpo.length < 10) {
    erroEl.textContent = 'Informe um WhatsApp válido com DDD.';
    erroEl.style.display = 'block';
    return;
  }
  btnEl.classList.add('loading');
  const wppComCodigo = '+55' + wppLimpo; // garante +55 para o Pipefy

  const descricao = carro
    ? `Cliente tem interesse em: ${carro.marca || ''} ${carro.modelo} | ${carro.ano_fabricacao || carro.ano}/${carro.ano_modelo || ''} | ${formatKm(carro.km)} | ${carro.cor || ''} | Loja: ${loja}`
    : `Cliente indicado pelo parceiro Cesar Bittencourt (Matrícula #40756). Interesse em adquirir um seminovo. Entrar em contato para apresentar opções.`;

  const payloadSupabase = { nome: nome, telefone: wppLimpo, email: email, nome_cliente: nome, whatsapp_cliente: wppLimpo, email_cliente: email, loja, descricao, matricula_parceiro: MATRICULA_PARCEIRO, email_parceiro: EMAIL_PARCEIRO, carro_interesse: carro ? `${carro.marca || ''} ${carro.modelo}` : '', origem: 'indicacao-cesar', criado_em: new Date().toISOString() };
  const payloadWebhook  = { nome_cliente: nome, whatsapp_cliente: wppComCodigo, email_cliente: email, loja, descricao, matricula_parceiro: MATRICULA_PARCEIRO, email_parceiro: EMAIL_PARCEIRO, origem: 'indicacao-cesar', criado_em: new Date().toISOString() };

  try {
    // Supabase — salva normalmente
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const respSupabase = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' },
          body: JSON.stringify(payloadSupabase)
        });
        if (!respSupabase.ok) {
          const textoErro = await respSupabase.text();
          console.error('Erro ao salvar no Supabase:', respSupabase.status, textoErro);
        }
      } catch(e) { console.warn('Supabase falhou:', e); }
    }
    // Webhook n8n → Pipefy
    if (WEBHOOK_URL) {
      try {
        await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadWebhook) });
      } catch(e) { console.warn('Webhook falhou:', e); }
    }
    window.location.href = 'obrigado.html';
  } catch {
    btnEl.classList.remove('loading');
    erroEl.textContent = 'Erro ao enviar. Tente novamente.';
    erroEl.style.display = 'block';
  }
}

// ── Envio popup
document.getElementById('popupEnviar').addEventListener('click', function() {
  enviarLead({
    nome:     document.getElementById('popupNome').value.trim(),
    whatsapp: document.getElementById('popupWpp').value.trim(),
    email:    document.getElementById('popupEmail').value.trim(),
    loja:     document.getElementById('popupLoja').value,
    carro:    carroSelecionado,
    btnEl:    this,
    erroEl:   document.getElementById('popupErro')
  });
});

// ── Envio formulário geral
document.getElementById('btnEnviar')?.addEventListener('click', function() {
  enviarLead({
    nome:     document.getElementById('nome').value.trim(),
    whatsapp: document.getElementById('whatsapp').value.trim(),
    email:    document.getElementById('email').value.trim(),
    loja:     document.getElementById('loja').value,
    carro:    null,
    btnEl:    this,
    erroEl:   document.getElementById('msgErro')
  });
});

// ── Iniciar
carregarCarrossel();
