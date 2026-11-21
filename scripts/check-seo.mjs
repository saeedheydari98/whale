import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const all = args.includes("--all");
const suppliedOrigin = args.find((arg) => /^https?:\/\//.test(arg)) || process.env.SEO_BASE_URL;
const requestedPaths = args.filter((arg) => arg.startsWith("/") && !arg.startsWith("//"));
const staticPaths = ["/", "/products", "/categories", "/about-wahle"];
const privatePath = /^\/(panel|cart|search|swagger|api)(\/|$)/;
const reportDirectory = resolve("artifacts/seo", new Date().toISOString().replace(/[:.]/g, "-"));
const results = [];
let server;
let browser;
let serverOutput = "";

async function availablePort() {
  const socket = createServer();
  await new Promise((done, reject) => socket.once("error", reject).listen(0, "127.0.0.1", done));
  const port = socket.address().port;
  await new Promise((done) => socket.close(done));
  return port;
}

async function getText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
  return response.text();
}

async function startProductionServer() {
  await readFile(".next/BUILD_ID", "utf8").catch(() => {
    throw new Error("Build the current code with npm run build before running check:seo.");
  });
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const capture = (chunk) => { serverOutput = (serverOutput + chunk.toString()).slice(-12000); };
  server.stdout.on("data", capture);
  server.stderr.on("data", capture);
  let launchError;
  server.on("error", (error) => { launchError = error; });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (launchError) throw launchError;
    if (server.exitCode !== null) throw new Error(`Production server stopped:\n${serverOutput}`);
    try {
      await getText(`${origin}/robots.txt`);
      return origin;
    } catch {
      await delay(500);
    }
  }
  throw new Error(`Production server did not become ready:\n${serverOutput}`);
}

function routeFamily(pathname) {
  if (staticPaths.includes(pathname)) return pathname;
  return pathname.replace(/\/[^/]+$/, "/[slug]");
}

async function inspectPage(page, url, expectedNoindex) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  assert.equal(response?.status(), 200, `${url}: page must return HTTP 200`);
  if (!expectedNoindex) assert.ok(!/noindex|none/i.test(response.headers()["x-robots-tag"] || ""), `${url}: X-Robots-Tag blocks indexing`);
  await page.waitForFunction(() => document.documentElement.dataset.themeReady === "true", undefined, { timeout: 60_000 });
  await page.locator("[data-app-content] h1").waitFor({ state: "visible", timeout: 60_000 });
  const metadata = await page.evaluate(() => {
    const content = (name) => document.head.querySelector(`meta[name="${name}"]`)?.content || "";
    return {
      title: document.title.trim(),
      description: content("description"),
      robots: content("robots"),
      canonicals: [...document.head.querySelectorAll('link[rel="canonical"]')].map((link) => link.href),
      headings: [...document.querySelectorAll("h1")].map((heading) => heading.textContent.trim()),
      openGraph: document.head.querySelector('meta[property="og:title"]')?.content,
      twitter: content("twitter:card"),
      missingAlt: [...document.images].filter((image) => !image.hasAttribute("alt")).length,
      invalidLinks: [...document.querySelectorAll("a")].filter((link) => !link.getAttribute("href") || /^(javascript:|#$)/i.test(link.getAttribute("href"))).length,
      structuredData: [...document.querySelectorAll('script[type="application/ld+json"]')].map((script) => JSON.parse(script.textContent)),
    };
  });
  assert.ok(metadata.title, `${url}: title is missing`);
  assert.ok(metadata.description, `${url}: description is missing from head`);
  assert.ok(metadata.description.length >= 150 && metadata.description.length <= 160, `${url}: description length is ${metadata.description.length}, expected 150–160`);
  assert.equal(/noindex|none/i.test(metadata.robots), expectedNoindex, `${url}: unexpected indexing policy`);
  assert.equal(metadata.canonicals.length, 1, `${url}: expected one canonical`);
  const canonical = new URL(metadata.canonicals[0]);
  assert.ok(["http:", "https:"].includes(canonical.protocol), `${url}: invalid canonical protocol`);
  assert.equal(decodeURI(canonical.pathname).replace(/\/$/, ""), decodeURI(new URL(url).pathname).replace(/\/$/, ""), `${url}: canonical points to another page`);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) {
    assert.ok(!["localhost", "127.0.0.1", "[::1]"].includes(canonical.hostname), `${url}: public canonical points to localhost`);
  }
  assert.equal(metadata.headings.length, 1, `${url}: expected one h1`);
  assert.ok(metadata.headings[0], `${url}: empty h1`);
  assert.ok(metadata.openGraph && metadata.twitter, `${url}: sharing metadata is missing`);
  assert.equal(metadata.missingAlt, 0, `${url}: images without alt`);
  assert.equal(metadata.invalidLinks, 0, `${url}: non-crawlable anchors`);
  assert.ok(metadata.structuredData.length, `${url}: JSON-LD is missing`);
  return metadata;
}

async function audit(url, mode, outputPath) {
  const flags = ["node_modules/lighthouse/cli/index.js", url, "--only-categories=seo", "--chrome-flags=--headless=new", "--output=json", "--output=html", `--output-path=${outputPath}`, "--quiet"];
  if (mode === "desktop") flags.push("--preset=desktop");
  await new Promise((done, reject) => {
    const child = spawn(process.execPath, flags, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const capture = (chunk) => { output = (output + chunk.toString()).slice(-12000); };
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Lighthouse timed out for ${url} (${mode})`)); }, 180_000);
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) done();
      else reject(new Error(`Lighthouse failed for ${url} (${mode}): ${output}`));
    });
  });
  const report = JSON.parse(await readFile(`${outputPath}.report.json`, "utf8"));
  assert.ok(!report.runtimeError, report.runtimeError?.message);
  const failedAudits = report.categories.seo.auditRefs
    .filter(({ weight, id }) => weight > 0 && report.audits[id].score !== 1 && !["notApplicable", "manual"].includes(report.audits[id].scoreDisplayMode))
    .map(({ id }) => ({ id, title: report.audits[id].title, explanation: report.audits[id].explanation }));
  const blockedByRobots = (report.audits["is-crawlable"].details?.items || [])
    .some(({ source }) => source?.url && new URL(source.url).pathname === "/robots.txt");
  return { url, mode, score: report.categories.seo.score, failedAudits, blockedByRobots, report: `${outputPath}.report.html`, lighthouseVersion: report.lighthouseVersion };
}

try {
  await mkdir(reportDirectory, { recursive: true });
  const origin = new URL(suppliedOrigin || await startProductionServer()).origin;
  const sitemap = await getText(`${origin}/sitemap.xml`);
  const sitemapPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1].replaceAll("&amp;", "&")).pathname);
  assert.ok(sitemapPaths.length, "Sitemap has no URLs");
  assert.ok(sitemapPaths.every((path) => !privatePath.test(path)), "Sitemap contains a private/noindex route");
  for (const path of staticPaths) assert.ok(sitemapPaths.includes(path), `Sitemap is missing ${path}`);
  const families = new Map();
  for (const path of sitemapPaths) if (!families.has(routeFamily(path))) families.set(routeFamily(path), path);
  const paths = [...new Set([...staticPaths, ...(all ? sitemapPaths : families.values()), "/cart", ...requestedPaths])];
  console.log(`SEO gate: ${paths.length} pages, mobile + desktop. Public pages require 100/100; intentional noindex is reported separately. ${origin}`);
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const path of paths) {
    const url = new URL(path, origin).href;
    const expectedNoindex = privatePath.test(path);
    try {
      await inspectPage(page, url, expectedNoindex);
      await page.goto("about:blank");
      const key = createHash("sha256").update(url).digest("hex").slice(0, 12);
      // Lighthouse requires exclusive machine resources for reliable collection.
      for (const mode of ["mobile", "desktop"]) {
        const result = await audit(url, mode, resolve(reportDirectory, `${key}-${mode}`));
        result.expectedNoindex = expectedNoindex;
        result.passed = expectedNoindex
          ? result.failedAudits.length === 1 && result.failedAudits[0].id === "is-crawlable" && (path !== "/cart" || !result.blockedByRobots)
          : result.score === 1 && result.failedAudits.length === 0;
        results.push(result);
        console.log(`${result.passed ? "PASS" : "FAIL"} ${result.mode} ${decodeURI(path)}: ${Math.round((result.score ?? 0) * 100)}/100${expectedNoindex ? " (intentional noindex; all other audits must pass)" : ""}`);
      }
    } catch (error) {
      results.push({ url, error: error.message });
      console.error(`FAIL ${decodeURI(path)}: ${error.message}`);
    }
    await writeFile(resolve(reportDirectory, "summary.json"), JSON.stringify({ origin, all, results }, null, 2));
  }
  const failed = results.filter((result) => !result.passed);
  console.log(`Reports: ${reportDirectory}`);
  if (failed.length) {
    console.error(JSON.stringify(failed, null, 2));
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server?.kill();
  if (serverOutput) await writeFile(resolve(reportDirectory, "production-server.log"), serverOutput);
}
