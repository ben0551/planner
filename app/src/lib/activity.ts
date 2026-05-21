import { getClient } from "@/lib/pocketbase";

export function logActivity(
  householdId: string,
  userId: string,
  description: string,
  entityType?: string,
  entityId?: string,
) {
  getClient().collection("activity_log").create({
    household: householdId,
    user: userId || undefined,
    description,
    entity_type: entityType,
    entity_id: entityId,
  }).catch(() => {});
}
