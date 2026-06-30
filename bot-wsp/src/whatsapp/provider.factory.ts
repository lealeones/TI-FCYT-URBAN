// src/whatsapp/provider.factory.ts
import { createProvider } from '@builderbot/bot';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { BaileyGlobalVendorArgs } from '@builderbot/provider-baileys/dist/type.js';
import { SherpaProvider } from '@builderbot/provider-sherpa';
import { Logger } from '@nestjs/common';
import { BaileysProvider as AurikProvider } from 'aurik3-builderbot-baileys-custom';
import { fetchLatestBaileysVersion } from 'baileys';

// ─── Provider type union ──────────────────────────────────────────────────────
export type AnyProvider = BaileysProvider | SherpaProvider | AurikProvider;

/**
 * Versión hardcodeada como fallback (fix para el error 405 de WA – issue #2370).
 * WhatsApp rechaza Platform.WEB con versiones antiguas; esta es la última conocida
 * que funciona correctamente.
 */
const FALLBACK_WA_VERSION: [number, number, number] = [2, 3000, 1_033_893_291];

// ─── Async version resolver ───────────────────────────────────────────────────
/**
 * Obtiene la última versión de WA Web usando fetchLatestBaileysVersion (baileys).
 * Si la petición falla usa FALLBACK_WA_VERSION para no bloquear el arranque.
 *
 * Ref: https://github.com/WhiskeySockets/Baileys/issues/2370
 */
async function resolveWaVersion(logger: Logger): Promise<[number, number, number]> {
  try {
    const { version } = await fetchLatestBaileysVersion();
    logger.log(`📱 WA version obtenida remotamente: ${version.join('.')}`);
    return version as [number, number, number];
  } catch (err: any) {
    logger.warn(
      `⚠️  fetchLatestBaileysVersion falló (${err?.message}), usando fallback: ${FALLBACK_WA_VERSION.join('.')}`,
    );
    return FALLBACK_WA_VERSION;
  }
}

// ─── Baileys optimised config ─────────────────────────────────────────────────
/**
 * Construye la configuración optimizada para Baileys/Aurik.
 * @param version - Versión de WA Web resuelta de forma asíncrona.
 *
 * Fixes aplicados (ref: https://github.com/WhiskeySockets/Baileys/issues/2370):
 *  - `browser`: simula Chrome en Windows para evitar bloqueos de WA.
 *  - `version`: usa la versión más reciente de WA Web en lugar de la embebida en
 *    la librería (que puede estar desactualizada y causar error 405).
 */
export function buildSafeBaileysConfig(
  version: [number, number, number] = FALLBACK_WA_VERSION,
): Partial<BaileyGlobalVendorArgs> {
  return {
    // ── WA version + browser fingerprint ───────────────────────────────────
    version,
    browser: ['Chrome', 'Windows', '110.0.5481.177'],

    // ── Performance / resource optimisation ────────────────────────────────
    groupsIgnore: true,
    readStatus: false,
    writeMyself: 'none' as const,
    experimentalStore: true,
    timeRelease: 10_800_000,           // liberar caché cada 3 h

    // ── Connection tuning ───────────────────────────────────────────────────
    markOnlineOnConnect: false,
    syncFullHistory: false,
    fireInitQueries: false,
    shouldSyncHistoryMessage: () => false,
    shouldIgnoreJid: (jid: string) =>
      jid.endsWith('@g.us') ||
      !jid.includes('@') ||
      jid.endsWith('@broadcast') ||
      jid.endsWith('@newsletter'),
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 5,
    msgRetryCounterCache: new Map<string, number>(),
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 20_000,
  };
}

// ─── Provider factory ─────────────────────────────────────────────────────────
/**
 * Instancia el provider de BuilderBot según la variable de entorno PROVIDER.
 *
 * Valores soportados:
 *  - "baileys"  → @builderbot/provider-baileys
 *  - "aurik"    → aurik3-builderbot-baileys-custom
 *  - "sherpa"   → @builderbot/provider-sherpa  (default)
 */
export async function createAdapterProvider(logger: Logger): Promise<AnyProvider> {
  const providerEnv = (process.env.PROVIDER ?? 'sherpa').toLowerCase();
  logger.log(`🔌 Provider seleccionado: "${providerEnv}"`);

  if (providerEnv === 'baileys' || providerEnv === 'aurik') {
    const version = await resolveWaVersion(logger);
    const config = buildSafeBaileysConfig(version);

    if (providerEnv === 'baileys') {
      logger.log('Usando @builderbot/provider-baileys');
      return createProvider(BaileysProvider, config) as AnyProvider;
    }

    logger.log('Usando aurik3-builderbot-baileys-custom');
    return createProvider(AurikProvider, config as any) as AnyProvider;
  }

  // default: sherpa
  logger.log('Usando @builderbot/provider-sherpa');
  return createProvider(SherpaProvider) as AnyProvider;
}
