/**
 * One-time banners shown after an action redirects ("?notice=key" / "?error=key").
 * Only fixed keys are accepted: nothing user-supplied (event titles, names, free text) is ever
 * put in a redirect URL, so special characters can't break the redirect and a crafted link
 * can't make the site display arbitrary text.
 */
export const FLASH = {
  event_published: "Event published and open for registration.",
  event_draft_saved: "Event saved as a draft.",
  event_saved: "Changes saved. The public event page is already up to date.",
  event_duplicated: "Duplicated as a draft. Update the date and details, then publish.",
  event_deleted: "Event deleted.",
  reg_closed: "Registration closed.",
  reg_reopened: "Registration reopened.",
  event_completed: "Event marked as completed.",
  event_cancelled: "Event cancelled.",
  checkin_ok: "Participant checked in.",
  partner_added: "Partner added.",
  partner_saved: "Partner updated.",
  partner_removed: "Partner removed.",
  role_updated: "Role updated.",
  account_deleted: "Your account and registrations have been deleted.",
  cancel_ok: "Your registration has been cancelled and your seat released.",
  err_event_missing: "That event no longer exists.",
  err_event_has_regs: "This event has registrations, so it can't be deleted. Cancel it instead to keep the records.",
  err_reg_missing: "We couldn't find that registration.",
  err_already_checked_in: "This ticket has already been checked in.",
  err_not_active: "Check-in isn't open for this event (it is a draft, completed or cancelled).",
  err_checkin_failed: "We couldn't check this participant in.",
  err_invalid_role: "Invalid role.",
  err_own_role: "You can't change your own role.",
  err_attended: "You've already checked in to this event.",
  err_cancel_failed: "We couldn't cancel that registration.",
} as const;

export type FlashKey = keyof typeof FLASH;

export function resolveFlash(value?: string): string | undefined {
  return value && Object.prototype.hasOwnProperty.call(FLASH, value) ? FLASH[value as FlashKey] : undefined;
}
