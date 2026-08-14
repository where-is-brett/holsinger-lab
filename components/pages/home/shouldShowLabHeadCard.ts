/**
 * `showLabHeadOnHome` unset (null/undefined) means on -- the live
 * `settings` singleton predates this field, so every already-published
 * document has no key for it, and `!== false` is what keeps that document
 * showing the card rather than silently hiding it after deploy.
 */
export function shouldShowLabHeadCard(settings: {
  labHead?: { _id: string } | null
  showLabHeadOnHome?: boolean | null
}): boolean {
  return Boolean(settings.labHead) && settings.showLabHeadOnHome !== false
}
