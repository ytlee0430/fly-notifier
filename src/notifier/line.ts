import * as line from '@line/bot-sdk';
import type { FlightOffer } from '../providers/types.js';
import { logger } from '../utils/logger.js';

function formatOffer(offer: FlightOffer): string {
  const stopsText = offer.stops === 0 ? '直飛' : `轉機 ${offer.stops} 次`;
  return [
    `✈️ ${offer.origin} → ${offer.destination}`,
    `📅 ${offer.departureDate}`,
    `🕐 出發 ${offer.departureTime} → 抵達 ${offer.arrivalTime}`,
    `🏢 ${offer.airline} ${offer.flightNumber}（${stopsText}）`,
    `💰 NT$ ${offer.totalPriceTWD.toLocaleString()} (${offer.currency})`,
    `🔗 ${offer.bookingUrl}`,
  ].join('\n');
}

function formatMessage(offers: FlightOffer[]): string {
  const header = `🚨 發現 ${offers.length} 筆低價機票！\n${'─'.repeat(30)}`;
  const body = offers.map(formatOffer).join(`\n${'─'.repeat(30)}\n`);
  return `${header}\n${body}`;
}

export interface NotifyResult {
  success: boolean;
  sent: number;
}

export async function sendLowPriceAlert(offers: FlightOffer[]): Promise<NotifyResult> {
  if (offers.length === 0) {
    return { success: true, sent: 0 };
  }

  const channelAccessToken = process.env['LINE_CHANNEL_ACCESS_TOKEN'] ?? '';
  const userId = process.env['LINE_USER_ID'] ?? '';

  if (!channelAccessToken || !userId) {
    logger.warn({ module: 'line-notifier', action: 'sendLowPriceAlert', message: 'Missing LINE credentials — skipping' });
    return { success: false, sent: 0 };
  }

  const client = new line.messagingApi.MessagingApiClient({ channelAccessToken });
  const message = formatMessage(offers);

  try {
    await client.pushMessage({
      to: userId,
      messages: [{ type: 'text', text: message }],
    });

    logger.info({
      module: 'line-notifier',
      action: 'sendLowPriceAlert',
      sent: offers.length,
    });

    return { success: true, sent: offers.length };
  } catch (error) {
    logger.error({
      module: 'line-notifier',
      action: 'sendLowPriceAlert',
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, sent: 0 };
  }
}

export async function sendMorningReport(
  summary: Array<{ route: string; lowestPrice: number | null; bestOffer: FlightOffer | null }>,
): Promise<NotifyResult> {
  const channelAccessToken = process.env['LINE_CHANNEL_ACCESS_TOKEN'] ?? '';
  const userId = process.env['LINE_USER_ID'] ?? '';

  if (!channelAccessToken || !userId) {
    logger.warn({ module: 'line-notifier', action: 'sendMorningReport', message: 'Missing LINE credentials — skipping' });
    return { success: false, sent: 0 };
  }

  const client = new line.messagingApi.MessagingApiClient({ channelAccessToken });

  const lines: string[] = ['📊 每日航班早報\n' + '─'.repeat(30)];
  for (const item of summary) {
    if (item.bestOffer && item.lowestPrice !== null) {
      const offer = item.bestOffer;
      const stopsText = offer.stops === 0 ? '直飛' : `轉機 ${offer.stops} 次`;
      lines.push(
        `${offer.origin}→${offer.destination}: NT$${item.lowestPrice.toLocaleString()} | ${offer.airline} ${offer.flightNumber} | ${offer.departureTime} (${stopsText})`,
      );
    } else {
      lines.push(`${item.route}: 無資料`);
    }
  }

  const message = lines.join('\n');

  try {
    await client.pushMessage({
      to: userId,
      messages: [{ type: 'text', text: message }],
    });

    logger.info({ module: 'line-notifier', action: 'sendMorningReport', routes: summary.length });
    return { success: true, sent: 1 };
  } catch (error) {
    logger.error({
      module: 'line-notifier',
      action: 'sendMorningReport',
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, sent: 0 };
  }
}

export { formatOffer, formatMessage };
