/**
 * n8n webhook integration for Amatu ERP
 *
 * Builds the dispatch payload and sends it to the n8n webhook
 * which then formats and sends WhatsApp messages to couriers.
 *
 * Full implementation in Sprint 8.
 */

import type { RutaDespachoPayload } from "@/types";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

/**
 * Sends a route dispatch payload to the n8n webhook.
 */
export async function enviarRutaAN8n(
  payload: RutaDespachoPayload
): Promise<{ success: boolean; error?: string }> {
  if (!N8N_WEBHOOK_URL) {
    return { success: false, error: "N8N_WEBHOOK_URL not configured" };
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(N8N_WEBHOOK_SECRET
          ? { "X-Webhook-Secret": N8N_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `n8n responded with ${response.status}: ${await response.text()}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
