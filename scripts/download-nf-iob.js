#!/usr/bin/env node
/**
 * Download em massa de NFs do IOB
 * App: https://app.iob.com.br/app/ext/documentos-fiscais/
 *
 * Uso:
 *   node scripts/download-nf-iob.js --start 2025-03-01 --end 2025-03-31 --tipo NFSe --aba Tomada --visible
 *   node scripts/download-nf-iob.js --start 2025-03-01 --end 2025-03-31 --tipo NFSe --aba Prestada --todas --visible
 *   node scripts/download-nf-iob.js --start 2025-03-01 --end 2025-03-31 --tipo NFe  --aba Entrada --visible
 *
 * Flags:
 *   --start    Data início YYYY-MM-DD (obrigatório)
 *   --end      Data fim   YYYY-MM-DD (obrigatório)
 *   --tipo     NFe | NFSe            (padrão: NFSe)
 *   --aba      NFSe → Tomada | Prestada     (padrão: Tomada)
 *              NFe  → Entrada | Saida | Transporte | Citada | SEFAZ
 *   --todas    Itera por todas as empresas do dropdown
 *   --empresa  Parte do nome para filtrar uma empresa específica
 *   --out      Pasta de saída (padrão: ./downloads/nf)
 *   --visible  Abre o browser visível (necessário no 1º login para o reCAPTCHA)
 *
 * Credenciais via .env:
 *   IOB_EMAIL=seu@email.com
 *   IOB_PASSWORD=suasenha
 */

import { readFileSync, existsSync, mkdirSync, statSync, unlinkSync } from "fs";
import { resolve, join } from "path";
import { createInterface } from "readline";
import { chromium } from "playwright";

// ─── .env ─────────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const URL_NF = "https://app.iob.com.br/app/ext/documentos-fiscais/";

// ─── Menu interativo via readline ─────────────────────────────────────────────
function prompt(rl, pergunta) {
  return new Promise((resolve) => rl.question(pergunta, resolve));
}

async function menu(rl, titulo, opcoes) {
  console.log(`\n${titulo}`);
  opcoes.forEach((o, i) => console.log(`  ${i + 1}. ${o}`));
  while (true) {
    const r = (await prompt(rl, `  Escolha [1-${opcoes.length}]: `)).trim();
    const n = parseInt(r);
    if (n >= 1 && n <= opcoes.length) return n - 1;
    console.log(`  Digite um número entre 1 e ${opcoes.length}.`);
  }
}

function gerarMeses() {
  const meses = [];
  const hoje = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
    const nome = d.toLocaleString("pt-BR", { month: "long", year: "numeric" });
    meses.push({ label: nome.charAt(0).toUpperCase() + nome.slice(1), start, end });
  }
  return meses;
}

// ─── Args / modo interativo ────────────────────────────────────────────────────
async function parseArgs() {
  const args = process.argv.slice(2);
  const get = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null; };
  const has = (f) => args.includes(f);

  // Modo flags: --start e --end fornecidos
  if (get("--start") && get("--end")) {
    const tipo = get("--tipo") || "NFSe";
    return {
      start:       get("--start"),
      end:         get("--end"),
      tipo,
      aba:         get("--aba")     || (tipo === "NFe" ? "Entrada" : "Tomada"),
      empresa:     get("--empresa") || null,
      todas:       has("--todas"),
      outDir:      get("--out")     || "./downloads/nf",
      visible:     has("--visible"),
      sessionFile: ".iob-session.json",
    };
  }

  // Modo interativo
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log("\n========================================");
  console.log("  IOB — Download de Notas Fiscais");
  console.log("========================================");

  try {
    // Tipo
    const tipos = ["NFSe", "NFe"];
    const tipoIdx = await menu(rl, "Tipo de documento:", tipos);
    const tipo = tipos[tipoIdx];

    // Aba
    const abas = tipo === "NFSe"
      ? ["Tomada", "Prestada"]
      : ["Entrada", "Saída", "Transporte", "Citada", "SEFAZ"];
    const abaIdx = await menu(rl, "Aba:", abas);
    const aba = abas[abaIdx];

    // Período
    const meses = gerarMeses();
    const mesIdx = await menu(rl, "Período:", meses.map(m => m.label));
    const { start, end } = meses[mesIdx];

    // Empresas
    const empOpcoes = ["Todas as empresas", "Empresa específica", "Empresa já selecionada na tela"];
    const empIdx = await menu(rl, "Empresas:", empOpcoes);
    let empresa = null;
    let todas = false;
    if (empIdx === 0) {
      todas = true;
    } else if (empIdx === 1) {
      empresa = (await prompt(rl, "\n  Nome ou CNPJ da empresa: ")).trim();
    }

    // Browser visível
    const visOpcoes = ["Sim (recomendado no 1º login)", "Não (headless)"];
    const visIdx = await menu(rl, "Abrir browser visível?", visOpcoes);
    const visible = visIdx === 0;

    console.log("\n----------------------------------------");
    console.log(`  Tipo:    ${tipo}`);
    console.log(`  Aba:     ${aba}`);
    console.log(`  Período: ${start} → ${end}`);
    console.log(`  Empresa: ${todas ? "Todas" : empresa ?? "Atual"}`);
    console.log(`  Browser: ${visible ? "Visível" : "Headless"}`);
    console.log("----------------------------------------\n");

    rl.close();
    return { start, end, tipo, aba, empresa, todas, outDir: "./downloads/nf", visible, sessionFile: ".iob-session.json" };

  } catch (err) {
    rl.close();
    throw err;
  }
}

function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }

// YYYY-MM-DD → DD/MM/YYYY
function fmtDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function slugify(str) {
  return str.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").slice(0, 50);
}

// ─── Fluxo principal ──────────────────────────────────────────────────────────
async function run() {
  const { start, end, tipo, aba, empresa, todas, outDir, visible, sessionFile } = await parseArgs();

  const email    = process.env.IOB_EMAIL;
  const password = process.env.IOB_PASSWORD;
  if (!email || !password) {
    console.error("Erro: defina IOB_EMAIL e IOB_PASSWORD no .env");
    process.exit(1);
  }

  const outResolved = resolve(outDir);
  if (!existsSync(outResolved)) { mkdirSync(outResolved, { recursive: true }); log(`Pasta criada: ${outResolved}`); }

  const sessionPath = resolve(sessionFile);
  const hasSession  = existsSync(sessionPath);

  // Headless automático quando sessão existe — mais rápido e sem janela
  // Visível só quando --visible for passado OU não houver sessão (precisa do CAPTCHA)
  const headless = hasSession && !visible;

  log(`Tipo: ${tipo} | aba: ${aba} | período: ${start} → ${end}`);
  if (todas)    log("Modo: todas as empresas");
  if (empresa)  log(`Empresa: ${empresa}`);
  log(`Browser: ${headless ? "headless (sessão ativa)" : "visível"}`);

  const browser = await chromium.launch({ headless, slowMo: 0 });
  const context  = await browser.newContext({
    storageState:    hasSession ? sessionPath : undefined,
    acceptDownloads: true,
    permissions:     [],
  });
  const page = await context.newPage();


  try {
    // ── 1. Abrir app e fazer login se necessário ──────────────────────────────
    log(`Abrindo ${URL_NF}...`);
    await page.goto(URL_NF, { waitUntil: "domcontentloaded", timeout: 30000 });

    const needsLogin = await page.waitForSelector("#username", { timeout: 15000 })
      .then(() => true).catch(() => false);

    if (needsLogin) {
      if (headless) {
        // Sessão expirou — reabre visível para o CAPTCHA e salva nova sessão
        log("⚠  Sessão expirada. Reabrindo browser visível para novo login...");
        await browser.close();
        const b2      = await chromium.launch({ headless: false, slowMo: 0 });
        const ctx2    = await b2.newContext({ acceptDownloads: true, permissions: [] });
        const page2   = await ctx2.newPage();
        await page2.goto(URL_NF, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page2.waitForSelector("#username", { timeout: 10000 });
        await page2.fill("#username", email);
        await page2.fill("#password", password);
        log("✋ Resolva o reCAPTCHA e clique em 'Entrar'. Aguardando (máx. 3 min)...");
        await page2.waitForURL((u) => u.href.includes("app.iob.com.br/app/"), { timeout: 180000 });
        await page2.waitForLoadState("networkidle", { timeout: 30000 });
        await ctx2.storageState({ path: sessionPath });
        await b2.close();
        log("Nova sessão salva. Reinicie o script.");
        process.exit(0);
      }
      log("Tela de login detectada.");
      await page.fill("#username", email);
      await page.fill("#password", password);
      log("✋ Credenciais preenchidas. Resolva o reCAPTCHA e clique em 'Entrar'.");
      log("   Aguardando redirecionamento (máx. 3 min)...");
      await page.waitForURL((u) => u.href.includes("app.iob.com.br/app/"), { timeout: 180000 });
      await page.waitForLoadState("networkidle", { timeout: 30000 });
      log("Login concluído.");
      await context.storageState({ path: sessionPath });
      log(`Sessão salva → ${sessionPath}`);
      if (!page.url().includes("documentos-fiscais")) {
        await page.goto(URL_NF, { waitUntil: "networkidle", timeout: 30000 });
      }
    } else {
      log("Sessão válida.");
      await page.waitForLoadState("networkidle", { timeout: 30000 });
    }

    // ── 2. Obter referência ao iframe ─────────────────────────────────────────
    log("Aguardando iframe carregar...");
    await page.waitForSelector("#root > iframe", { timeout: 20000 });
    const frame = page.frameLocator("#root > iframe");

    // Aguarda o top-bar dentro do iframe (confirma que o iframe carregou)
    await frame.locator("div.top-bar").waitFor({ timeout: 20000 });
    log("Iframe carregado.");

    // ── Banner de cookies — aceita automaticamente se aparecer ───────────────
    const cookieBtn = page.locator('span.cc-dismiss, span[aria-label="Aceitar"]').first();
    if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cookieBtn.click();
      log("Banner de cookies aceito.");
    }

    // ── 3. Coletar lista de empresas ──────────────────────────────────────────
    log("Abrindo dropdown de empresas...");
    await frame.locator("div.top-bar").click();
    await page.waitForTimeout(600);

    const empresaBtns = frame.locator("div#multisearch-empresa > button");
    const totalEmpresas = await empresaBtns.count();
    log(`${totalEmpresas} empresa(s) encontrada(s).`);

    // Monta lista de nomes
    const nomes = [];
    for (let i = 0; i < totalEmpresas; i++) {
      const txt = (await empresaBtns.nth(i).textContent() || "").trim();
      nomes.push(txt);
    }

    // Fecha dropdown
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // ── 4. Determina quais empresas processar ─────────────────────────────────
    let indices = [];
    if (!todas && !empresa) {
      // Sem filtro: usa a empresa já selecionada (não abre o dropdown)
      indices = [-1]; // -1 = não trocar empresa
    } else if (empresa) {
      const filtroLower = empresa.toLowerCase();
      const idx = nomes.findIndex(n => n.toLowerCase().includes(filtroLower));
      if (idx === -1) {
        log(`⚠  Empresa "${empresa}" não encontrada. Disponíveis:\n` + nomes.map((n, i) => `  ${i}: ${n}`).join("\n"));
        process.exitCode = 1;
        return;
      }
      indices = [idx];
    } else {
      indices = nomes.map((_, i) => i);
    }

    // ── 5. Processa cada empresa ──────────────────────────────────────────────
    for (const idx of indices) {
      const nomeEmpresa = idx === -1 ? "(empresa atual)" : nomes[idx];
      log(`\n── ${nomeEmpresa}`);

      // Seleciona empresa no dropdown (se necessário)
      if (idx !== -1) {
        await frame.locator("div.top-bar").click();
        await empresaBtns.first().waitFor({ state: "visible", timeout: 5000 });

        // dispatchEvent garante que o evento de seleção é disparado mesmo com overlays
        await empresaBtns.nth(idx).dispatchEvent("click");

        // Aguarda o dropdown fechar como confirmação da seleção
        await empresaBtns.first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(500);
        log(`Empresa selecionada: ${nomeEmpresa}`);
      }

      try {
        await exportarNF(page, frame, { start, end, tipo, aba, outResolved, nomeEmpresa });
      } catch (err) {
        log(`⚠  Falhou para "${nomeEmpresa}": ${err.message}`);
      }

      // Pequena pausa entre empresas para o iframe estabilizar
      if (indices.length > 1) {
        await page.waitForTimeout(300);
      }
    }

    log(`\nConcluído! Arquivos em: ${outResolved}`);

  } catch (err) {
    log(`❌ Erro: ${err.message}`);
    if (visible) { log("Aguardando 30s para inspeção..."); await page.waitForTimeout(30000); }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

// ─── Exporta NFSe de uma empresa já selecionada ───────────────────────────────
async function exportarNF(page, frame, { start, end, tipo, aba, outResolved, nomeEmpresa }) {
  // Mapa de tipo → seletor do botão no iframe
  // CALIBRAÇÃO: se adicionar novos tipos, inspecione com F12 e adicione aqui
  const tipoBtnMap = {
    NFSe: ".d-flex:nth-child(2) > .btn:nth-child(8)",
    NFe:  ".d-flex:nth-child(2) > .btn:nth-child(1)", // ⚠ confirme com F12
  };
  const tipoBtnSel = tipoBtnMap[tipo] ?? tipoBtnMap.NFSe;

  log(`Selecionando ${tipo}...`);
  await frame.locator(tipoBtnSel).dispatchEvent("click");

  // Mapa de aba → seletor
  const abaMap = {
    Tomada:     "button#nfse-tomador-tab",
    Prestada:   "button#nfse-prestador-tab",
    Entrada:    "[role='tab']:has-text('Entrada')",
    Saida:      "[role='tab']:has-text('Saída')",
    Transporte: "[role='tab']:has-text('Transporte')",
    Citada:     "[role='tab']:has-text('Citada')",
    SEFAZ:      "[role='tab']:has-text('SEFAZ')",
  };
  const abaSelector = abaMap[aba] ?? `[role='tab']:has-text('${aba}')`;

  // Aguarda a aba aparecer (confirma que o tipo foi carregado) e clica
  await frame.locator(abaSelector).waitFor({ state: "visible", timeout: 10000 });
  await frame.locator(abaSelector).dispatchEvent("click");

  // Aguarda o botão de período aparecer (confirma que a aba carregou)
  await frame.locator("button#dateRange").waitFor({ state: "visible", timeout: 10000 });

  // Abre o date range picker
  log(`Configurando período: ${fmtDate(start)} a ${fmtDate(end)}...`);
  await frame.locator("button#dateRange").dispatchEvent("click");

  // Aguarda o preset list aparecer
  const presetList = frame.locator("ul:nth-child(1) > li:nth-child(4)");
  await presetList.waitFor({ state: "visible", timeout: 5000 });

  // Tenta inputs de data customizada; se não houver, usa preset
  const startIn = frame.locator('input[placeholder*="nicio"], input[placeholder*="De"], input[name*="start"], input[id*="start"]').first();
  const temInputs = await startIn.isVisible({ timeout: 500 }).catch(() => false);
  if (temInputs) {
    const endIn = frame.locator('input[placeholder*="fim"], input[placeholder*="Até"], input[name*="end"], input[id*="end"]').first();
    await startIn.click({ clickCount: 3 });
    await startIn.fill(fmtDate(start));
    await endIn.click({ clickCount: 3 });
    await endIn.fill(fmtDate(end));
    const confirmBtn = frame.locator('button:has-text("Confirmar"), button:has-text("Aplicar"), button:has-text("OK")').first();
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click();
    } else {
      await page.keyboard.press("Enter");
    }
  } else {
    await presetList.click();
  }

  // Aguarda a consulta completar: espera networkidle após aplicar o filtro
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  // Aguarda o botão exportar ficar disponível
  await frame.locator("button#btnExportar").waitFor({ state: "visible", timeout: 10000 });
  log("Período configurado.");

  // Exportar — captura o evento de download junto com o clique no modal
  log('Exportando...');
  await frame.locator("button#btnExportar").dispatchEvent("click");

  const confirmModal = frame.locator(".modal-confirm .btn-primary");
  const temModal = await confirmModal.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false);

  const [dl] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    temModal ? confirmModal.click() : Promise.resolve(),
  ]);
  await salvarDownload(dl, outResolved, start, end, nomeEmpresa);
}

async function salvarDownload(download, outDir, start, end, nomeEmpresa) {
  const suffix = nomeEmpresa ? `-${slugify(nomeEmpresa)}` : "";
  const name   = download.suggestedFilename() || `nfse-iob-${start}-${end}${suffix}.csv`;
  const dest   = join(outDir, name);

  // Pula se o arquivo já existe (evita duplicatas em re-execuções)
  if (existsSync(dest)) {
    log(`⏭  Já existe, pulando: ${name}`);
    await download.cancel();
    return;
  }

  await download.saveAs(dest);

  // Descarta arquivo vazio (empresa sem dados no período)
  if (statSync(dest).size === 0) {
    unlinkSync(dest);
    log(`⚠  Sem dados no período para: ${nomeEmpresa ?? "empresa"} — arquivo descartado.`);
    return;
  }

  log(`✅ Salvo: ${dest}`);
}

run();
