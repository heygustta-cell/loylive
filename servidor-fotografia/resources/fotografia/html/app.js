'use strict';

/* Painel de fotografia — conversa com o jogo via fetch (NUI callbacks) e mensagens (SendNUIMessage). */

const RECURSO = typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'fotografia';
const PARTES = ['camera', 'ambiente', 'filtros', 'luzes', 'poses', 'personagem', 'veiculo', 'locais'];
const S = { config: {} };
let abaAtual = 'camera';
let vinculos = new Map();
let aberto = false;

const $painel = document.getElementById('painel');
const $abas = document.getElementById('abas');
const $corpo = document.getElementById('corpo');
const $titulo = document.getElementById('titulo');
const $rodape = document.getElementById('rodape');
const $avisos = document.getElementById('avisos');
const $nomeServidor = document.getElementById('nome-servidor');

/* ================================================================ utilidades */

function h(tag, props, ...filhos) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const f of filhos.flat(Infinity)) {
    if (f == null || f === false) continue;
    el.append(f.nodeType ? f : document.createTextNode(String(f)));
  }
  return el;
}

// O Lua às vezes manda listas vazias como objeto: isto sempre devolve um array
const lista = x => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : []);

function obter(caminho) {
  return caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), S);
}

function definir(caminho, valor) {
  const ks = caminho.split('.');
  let o = S;
  for (let i = 0; i < ks.length - 1; i++) {
    if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {};
    o = o[ks[i]];
  }
  o[ks[ks.length - 1]] = valor;
}

function vincular(caminho, fn) {
  if (!vinculos.has(caminho)) vinculos.set(caminho, []);
  vinculos.get(caminho).push(fn);
}

function atualizarVinculos(parte) {
  for (const [caminho, fns] of vinculos) {
    if (caminho === parte || caminho.startsWith(parte + '.')) {
      const v = obter(caminho);
      for (const fn of fns) fn(v);
    }
  }
}

const AJUSTES = {
  ambiente: a => {
    a._min = (a.hora | 0) * 60 + (a.minuto | 0);
    return a;
  },
};

function guardarParte(parte, dados) {
  S[parte] = AJUSTES[parte] && dados ? AJUSTES[parte](dados) : dados;
}

function limitador(fn, ms = 70) {
  let ultimo = 0;
  let timer = null;
  let pendente = null;
  return (...args) => {
    pendente = args;
    const falta = ms - (performance.now() - ultimo);
    if (falta <= 0) {
      ultimo = performance.now();
      fn(...pendente);
      pendente = null;
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        ultimo = performance.now();
        if (pendente) {
          fn(...pendente);
          pendente = null;
        }
      }, falta);
    }
  };
}

async function post(nome, dados = {}) {
  try {
    const r = await fetch(`https://${RECURSO}/${nome}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(dados),
    });
    const resposta = await r.json().catch(() => ({}));
    aplicarResposta(resposta);
    return resposta;
  } catch (e) {
    return {};
  }
}

function aplicarResposta(r) {
  if (!r || typeof r !== 'object') return;
  if (r.erro) aviso(r.erro, 'erro');
  const mudou = [];
  for (const p of PARTES) {
    if (r[p] !== undefined) {
      guardarParte(p, r[p]);
      mudou.push(p);
    }
  }
  if (r.rerender) desenhar();
  else mudou.forEach(atualizarVinculos);
}

function aviso(texto, tipo) {
  const el = h('div', { class: 'aviso' + (tipo ? ' ' + tipo : '') }, texto);
  $avisos.append(el);
  while ($avisos.children.length > 3) $avisos.firstChild.remove();
  setTimeout(() => el.classList.add('sair'), 2800);
  setTimeout(() => el.remove(), 3200);
}

const semAcento = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const pct = v => `${Math.round(v * 100)}%`;
const doisDigitos = n => String(n).padStart(2, '0');
const hhmm = m => `${doisDigitos(Math.floor(m / 60))}:${doisDigitos(m % 60)}`;
const mm = fov => Math.round(12 / Math.tan((fov * Math.PI) / 360));
const metros = v => (v < 10 ? `${v.toFixed(1)} m` : `${Math.round(v)} m`);

function rgbParaHsv({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return [hue, max ? d / max : 0, max];
}

function hsvParaRgb(hue, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

const rgbCss = c => `rgb(${c.r | 0}, ${c.g | 0}, ${c.b | 0})`;
const hex = c => '#' + [c.r, c.g, c.b].map(n => (n | 0).toString(16).padStart(2, '0')).join('').toUpperCase();

/* ================================================================ componentes */

function cartao(titulo, filhos, opcoes = {}) {
  if (opcoes.recolhivel) {
    return h('details', { class: 'cartao', open: opcoes.aberto !== false }, h('summary', null, titulo), filhos);
  }
  return h('div', { class: 'cartao' }, titulo && h('h2', null, titulo), filhos);
}

const dica = html => h('p', { class: 'dica', html });
const botao = (rotulo, onclick, classe = '') => h('button', { type: 'button', class: 'btn ' + classe, onclick }, rotulo);

function slider({ rotulo, caminho, valor, min, max, passo = 1, formato = v => v, log = false, aoMudar }) {
  const paraSlider = v => (log ? Math.round((Math.log(Math.max(v, min) / min) / Math.log(max / min)) * 1000) : v);
  const doSlider = s => (log ? +(min * Math.pow(max / min, s / 1000)).toFixed(2) : Number(s));
  const input = h('input', { type: 'range', min: log ? 0 : min, max: log ? 1000 : max, step: log ? 1 : passo });
  const saida = h('span', { class: 'valor' });
  let arrastando = false;

  const pintar = () => input.style.setProperty('--p', ((input.value - input.min) / (input.max - input.min)) * 100 + '%');
  const mostrar = v => { saida.textContent = formato(v); };
  const atualizar = v => {
    if (arrastando || v == null || Number.isNaN(Number(v))) return;
    input.value = paraSlider(Number(v));
    pintar();
    mostrar(Number(v));
  };
  const enviar = limitador(v => aoMudar && aoMudar(v, false), 70);

  input.addEventListener('pointerdown', () => { arrastando = true; });
  input.addEventListener('pointerup', () => { arrastando = false; });
  input.addEventListener('input', () => {
    const v = doSlider(input.value);
    pintar();
    mostrar(v);
    if (caminho) definir(caminho, v);
    enviar(v);
  });
  input.addEventListener('change', () => {
    arrastando = false;
    if (aoMudar) aoMudar(doSlider(input.value), true);
  });

  if (caminho) vincular(caminho, atualizar);
  atualizar(caminho ? obter(caminho) : valor);
  return h('div', { class: 'campo' }, h('div', { class: 'rotulo' }, h('span', null, rotulo), saida), input);
}

function chave({ rotulo, detalhe, caminho, valor, aoMudar }) {
  const btn = h('button', { type: 'button', class: 'chave', role: 'switch' });
  const marcar = v => btn.setAttribute('aria-checked', v ? 'true' : 'false');
  btn.addEventListener('click', e => {
    e.preventDefault();
    const v = btn.getAttribute('aria-checked') !== 'true';
    marcar(v);
    if (caminho) definir(caminho, v);
    if (aoMudar) aoMudar(v);
  });
  if (caminho) vincular(caminho, v => marcar(!!v));
  marcar(caminho ? !!obter(caminho) : !!valor);
  const linha = h('div', { class: 'linha-chave' }, h('span', null, rotulo, detalhe && h('small', null, detalhe)), btn);
  linha.addEventListener('click', e => { if (e.target === linha || e.target.closest('span')) btn.click(); });
  return linha;
}

function fichas({ rotulo, caminho, valor, opcoes, colunas, aoMudar }) {
  const grupo = h('div', { class: 'fichas' + (colunas ? ' grade-' + colunas : '') });
  const botoes = opcoes.map(op => {
    const b = h('button', { type: 'button', class: 'ficha', title: op.l }, op.l);
    b.dataset.v = String(op.v);
    b.addEventListener('click', () => {
      marcar(op.v);
      if (caminho) definir(caminho, op.v);
      if (aoMudar) aoMudar(op.v);
    });
    grupo.append(b);
    return b;
  });
  const marcar = v => botoes.forEach(b => b.classList.toggle('ativa', b.dataset.v === String(v)));
  if (caminho) vincular(caminho, marcar);
  marcar(caminho ? obter(caminho) : valor);
  if (!rotulo) return grupo;
  return h('div', { class: 'campo' }, h('div', { class: 'rotulo' }, h('span', null, rotulo)), grupo);
}

// Seletor numérico ‹ n ›: dá a volta no fim, segura para repetir, dá para digitar
function passos({ rotulo, detalhe, valor = 0, min = 0, max = 0, nomeMin, caminho, ler, aoMudar }) {
  let v = valor, mi = min, ma = max, segurando = false;
  const entrada = h('input', { class: 'passo-num', type: 'text', inputmode: 'numeric', 'aria-label': rotulo });
  const fim = h('span', { class: 'passo-max' });
  const mostrar = () => {
    entrada.value = String(v);
    fim.textContent = nomeMin && v === mi ? nomeMin : ma > mi ? `/ ${ma}` : '';
  };
  const aplicar = n => {
    if (!Number.isFinite(n)) n = v;
    if (ma >= mi) {
      if (n > ma) n = mi;
      else if (n < mi) n = ma;
    }
    v = n;
    mostrar();
    if (aoMudar) aoMudar(n);
  };
  const seta = (txt, d, aria) => {
    const b = h('button', { type: 'button', class: 'seta', 'aria-label': aria }, txt);
    let t1, t2;
    const parar = () => { clearTimeout(t1); clearInterval(t2); segurando = false; };
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      segurando = true;
      aplicar(v + d);
      t1 = setTimeout(() => { t2 = setInterval(() => aplicar(v + d), 90); }, 380);
    });
    b.addEventListener('pointerup', parar);
    b.addEventListener('pointerleave', parar);
    return b;
  };
  entrada.addEventListener('change', () => aplicar(parseInt(entrada.value, 10)));
  entrada.addEventListener('keydown', e => { if (e.key === 'Enter') entrada.blur(); });
  if (caminho) {
    vincular(caminho, obj => {
      if (segurando || document.activeElement === entrada || obj == null) return;
      const r = ler ? ler(obj) : { valor: obj };
      v = r.valor;
      if (r.min != null) mi = r.min;
      if (r.max != null) ma = r.max;
      mostrar();
    });
    const r = ler ? ler(obter(caminho) ?? {}) : { valor: obter(caminho) };
    if (r.valor != null) v = r.valor;
    if (r.min != null) mi = r.min;
    if (r.max != null) ma = r.max;
  }
  mostrar();
  return h('div', { class: 'passo' },
    h('span', { class: 'passo-rotulo' }, rotulo, detalhe && h('small', null, detalhe)),
    h('div', { class: 'passo-ctrl' }, seta('‹', -1, 'Anterior'), entrada, fim, seta('›', 1, 'Próximo')));
}

function campoTexto({ placeholder, rotuloBotao, valor = '', aoEnviar, maxlength }) {
  const input = h('input', { class: 'texto', type: 'text', placeholder, maxlength, value: valor, spellcheck: 'false' });
  const enviar = () => {
    const t = input.value.trim();
    if (t || rotuloBotao === 'Salvar') aoEnviar(t, input);
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') enviar(); });
  return h('div', { class: 'linha-input' }, input, botao(rotuloBotao, enviar, 'primario'));
}

const AMOSTRAS_LUZ = [
  { r: 255, g: 244, b: 229, n: 'Luz do dia' }, { r: 255, g: 206, b: 150, n: 'Quente' },
  { r: 255, g: 160, b: 80, n: 'Tungstênio' }, { r: 196, g: 220, b: 255, n: 'Fria' },
  { r: 255, g: 60, b: 60, n: 'Vermelho' }, { r: 255, g: 120, b: 30, n: 'Laranja' },
  { r: 255, g: 70, b: 170, n: 'Rosa' }, { r: 150, g: 80, b: 255, n: 'Roxo' },
  { r: 50, g: 110, b: 255, n: 'Azul' }, { r: 40, g: 230, b: 255, n: 'Ciano' }, { r: 80, g: 255, b: 120, n: 'Verde' },
];
const AMOSTRAS_CARRO = [
  { r: 245, g: 245, b: 245, n: 'Branco' }, { r: 12, g: 12, b: 14, n: 'Preto' }, { r: 150, g: 152, b: 158, n: 'Prata' },
  { r: 70, g: 72, b: 78, n: 'Grafite' }, { r: 180, g: 12, b: 20, n: 'Vermelho' }, { r: 255, g: 110, b: 0, n: 'Laranja' },
  { r: 255, g: 205, b: 0, n: 'Amarelo' }, { r: 20, g: 140, b: 60, n: 'Verde' }, { r: 25, g: 60, b: 160, n: 'Azul' },
  { r: 90, g: 190, b: 255, n: 'Azul bebê' }, { r: 110, g: 40, b: 160, n: 'Roxo' }, { r: 255, g: 120, b: 190, n: 'Rosa' },
];

function seletorCor({ rotulo, caminho, amostras = AMOSTRAS_LUZ, aoMudar }) {
  let [hue, sat, bri] = rgbParaHsv(obter(caminho) || { r: 255, g: 255, b: 255 });
  let arrastando = false;
  const quadro = h('span', { class: 'amostra' });
  const codigo = h('span', { class: 'valor' });
  const faixa = (max, nome) => h('input', { type: 'range', min: 0, max, step: 1, class: 'trilha-cor', 'aria-label': nome });
  const iH = faixa(360, 'Matiz'), iS = faixa(100, 'Saturação'), iV = faixa(100, 'Brilho');
  const enviar = limitador((c, final) => aoMudar && aoMudar(c, final), 70);

  const pintar = () => {
    const c = hsvParaRgb(hue, sat, bri);
    quadro.style.background = rgbCss(c);
    codigo.textContent = hex(c);
    iH.style.setProperty('--trilha', 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)');
    iS.style.setProperty('--trilha', `linear-gradient(to right, ${rgbCss(hsvParaRgb(hue, 0, bri))}, ${rgbCss(hsvParaRgb(hue, 1, bri))})`);
    iV.style.setProperty('--trilha', `linear-gradient(to right, #000, ${rgbCss(hsvParaRgb(hue, sat, 1))})`);
    return c;
  };
  const sincronizar = () => {
    iH.value = hue;
    iS.value = sat * 100;
    iV.value = bri * 100;
    pintar();
  };
  const mudou = final => {
    const c = pintar();
    definir(caminho, c);
    enviar(c, final);
  };
  for (const i of [iH, iS, iV]) {
    i.addEventListener('pointerdown', () => { arrastando = true; });
    i.addEventListener('change', () => { arrastando = false; mudou(true); });
  }
  iH.addEventListener('input', () => { hue = +iH.value; mudou(false); });
  iS.addEventListener('input', () => { sat = iS.value / 100; mudou(false); });
  iV.addEventListener('input', () => { bri = iV.value / 100; mudou(false); });

  const botoes = amostras.map(a => h('button', {
    type: 'button', title: a.n, 'aria-label': a.n, style: { background: rgbCss(a) },
    onclick: () => { [hue, sat, bri] = rgbParaHsv(a); sincronizar(); mudou(true); },
  }));
  vincular(caminho, c => {
    if (arrastando || !c) return;
    const atual = hsvParaRgb(hue, sat, bri);
    if (atual.r === c.r && atual.g === c.g && atual.b === c.b) return;
    [hue, sat, bri] = rgbParaHsv(c);
    sincronizar();
  });
  sincronizar();
  return h('div', { class: 'campo' },
    h('div', { class: 'rotulo' }, h('span', null, rotulo), codigo),
    h('div', { class: 'cor-topo' }, quadro, h('div', { class: 'amostras' }, botoes)),
    h('span', { class: 'mini-rotulo' }, 'Matiz'), iH,
    h('span', { class: 'mini-rotulo' }, 'Saturação'), iS,
    h('span', { class: 'mini-rotulo' }, 'Brilho'), iV);
}

function paleta({ rotulo, cores, caminho, aoMudar }) {
  const grade = h('div', { class: 'paleta' });
  const botoes = cores.map((c, i) => {
    const b = h('button', { type: 'button', title: `Cor ${i}`, 'aria-label': `Cor ${i}`, style: { background: rgbCss(c) } });
    b.addEventListener('click', () => {
      marcar(i);
      definir(caminho, i);
      aoMudar(i);
    });
    grade.append(b);
    return b;
  });
  const marcar = v => botoes.forEach((b, i) => b.classList.toggle('ativa', i === Number(v)));
  vincular(caminho, marcar);
  marcar(obter(caminho));
  return h('div', { class: 'campo' }, rotulo && h('div', { class: 'rotulo' }, h('span', null, rotulo)), grade);
}

function busca(placeholder, aoFiltrar) {
  const input = h('input', { class: 'texto', type: 'search', placeholder, spellcheck: 'false' });
  input.addEventListener('input', () => aoFiltrar(semAcento(input.value.trim())));
  return input;
}

function agrupar(itens, chaveGrupo) {
  const grupos = new Map();
  for (const item of itens) {
    const g = item[chaveGrupo] || 'Outros';
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push(item);
  }
  return grupos;
}

/* ================================================================ aba: câmera */

function abaCamera() {
  const T = S.config.teclas || { Camera: 'F6', Painel: 'F7' };
  const cmd = (acao, extra = {}) => post('camera', { acao, ...extra });
  const def = campo => v => cmd('definir', { campo, valor: v });
  const ativa = !!(S.camera && S.camera.ativa);
  const cfg = S.config;

  const slots = lista(S.camera && S.camera.slots);
  const linhaSlots = [1, 2, 3].map(n => h('div', { class: 'item' },
    h('span', { class: 'nome' }, `Posição ${n}`, h('small', null, slots[n - 1] ? 'salva' : 'vazia')),
    h('div', { class: 'acoes' },
      botao('Salvar', () => cmd('salvarSlot', { slot: n }), 'pequeno'),
      h('button', { type: 'button', class: 'btn pequeno primario', disabled: !slots[n - 1], onclick: () => cmd('carregarSlot', { slot: n }) }, 'Ir'))));

  return [
    cartao(null, [
      botao(ativa ? `Desligar câmera livre (${T.Camera})` : `Ligar câmera livre (${T.Camera})`, () => cmd('alternar'), 'grande ' + (ativa ? 'perigo' : 'primario')),
      h('div', { class: 'botoes' },
        botao('Enquadrar meu rosto', () => cmd('enquadrar')),
        botao('Focar no centro', () => cmd('focar'))),
      dica(`Feche o painel (<kbd>${T.Painel}</kbd> ou <kbd>Esc</kbd>) para mover a câmera. <kbd>H</kbd> esconde toda a interface na hora do clique.`),
    ]),
    cartao('Lente', [
      slider({ rotulo: 'Zoom', caminho: 'camera.fov', min: cfg.fovMin || 5, max: cfg.fovMax || 110, passo: 0.5, formato: v => `${mm(v)} mm · FOV ${Math.round(v)}°`, aoMudar: def('fov') }),
      slider({ rotulo: 'Inclinação (horizonte)', caminho: 'camera.roll', min: -45, max: 45, passo: 0.5, formato: v => `${v.toFixed(1)}°`, aoMudar: def('roll') }),
      slider({ rotulo: 'Tremor de mão', caminho: 'camera.tremor', min: 0, max: 1, passo: 0.05, formato: v => (v ? pct(v) : 'desligado'), aoMudar: def('tremor') }),
      slider({ rotulo: 'Velocidade de voo', caminho: 'camera.velocidade', min: 0.1, max: 5, passo: 0.1, formato: v => `${v.toFixed(1)}×`, aoMudar: def('velocidade') }),
    ]),
    cartao('Foco (profundidade de campo)', [
      chave({ rotulo: 'Desfocar o fundo', detalhe: 'Simula uma lente com abertura grande', caminho: 'camera.dof.ativo', aoMudar: def('dof.ativo') }),
      chave({ rotulo: 'Foco automático contínuo', detalhe: 'Foca sempre no que está no centro', caminho: 'camera.dof.continuo', aoMudar: def('dof.continuo') }),
      slider({ rotulo: 'Distância de foco', caminho: 'camera.dof.foco', min: 0.3, max: 300, log: true, formato: metros, aoMudar: def('dof.foco') }),
      slider({ rotulo: 'Área nítida', caminho: 'camera.dof.profundidade', min: 0.1, max: 100, log: true, formato: metros, aoMudar: def('dof.profundidade') }),
      slider({ rotulo: 'Intensidade do desfoque', caminho: 'camera.dof.intensidade', min: 0, max: 1, passo: 0.05, formato: pct, aoMudar: def('dof.intensidade') }),
      dica('Com a câmera ligada, <kbd>F</kbd> foca no centro da tela. Se o desfoque não aparecer: <b>Configurações › Gráficos</b>, Pós-processamento em <b>Muito alto/Ultra</b> e “Efeitos de profundidade de campo” ligado.'),
    ]),
    cartao('Enquadramento', [
      fichas({ rotulo: 'Proporção', caminho: 'camera.proporcao', colunas: 4, aoMudar: def('proporcao'),
        opcoes: [['livre', 'Livre'], ['1:1', '1:1'], ['4:5', '4:5 Insta'], ['9:16', '9:16 Story'], ['3:2', '3:2'], ['16:9', '16:9'], ['2.39:1', 'Cinema']].map(([v, l]) => ({ v, l })) }),
      chave({ rotulo: 'Barras pretas sólidas', detalhe: 'Desligado: barras translúcidas, só de guia', caminho: 'camera.barrasSolidas', aoMudar: def('barrasSolidas') }),
      chave({ rotulo: 'Grade dos terços', detalhe: 'Tecla G', caminho: 'camera.grade', aoMudar: def('grade') }),
      chave({ rotulo: 'Informações da lente na tela', caminho: 'camera.mostrarInfo', aoMudar: def('mostrarInfo') }),
    ]),
    cartao('Quem aparece', [
      chave({ rotulo: 'Esconder meu personagem', detalhe: 'Para fotografar os outros sem aparecer', caminho: 'camera.ocultarEu', aoMudar: def('ocultarEu') }),
      chave({ rotulo: 'Esconder outros jogadores', detalhe: 'Só na sua tela', caminho: 'camera.ocultarOutros', aoMudar: def('ocultarOutros') }),
    ]),
    cartao('Posições da câmera', [
      h('div', { class: 'lista' }, linhaSlots),
      dica('Guarda posição, ângulo, zoom e foco no seu computador. Ótimo para repetir o mesmo enquadramento.'),
    ]),
    cartao('Atalhos com a câmera ligada', [
      dica('<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> mover · <kbd>Espaço</kbd>/<kbd>Ctrl</kbd> subir/descer · <kbd>Shift</kbd> rápido · <kbd>Alt</kbd> lento<br>' +
        'Rodinha ou <kbd>PgUp</kbd>/<kbd>PgDn</kbd> zoom · <kbd>Z</kbd>/<kbd>C</kbd> inclinar · <kbd>R</kbd> endireitar<br>' +
        '<kbd>F</kbd> focar · <kbd>G</kbd> grade · <kbd>L</kbd> luz aqui · <kbd>H</kbd> esconder interface'),
    ], { recolhivel: true, aberto: false }),
  ];
}

/* ================================================================ aba: ambiente */

function abaAmbiente() {
  const a = S.ambiente || {};
  const cfg = S.config;
  const def = campo => v => post('ambiente', { acao: 'definir', campo, valor: v });
  const relogio = h('div', { class: 'relogio' });
  const estadoRelogio = h('small');
  relogio.append(document.createTextNode(''), estadoRelogio);
  const pintarRelogio = () => {
    relogio.firstChild.textContent = hhmm(obter('ambiente._min') || 0);
    estadoRelogio.textContent = obter('ambiente.congelado') ? 'congelado' : 'andando';
  };
  vincular('ambiente._min', pintarRelogio);
  vincular('ambiente.congelado', pintarRelogio);
  pintarRelogio();

  const horario = v => {
    definir('ambiente.hora', Math.floor(v / 60));
    definir('ambiente.minuto', v % 60);
    pintarRelogio();
    post('ambiente', { acao: 'horario', hora: Math.floor(v / 60), minuto: v % 60 });
  };

  return [
    cartao(null, [
      chave({ rotulo: 'Só pra mim', detalhe: 'Clima e hora mudam só na sua tela', caminho: 'ambiente.soPraMim',
        aoMudar: v => post('ambiente', { acao: 'soPraMim', valor: v }) }),
      !a.soPraMim && !a.podeMudar && h('p', { class: 'aviso-cartao' }, 'Neste servidor só admins mudam o ambiente de todos. Ligue “Só pra mim” para testar à vontade.'),
      !a.soPraMim && a.podeMudar && dica('As mudanças valem para <b>todo mundo</b> no servidor.'),
    ]),
    cartao('Horário', [
      relogio,
      slider({ rotulo: 'Hora do dia', caminho: 'ambiente._min', min: 0, max: 1439, passo: 1, formato: hhmm, aoMudar: horario }),
      h('div', { class: 'fichas grade-3' }, lista(cfg.horarios).map(x =>
        h('button', { type: 'button', class: 'ficha', onclick: () => { definir('ambiente._min', x.h * 60 + x.m); atualizarVinculos('ambiente._min'); horario(x.h * 60 + x.m); } },
          x.nome, h('small', null, `${doisDigitos(x.h)}:${doisDigitos(x.m)}`)))),
      chave({ rotulo: 'Congelar horário', detalhe: 'A luz fica parada para você fotografar com calma', caminho: 'ambiente.congelado', aoMudar: def('congelado') }),
    ]),
    cartao('Clima', [
      fichas({ caminho: 'ambiente.clima', colunas: 3, aoMudar: def('clima'), opcoes: lista(cfg.climas).map(c => ({ v: c.id, l: c.nome })) }),
    ]),
    cartao('Céu', [
      fichas({ rotulo: 'Nuvens', caminho: 'ambiente.nuvens', colunas: 3, aoMudar: def('nuvens'), opcoes: lista(cfg.nuvens).map(c => ({ v: c.id, l: c.nome })) }),
      slider({ rotulo: 'Opacidade das nuvens', caminho: 'ambiente.opacidadeNuvens', min: 0, max: 1, passo: 0.05, formato: pct, aoMudar: def('opacidadeNuvens') }),
      slider({ rotulo: 'Vento', caminho: 'ambiente.vento', min: -1, max: 12, passo: 0.5, formato: v => (v < 0 ? 'automático' : `${v.toFixed(1)}`), aoMudar: def('vento') }),
    ]),
    cartao('Cidade', [
      chave({ rotulo: 'Apagão', detalhe: 'Desliga as luzes da cidade (dá para ver as estrelas)', caminho: 'ambiente.apagao', aoMudar: def('apagao') }),
      slider({ rotulo: 'Trânsito', caminho: 'ambiente.trafego', min: 0, max: 1, passo: 0.05, formato: v => (v ? pct(v) : 'ruas vazias'), aoMudar: def('trafego') }),
      slider({ rotulo: 'Pedestres', caminho: 'ambiente.pedestres', min: 0, max: 1, passo: 0.05, formato: v => (v ? pct(v) : 'ninguém'), aoMudar: def('pedestres') }),
      botao('Remover NPCs e carros parados por perto', () => post('ambiente', { acao: 'limparArea' })),
    ]),
  ];
}

/* ================================================================ aba: filtros */

function abaFiltros() {
  const cfg = S.config;
  const grupos = agrupar(lista(cfg.filtros), 'grupo');
  const blocos = [];
  for (const [nome, itens] of grupos) {
    blocos.push(h('p', { class: 'subtitulo' }, nome));
    blocos.push(fichas({ caminho: 'filtros.nome', colunas: 3, opcoes: itens.map(f => ({ v: f.id, l: f.nome })),
      aoMudar: v => post('filtros', { acao: 'filtro', nome: v }) }));
  }
  return [
    cartao('Filtro de cor', [
      slider({ rotulo: 'Intensidade', caminho: 'filtros.forca', min: 0, max: 1.5, passo: 0.05, formato: pct, aoMudar: v => post('filtros', { acao: 'forca', valor: v }) }),
      blocos,
      h('p', { class: 'subtitulo' }, 'Outro filtro (nome do timecycle)'),
      campoTexto({ placeholder: 'ex.: NG_filmic12', rotuloBotao: 'Aplicar', maxlength: 64, aoEnviar: t => post('filtros', { acao: 'filtro', nome: t }) }),
    ]),
    cartao('Ajuste extra (por cima do filtro)', [
      fichas({ caminho: 'filtros.extra', colunas: 3, opcoes: lista(cfg.ajustes).map(f => ({ v: f.id, l: f.nome })),
        aoMudar: v => post('filtros', { acao: 'extra', nome: v }) }),
      slider({ rotulo: 'Intensidade do ajuste', caminho: 'filtros.forcaExtra', min: 0, max: 1.5, passo: 0.05, formato: pct, aoMudar: v => post('filtros', { acao: 'forcaExtra', valor: v }) }),
      botao('Remover todos os filtros', () => post('filtros', { acao: 'limpar' }), 'perigo'),
    ]),
  ];
}

/* ================================================================ aba: luzes */

function abaLuzes() {
  const L = S.luzes || {};
  const luzes = lista(L.lista);
  const cheio = luzes.length >= (L.maximo || 12);
  const cmd = (acao, extra = {}) => post('luzes', { acao, ...extra });

  const cartaoLuz = (luz, i) => {
    const base = `luzes.lista.${i}`;
    const ed = campo => v => cmd('editar', { id: luz.id, campo, valor: v });
    const spot = luz.tipo === 'spot';
    const bolinha = h('span', { class: 'bolinha', style: { background: rgbCss(luz.cor || { r: 255, g: 255, b: 255 }) } });
    vincular(`${base}.cor`, c => { if (c) bolinha.style.background = rgbCss(c); });
    return h('details', { class: 'cartao', open: i === luzes.length - 1 },
      h('summary', null, h('span', { class: 'cabeca-luz' }, bolinha, `Luz ${luz.id} · ${spot ? 'Spot' : 'Pontual'}`)),
      chave({ rotulo: 'Ligada', caminho: `${base}.ligada`, aoMudar: ed('ligada') }),
      fichas({ caminho: `${base}.tipo`, colunas: 2, opcoes: [{ v: 'spot', l: 'Spot (direcional)' }, { v: 'ponto', l: 'Pontual (lâmpada)' }], aoMudar: ed('tipo') }),
      seletorCor({ rotulo: 'Cor', caminho: `${base}.cor`, aoMudar: c => cmd('editar', { id: luz.id, campo: 'cor', valor: c }) }),
      slider({ rotulo: 'Intensidade', caminho: `${base}.intensidade`, min: 0, max: 50, passo: 0.25, formato: v => v.toFixed(1), aoMudar: ed('intensidade') }),
      slider({ rotulo: 'Alcance', caminho: `${base}.alcance`, min: 0.5, max: 100, passo: 0.5, formato: metros, aoMudar: ed('alcance') }),
      spot && slider({ rotulo: 'Abertura do cone', caminho: `${base}.abertura`, min: 1, max: 90, passo: 1, formato: v => `${Math.round(v)}°`, aoMudar: ed('abertura') }),
      spot && slider({ rotulo: 'Queda (falloff)', caminho: `${base}.queda`, min: 0, max: 20, passo: 0.1, formato: v => v.toFixed(1), aoMudar: ed('queda') }),
      spot && slider({ rotulo: 'Borda do cone', caminho: `${base}.borda`, min: 0, max: 1, passo: 0.05, formato: pct, aoMudar: ed('borda') }),
      spot && chave({ rotulo: 'Projetar sombras', caminho: `${base}.sombra`, aoMudar: ed('sombra') }),
      h('div', { class: 'botoes tres' },
        botao('Trazer p/ câmera', () => cmd('moverCamera', { id: luz.id })),
        botao('Apontar p/ rosto', () => cmd('apontarPersonagem', { id: luz.id })),
        botao('Remover', () => cmd('remover', { id: luz.id }), 'perigo')));
  };

  return [
    cartao('Luzes de estúdio', [
      dica('A luz nasce <b>onde a câmera está</b>, apontando para onde ela olha. Posicione a câmera, crie a luz e depois volte para enquadrar. Atalho: <kbd>L</kbd> com a câmera ligada.'),
      h('div', { class: 'botoes' },
        h('button', { type: 'button', class: 'btn primario', disabled: cheio, onclick: () => cmd('adicionar', { tipo: 'spot' }) }, '+ Spot'),
        h('button', { type: 'button', class: 'btn', disabled: cheio, onclick: () => cmd('adicionar', { tipo: 'ponto' }) }, '+ Luz pontual')),
      chave({ rotulo: 'Mostrar marcadores', detalhe: 'Bolinhas onde estão as luzes (somem com H)', caminho: 'luzes.marcadores',
        aoMudar: v => cmd('marcadores', { valor: v }) }),
      luzes.length > 0 && botao('Remover todas as luzes', () => cmd('limpar'), 'perigo'),
      dica('As luzes aparecem só na sua tela.'),
    ]),
    luzes.length === 0 ? h('p', { class: 'vazio' }, 'Nenhuma luz ainda.') : luzes.map(cartaoLuz),
  ];
}

/* ================================================================ aba: poses */

function abaPoses() {
  const cfg = S.config;
  const P = S.poses || {};
  const cmd = (acao, extra = {}) => post('poses', { acao, ...extra });
  const poses = lista(cfg.poses);
  const itens = [];
  const blocos = [];
  for (const [nome, grupo] of agrupar(poses, 'categoria')) {
    const titulo = h('p', { class: 'subtitulo' }, nome);
    const botoes = grupo.map(p => {
      const b = h('button', { type: 'button', class: 'item-botao', onclick: () => cmd('tocar', { indice: p.indice }) },
        h('span', null, p.nome), h('small', null, `/e ${p.cmd}`));
      b.dataset.busca = semAcento(`${p.nome} ${p.cmd} ${nome}`);
      itens.push(b);
      return b;
    });
    const bloco = h('div', { class: 'lista' }, titulo, botoes);
    bloco._botoes = botoes;
    blocos.push(bloco);
  }
  const atual = h('span');
  const pintarAtual = v => { atual.textContent = v ? v : 'nenhuma'; };
  vincular('poses.atual', pintarAtual);
  pintarAtual(P.atual);

  let dict = '', anim = '', flag = 1;
  const dictIn = h('input', { class: 'texto', placeholder: 'dicionário', spellcheck: 'false', oninput: e => { dict = e.target.value.trim(); } });
  const animIn = h('input', { class: 'texto', placeholder: 'animação', spellcheck: 'false', oninput: e => { anim = e.target.value.trim(); } });

  return [
    cartao('Pose atual', [
      h('div', { class: 'rotulo' }, h('span', null, 'Tocando: ', atual)),
      h('div', { class: 'botoes' },
        botao('Parar pose', () => cmd('parar'), 'perigo'),
        botao('Enquadrar meu rosto', () => post('camera', { acao: 'enquadrar' }))),
      chave({ rotulo: 'Congelar a pose', detalhe: 'Trava a animação no quadro atual', caminho: 'poses.congelada', aoMudar: v => cmd('congelar', { valor: v }) }),
      slider({ rotulo: 'Girar personagem', caminho: 'poses.rotacao', min: 0, max: 359, passo: 1, formato: v => `${Math.round(v)}°`, aoMudar: v => cmd('rotacao', { valor: v }) }),
    ]),
    cartao('Expressão do rosto', [
      fichas({ caminho: 'poses.expressao', colunas: 3, opcoes: lista(cfg.expressoes).map(e => ({ v: e.id, l: e.nome })), aoMudar: v => cmd('expressao', { valor: v }) }),
    ]),
    cartao('Poses', [
      busca('Buscar pose…', termo => {
        for (const b of itens) b.style.display = !termo || b.dataset.busca.includes(termo) ? '' : 'none';
        for (const bloco of blocos) bloco.style.display = bloco._botoes.some(b => b.style.display !== 'none') ? '' : 'none';
      }),
      blocos,
    ]),
    cartao('Animação personalizada', [
      dica('Qualquer animação do GTA (listas na internet: “GTA V animation list”).'),
      dictIn, animIn,
      fichas({ valor: 1, colunas: 3, opcoes: [{ v: 1, l: 'Corpo todo' }, { v: 49, l: 'Só tronco' }, { v: 2, l: 'Trava no fim' }], aoMudar: v => { flag = v; } }),
      botao('Tocar animação', () => { if (dict && anim) cmd('personalizada', { dict, anim, flag }); else aviso('Preencha dicionário e animação.', 'erro'); }, 'primario'),
    ], { recolhivel: true, aberto: false }),
  ];
}

/* ================================================================ aba: personagem */

function abaPersonagem() {
  const cfg = S.config;
  const P = S.personagem || {};
  const cmd = (acao, extra = {}) => post('personagem', { acao, ...extra });
  const blocos = [];

  blocos.push(cartao('Modelo', [
    h('div', { class: 'rotulo' }, h('span', null, 'Atual: ', h('b', null, P.modelo || '?'))),
    fichas({ valor: P.modelo, colunas: 2, opcoes: lista(cfg.modelos).slice(0, 2).map(m => ({ v: m.m, l: m.n })),
      aoMudar: v => cmd('modelo', { modelo: v }) }),
    h('details', { class: 'cartao sub' }, h('summary', null, 'Outros modelos (protagonistas, NPCs, animais)'),
      fichas({ valor: P.modelo, colunas: 2, opcoes: lista(cfg.modelos).slice(2).map(m => ({ v: m.m, l: m.n })),
        aoMudar: v => cmd('modelo', { modelo: v }) })),
    campoTexto({ placeholder: 'outro modelo, ex.: a_f_m_beach_01', rotuloBotao: 'Usar', maxlength: 40, aoEnviar: t => cmd('modelo', { modelo: t }) }),
    !P.freemode && dica('Para mexer em rosto, cabelo e maquiagem, use um modelo <b>customizável</b> (masculino ou feminino).'),
  ]));

  if (P.freemode) {
    blocos.push(cartao('Rosto (herança)', [
      passos({ rotulo: 'Mãe', caminho: 'personagem.heranca', ler: o => ({ valor: o.mae, min: 0, max: 45 }), aoMudar: n => cmd('heranca', { campo: 'mae', valor: n }) }),
      passos({ rotulo: 'Pai', caminho: 'personagem.heranca', ler: o => ({ valor: o.pai, min: 0, max: 45 }), aoMudar: n => cmd('heranca', { campo: 'pai', valor: n }) }),
      slider({ rotulo: 'Semelhança (mãe → pai)', caminho: 'personagem.heranca.semelhanca', min: 0, max: 1, passo: 0.02, formato: pct, aoMudar: v => cmd('heranca', { campo: 'semelhanca', valor: v }) }),
      slider({ rotulo: 'Tom de pele (mãe → pai)', caminho: 'personagem.heranca.pele', min: 0, max: 1, passo: 0.02, formato: pct, aoMudar: v => cmd('heranca', { campo: 'pele', valor: v }) }),
      passos({ rotulo: 'Cor dos olhos', caminho: 'personagem.olhos', ler: o => ({ valor: o, min: 0, max: 31 }), aoMudar: n => cmd('olhos', { valor: n }) }),
    ]));
  }

  const cabelo = [
    passos({ rotulo: 'Corte', caminho: 'personagem.cabelo', ler: o => ({ valor: o.d, min: 0, max: o.dMax }),
      aoMudar: n => cmd('componente', { id: 2, campo: 'd', d: n, t: 0 }) }),
    passos({ rotulo: 'Variação', caminho: 'personagem.cabelo', ler: o => ({ valor: o.t, min: 0, max: o.tMax }),
      aoMudar: n => cmd('componente', { id: 2, campo: 't', d: obter('personagem.cabelo.d'), t: n }) }),
  ];
  if (P.freemode) {
    const pal = lista(P.paletaCabelo);
    if (pal.length) {
      cabelo.push(paleta({ rotulo: 'Cor', cores: pal, caminho: 'personagem.cabeloCor', aoMudar: i => cmd('cabeloCor', { cor: i }) }));
      cabelo.push(paleta({ rotulo: 'Mechas', cores: pal, caminho: 'personagem.cabeloMechas', aoMudar: i => cmd('cabeloCor', { mechas: i }) }));
    } else {
      const max = (P.totalCoresCabelo || 64) - 1;
      cabelo.push(passos({ rotulo: 'Cor', caminho: 'personagem.cabeloCor', ler: o => ({ valor: o, min: 0, max }), aoMudar: n => cmd('cabeloCor', { cor: n }) }));
      cabelo.push(passos({ rotulo: 'Mechas', caminho: 'personagem.cabeloMechas', ler: o => ({ valor: o, min: 0, max }), aoMudar: n => cmd('cabeloCor', { mechas: n }) }));
    }
  }
  blocos.push(cartao('Cabelo', cabelo));

  if (P.freemode) {
    const overlays = lista(P.overlays).map((o, i) => {
      const base = `personagem.overlays.${i}`;
      const cores = o.tipoCor === 1 ? lista(P.paletaCabelo) : o.tipoCor === 2 ? lista(P.paletaMaquiagem) : [];
      return h('div', { class: 'par-passos' },
        passos({ rotulo: o.nome, caminho: base, nomeMin: 'nenhum', ler: x => ({ valor: x.valor, min: -1, max: x.max }),
          aoMudar: n => cmd('overlay', { id: o.id, campo: 'valor', valor: n }) }),
        slider({ rotulo: 'Opacidade', caminho: `${base}.opacidade`, min: 0, max: 1, passo: 0.05, formato: pct,
          aoMudar: v => cmd('overlay', { id: o.id, campo: 'opacidade', valor: v }) }),
        o.tipoCor > 0 && (cores.length
          ? paleta({ cores, caminho: `${base}.cor`, aoMudar: n => cmd('overlay', { id: o.id, campo: 'cor', valor: n }) })
          : passos({ rotulo: 'Cor', caminho: `${base}.cor`, ler: x => ({ valor: x, min: 0, max: 63 }), aoMudar: n => cmd('overlay', { id: o.id, campo: 'cor', valor: n }) })));
    });
    blocos.push(cartao('Maquiagem, barba e pele', overlays, { recolhivel: true, aberto: false }));

    blocos.push(cartao('Traços do rosto', lista(P.rosto).map((r, i) =>
      slider({ rotulo: r.nome, caminho: `personagem.rosto.${i}.valor`, min: -1, max: 1, passo: 0.05, formato: v => (v > 0 ? '+' : '') + v.toFixed(2),
        aoMudar: v => cmd('rosto', { indice: r.indice, valor: v }) })), { recolhivel: true, aberto: false }));
  }

  const roupa = (tipo, item, i) => {
    const base = `personagem.${tipo === 'prop' ? 'props' : 'componentes'}.${i}`;
    const minimo = tipo === 'prop' ? -1 : 0;
    return h('div', { class: 'par-passos' },
      h('span', { class: 'nome' }, item.nome),
      passos({ rotulo: 'Modelo', caminho: base, nomeMin: tipo === 'prop' ? 'nenhum' : null, ler: o => ({ valor: o.d, min: minimo, max: o.dMax }),
        aoMudar: n => cmd(tipo, { id: item.id, campo: 'd', d: n, t: 0 }) }),
      passos({ rotulo: 'Cor / estampa', caminho: base, ler: o => ({ valor: o.t, min: 0, max: o.tMax }),
        aoMudar: n => cmd(tipo, { id: item.id, campo: 't', d: obter(`${base}.d`), t: n }) }));
  };
  blocos.push(cartao('Roupas', [
    lista(P.componentes).map((c, i) => roupa('componente', c, i)),
    botao('Roupa aleatória', () => cmd('aleatorio')),
  ]));
  blocos.push(cartao('Acessórios', [
    lista(P.props).length ? lista(P.props).map((p, i) => roupa('prop', p, i)) : h('p', { class: 'vazio' }, 'Este modelo não tem acessórios.'),
    lista(P.props).length > 0 && botao('Tirar todos os acessórios', () => cmd('tirarAcessorios')),
  ]));

  const looks = P.looks || {};
  const ocupados = lista(looks.ocupados);
  const totalLooks = P.totalLooks || 3;
  blocos.push(cartao('Looks salvos', [
    h('div', { class: 'lista' }, Array.from({ length: totalLooks }, (_, i) => {
      const n = i + 1;
      return h('div', { class: 'item' },
        h('span', { class: 'nome' }, `Look ${n}`, h('small', null, ocupados[i] ? (looks.ativo === n ? 'salvo · usado ao entrar' : 'salvo') : 'vazio')),
        h('div', { class: 'acoes' },
          botao('Salvar aqui', () => cmd('salvarLook', { slot: n }).then(desenhar), 'pequeno'),
          h('button', { type: 'button', class: 'btn pequeno primario', disabled: !ocupados[i], onclick: () => cmd('usarLook', { slot: n }) }, 'Usar')));
    })),
    dica('Fica salvo no servidor: o último look salvo ou usado é aplicado quando você entra.'),
  ]));
  return blocos;
}

/* ================================================================ aba: veículo */

function abaVeiculo() {
  const cfg = S.config;
  const V = S.veiculo || {};
  const cmd = (acao, extra = {}) => post('veiculo', { acao, ...extra });
  const def = acao => v => cmd(acao, { valor: v });
  const blocos = [];

  const atalhos = lista(cfg.veiculos).map(cat => h('details', { class: 'cartao sub' },
    h('summary', null, cat.categoria),
    h('div', { class: 'fichas grade-3' }, lista(cat.modelos).map(m =>
      h('button', { type: 'button', class: 'ficha', title: m.m, onclick: () => cmd('criar', { modelo: m.m }) }, m.n)))));

  blocos.push(cartao('Criar veículo', [
    campoTexto({ placeholder: 'modelo, ex.: elegy2', rotuloBotao: 'Criar', maxlength: 32, aoEnviar: t => cmd('criar', { modelo: t }) }),
    atalhos,
  ]));

  if (!V.existe) {
    blocos.push(h('p', { class: 'vazio' }, 'Nenhum veículo por perto. Crie um acima ou entre em algum.'));
    return blocos;
  }

  blocos.push(cartao(null, [
    h('div', { class: 'rotulo' }, h('span', null, 'Editando: ', h('b', null, V.nome || 'veículo')), V.dentro ? h('span', { class: 'valor' }, 'você está nele') : null),
    h('div', { class: 'botoes tres' },
      botao('Reparar', () => cmd('reparar')),
      botao('Lavar', () => cmd('lavar')),
      V.dentro ? botao('Atualizar', () => cmd('atualizar')) : botao('Entrar', () => cmd('entrar'))),
  ]));

  blocos.push(cartao('Pintura', [
    seletorCor({ rotulo: 'Cor principal', caminho: 'veiculo.primaria', amostras: AMOSTRAS_CARRO, aoMudar: c => cmd('cor', { qual: 'primaria', ...c }) }),
    seletorCor({ rotulo: 'Cor secundária', caminho: 'veiculo.secundaria', amostras: AMOSTRAS_CARRO, aoMudar: c => cmd('cor', { qual: 'secundaria', ...c }) }),
    fichas({ rotulo: 'Acabamento', caminho: 'veiculo.acabamento', colunas: 3, aoMudar: def('acabamento'),
      opcoes: ['Normal', 'Metálico', 'Perolado', 'Fosco', 'Escovado', 'Cromado'].map((l, v) => ({ v, l })) }),
    passos({ rotulo: 'Perolado', detalhe: 'reflexo', caminho: 'veiculo.perolado', ler: o => ({ valor: o, min: 0, max: 160 }), aoMudar: def('perolado') }),
    passos({ rotulo: 'Cor das rodas', caminho: 'veiculo.corRodas', ler: o => ({ valor: o, min: 0, max: 160 }), aoMudar: def('corRodas') }),
    passos({ rotulo: 'Pintura especial', detalhe: 'livery', caminho: 'veiculo', ler: o => ({ valor: o.livery, min: o.liveryMin, max: o.liveryMax }), aoMudar: def('livery') }),
    slider({ rotulo: 'Sujeira', caminho: 'veiculo.sujeira', min: 0, max: 15, passo: 0.5, formato: v => (v ? pct(v / 15) : 'limpo'), aoMudar: def('sujeira') }),
  ]));

  blocos.push(cartao('Rodas, vidro e placa', [
    fichas({ rotulo: 'Tipo de roda', caminho: 'veiculo.tipoRodas', colunas: 3, aoMudar: def('tipoRodas'),
      opcoes: ['Esportiva', 'Muscle', 'Lowrider', 'SUV', 'Off-road', 'Tuner', 'Moto', 'High-end', 'Benny\'s', 'Benny\'s 2', 'Fórmula', 'Rua', 'Pista'].map((l, v) => ({ v, l })) }),
    passos({ rotulo: 'Modelo da roda', caminho: 'veiculo', nomeMin: 'original', ler: o => ({ valor: o.rodas, min: -1, max: o.maxRodas }), aoMudar: def('rodas') }),
    fichas({ rotulo: 'Insulfilm', caminho: 'veiculo.vidro', colunas: 4, aoMudar: def('vidro'),
      opcoes: ['Nenhum', 'Preto', 'Escuro', 'Claro', 'Original', 'Limusine', 'Verde'].map((l, v) => ({ v, l })) }),
    campoTexto({ placeholder: 'texto da placa (até 8)', rotuloBotao: 'Placa', valor: V.placa || '', maxlength: 8, aoEnviar: t => cmd('placa', { valor: t }) }),
    fichas({ caminho: 'veiculo.estiloPlaca', colunas: 3, aoMudar: def('estiloPlaca'),
      opcoes: ['Azul/branca 1', 'Amarela/preta', 'Amarela/azul', 'Azul/branca 2', 'Azul/branca 3', 'Yankton'].map((l, v) => ({ v, l })) }),
  ]));

  blocos.push(cartao('Luzes do carro', [
    fichas({ rotulo: 'Faróis', caminho: 'veiculo.farol', colunas: 4, aoMudar: def('farol'),
      opcoes: ['Automático', 'Desligado', 'Ligado', 'Alto'].map((l, v) => ({ v, l })) }),
    chave({ rotulo: 'Faróis de xenon', caminho: 'veiculo.xenon', aoMudar: def('xenon') }),
    fichas({ rotulo: 'Cor do xenon', caminho: 'veiculo.xenonCor', colunas: 4, aoMudar: def('xenonCor'),
      opcoes: [[255, 'Padrão'], [0, 'Branco'], [1, 'Azul'], [2, 'Azul elétrico'], [3, 'Verde-menta'], [4, 'Verde-limão'], [5, 'Amarelo'], [6, 'Dourado'], [7, 'Laranja'], [8, 'Vermelho'], [9, 'Rosa'], [10, 'Pink'], [11, 'Roxo'], [12, 'Luz negra']].map(([v, l]) => ({ v, l })) }),
    chave({ rotulo: 'Neon embaixo', caminho: 'veiculo.neon', aoMudar: def('neon') }),
    seletorCor({ rotulo: 'Cor do neon', caminho: 'veiculo.neonCor', aoMudar: c => cmd('neonCor', c) }),
  ]));

  blocos.push(cartao('Portas', [
    h('div', { class: 'fichas grade-3' }, lista(V.portas).map((p, i) => {
      const b = h('button', { type: 'button', class: 'ficha', onclick: () => cmd('porta', { indice: p.indice }) }, p.nome);
      vincular(`veiculo.portas.${i}.aberta`, v => b.classList.toggle('ativa', !!v));
      b.classList.toggle('ativa', !!p.aberta);
      return b;
    })),
    h('div', { class: 'botoes' }, botao('Abrir todas', () => cmd('portasTodas', { valor: true })), botao('Fechar todas', () => cmd('portasTodas', { valor: false }))),
  ]));

  blocos.push(cartao('Mais', [
    chave({ rotulo: 'Motor ligado', caminho: 'veiculo.motor', aoMudar: def('motor') }),
    chave({ rotulo: 'Travar no lugar', detalhe: 'Não se mexe nem se alguém bater', caminho: 'veiculo.congelado', aoMudar: def('congelar') }),
    h('div', { class: 'botoes' }, botao('Tunar no máximo', () => cmd('tunar'), 'primario'), botao('Peças de fábrica', () => cmd('original'))),
    botao('Apagar veículo', () => cmd('apagar'), 'perigo'),
  ]));
  return blocos;
}

/* ================================================================ aba: locais */

function abaLocais() {
  const cfg = S.config;
  const Lo = S.locais || {};
  const cmd = (acao, extra = {}) => post('locais', { acao, ...extra });
  const salvos = lista(Lo.salvos);
  const jogadores = lista(Lo.jogadores);
  const presets = [];
  for (const [nome, itens] of agrupar(lista(cfg.locais), 'categoria')) {
    presets.push(h('p', { class: 'subtitulo' }, nome));
    presets.push(h('div', { class: 'lista' }, itens.map(l =>
      h('button', { type: 'button', class: 'item-botao', onclick: () => cmd('preset', { indice: l.indice }) }, h('span', null, l.nome), h('small', null, 'ir')))));
  }

  return [
    cartao(null, [
      h('div', { class: 'botoes' },
        botao('Ir ao marcador do mapa', () => cmd('marcador'), 'primario'),
        botao('Voltar ao início', () => cmd('spawn'))),
      dica('Marque um ponto no mapa (<kbd>Esc</kbd> › Mapa) e use o botão acima ou <kbd>/tp</kbd>.'),
    ]),
    cartao('Salvar onde estou', [
      campoTexto({ placeholder: 'nome do lugar, ex.: Mirante do pôr do sol', rotuloBotao: 'Salvar', maxlength: 40,
        aoEnviar: (t, input) => { if (!t) { aviso('Dê um nome para o local.', 'erro'); return; } cmd('salvar', { nome: t }); input.value = ''; } }),
      dica('Fica disponível para <b>todo mundo</b> do servidor.'),
    ]),
    cartao(`Lugares da galera (${salvos.length})`, [
      salvos.length === 0 ? h('p', { class: 'vazio' }, 'Ninguém salvou um lugar ainda.') :
        h('div', { class: 'lista' }, salvos.map(l => h('div', { class: 'item' },
          h('span', { class: 'nome' }, l.nome, l.autor && h('small', null, `por ${l.autor}`)),
          h('div', { class: 'acoes' },
            botao('Ir', () => cmd('salvo', { id: l.id }), 'pequeno primario'),
            botao('Remover', () => cmd('remover', { id: l.id }), 'pequeno perigo'))))),
    ]),
    cartao('Pontos de foto', presets, { recolhivel: true }),
    cartao('Jogadores online', [
      botao(jogadores.length ? 'Atualizar lista' : 'Mostrar jogadores', () => cmd('jogadores')),
      jogadores.length > 0 && h('div', { class: 'lista' }, jogadores.map(j => h('div', { class: 'item' },
        h('span', { class: 'nome' }, j.nome, h('small', null, `ID ${j.id}`)),
        j.id === Lo.meuId ? h('small', null, 'você') : botao('Ir até', () => cmd('irJogador', { id: j.id }), 'pequeno')))),
    ]),
  ];
}

/* ================================================================ estrutura */

const ICONES = {
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  ambiente: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  filtros: '<circle cx="9" cy="9.5" r="5"/><circle cx="15" cy="9.5" r="5"/><circle cx="12" cy="14.5" r="5"/>',
  luzes: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
  poses: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7.5v6.5M12 14l-3.5 7M12 14l3.5 7M5.5 9.5 12 10l6.5-3"/>',
  personagem: '<path d="M8.5 3 4 5.5l1.8 4L8 8.6V21h8V8.6l2.2.9 1.8-4L15.5 3c-.6 1.6-2 2.5-3.5 2.5S9.1 4.6 8.5 3z"/>',
  veiculo: '<path d="M3.5 16.5V13l2-4.6A2 2 0 0 1 7.3 7h9.4a2 2 0 0 1 1.8 1.4l2 4.6v3.5"/><path d="M3.5 13h17"/><circle cx="7.5" cy="16.5" r="1.9"/><circle cx="16.5" cy="16.5" r="1.9"/><path d="M9.4 16.5h5.2"/>',
  locais: '<path d="M12 21s-6.5-5.8-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
};

const ABAS = [
  { id: 'camera', nome: 'Câmera', desenhar: abaCamera },
  { id: 'ambiente', nome: 'Ambiente', desenhar: abaAmbiente },
  { id: 'filtros', nome: 'Filtros', desenhar: abaFiltros },
  { id: 'luzes', nome: 'Luzes', desenhar: abaLuzes },
  { id: 'poses', nome: 'Poses', desenhar: abaPoses },
  { id: 'personagem', nome: 'Visual', desenhar: abaPersonagem },
  { id: 'veiculo', nome: 'Veículo', desenhar: abaVeiculo },
  { id: 'locais', nome: 'Locais', desenhar: abaLocais },
];

const TITULOS = { personagem: 'Personagem' };

function montarAbas() {
  $abas.replaceChildren(...ABAS.map(a => {
    const b = h('button', { type: 'button', class: 'aba', title: a.nome, onclick: () => trocarAba(a.id) });
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[a.id]}</svg>`;
    b.append(h('span', null, a.nome));
    b.dataset.aba = a.id;
    return b;
  }));
}

function trocarAba(id) {
  if (abaAtual === id) return;
  abaAtual = id;
  $corpo.scrollTop = 0;
  desenhar();
}

function desenhar() {
  const aba = ABAS.find(a => a.id === abaAtual) || ABAS[0];
  const rolagem = $corpo.scrollTop;
  vinculos = new Map();
  $titulo.textContent = TITULOS[aba.id] || aba.nome;
  let conteudo;
  try {
    conteudo = [aba.desenhar()].flat(Infinity).filter(Boolean);
  } catch (e) {
    console.error(e);
    conteudo = [h('p', { class: 'vazio' }, 'Não consegui desenhar esta aba: ' + e.message)];
  }
  $corpo.replaceChildren(...conteudo);
  $corpo.scrollTop = rolagem;
  for (const b of $abas.children) b.classList.toggle('ativa', b.dataset.aba === aba.id);
  const T = S.config.teclas || { Camera: 'F6', Painel: 'F7' };
  $rodape.innerHTML = `<kbd>Esc</kbd> ou <kbd>${T.Painel}</kbd> fecha · <kbd>${T.Camera}</kbd> liga/desliga a câmera · <kbd>/fotoajuda</kbd> no chat`;
}

function abrir(estado) {
  S.config = estado.config || S.config;
  for (const p of PARTES) if (estado[p] !== undefined) guardarParte(p, estado[p]);
  if (S.config.nome) $nomeServidor.textContent = S.config.nome;
  aberto = true;
  desenhar();
  $painel.classList.add('aberto');
  $painel.setAttribute('aria-hidden', 'false');
}

function fecharVisual() {
  aberto = false;
  $painel.classList.remove('aberto');
  $painel.setAttribute('aria-hidden', 'true');
  if (document.activeElement) document.activeElement.blur();
}

function fechar() {
  fecharVisual();
  post('fechar');
}

window.addEventListener('message', e => {
  const m = e.data;
  if (!m || typeof m !== 'object') return;
  if (m.tipo === 'abrir') abrir(m.estado || {});
  else if (m.tipo === 'fechar') fecharVisual();
  else if (m.tipo === 'aviso') aviso(m.texto);
  else if (m.tipo === 'atualizar' && PARTES.includes(m.parte)) {
    guardarParte(m.parte, m.dados);
    if (!aberto) return;
    const usa = abaAtual === m.parte || (m.parte === 'poses' && abaAtual === 'personagem');
    if (m.estrutural && usa) desenhar();
    else atualizarVinculos(m.parte);
  }
});

document.addEventListener('keydown', e => {
  if (!aberto) return;
  const T = S.config.teclas || { Camera: 'F6', Painel: 'F7' };
  if (e.key === 'Escape' || e.key === T.Painel) {
    e.preventDefault();
    fechar();
  } else if (e.key === T.Camera) {
    e.preventDefault();
    post('camera', { acao: 'alternar' });
  }
});

document.getElementById('fechar').addEventListener('click', fechar);
montarAbas();
