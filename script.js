// ── Configurações via variáveis de ambiente (injetadas pelo Vercel) ──
const SUPABASE_URL    = window.__ENV__?.SUPABASE_URL    || '';
const SUPABASE_KEY    = window.__ENV__?.SUPABASE_ANON_KEY || '';
const WEBHOOK_URL     = window.__ENV__?.N8N_WEBHOOK_URL  || '';

// ── Máscara de WhatsApp ──
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

// ── Envio do formulário ──
document.getElementById('btnEnviar').addEventListener('click', async function () {
  const nome     = document.getElementById('nome').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();
  const email    = document.getElementById('email').value.trim();
  const msgErro  = document.getElementById('msgErro');
  const btn      = this;

  // Validação básica
  msgErro.style.display = 'none';

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

  // Loading
  btn.classList.add('loading');

  const payload = {
    nome,
    whatsapp: whatsappLimpo,
    email,
    origem: 'landing-lions',
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

      if (!resSupa.ok) {
        const err = await resSupa.text();
        console.error('Supabase erro:', err);
        throw new Error('Erro ao salvar lead no Supabase.');
      }
    }

    // 2. Disparar webhook n8n
    if (WEBHOOK_URL) {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    // 3. Redirecionar para página de obrigado
    window.location.href = 'obrigado.html';

  } catch (error) {
    console.error(error);
    btn.classList.remove('loading');
    msgErro.textContent = 'Ocorreu um erro. Tente novamente em instantes.';
    msgErro.style.display = 'block';
  }
});
