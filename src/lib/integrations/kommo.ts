/**
 * Kommo CRM API integration for Amatu ERP
 *
 * Used to move contacts/leads between stages when orders are dispatched.
 * This triggers Kommo's WhatsApp automation to notify clients.
 *
 * Full implementation in Sprint 8.
 */

const KOMMO_DOMAIN = process.env.KOMMO_ACCOUNT_DOMAIN;
const KOMMO_TOKEN = process.env.KOMMO_ACCESS_TOKEN;

/**
 * Moves a lead to a specific stage in Kommo's pipeline.
 */
export async function moveLeadToStage(
  kommoLeadId: string,
  stageId: string
): Promise<boolean> {
  if (!KOMMO_DOMAIN || !KOMMO_TOKEN) {
    console.error("[Kommo] Missing KOMMO_ACCOUNT_DOMAIN or KOMMO_ACCESS_TOKEN");
    return false;
  }

  try {
    const response = await fetch(
      `https://${KOMMO_DOMAIN}/api/v4/leads/${kommoLeadId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${KOMMO_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status_id: parseInt(stageId, 10),
        }),
      }
    );

    if (!response.ok) {
      console.error(
        `[Kommo] Failed to move lead ${kommoLeadId} to stage ${stageId}:`,
        response.status,
        await response.text()
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Kommo] Error moving lead:", error);
    return false;
  }
}
