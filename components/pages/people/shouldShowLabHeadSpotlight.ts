/**
 * `showLabHeadOnPeople` unset (null/undefined) means on -- mirrors
 * `shouldShowLabHeadCard`'s backward-compat reasoning: the live `settings`
 * singleton predates this field, so every already-published document has no
 * key for it, and `!== false` is what keeps the spotlight showing rather
 * than silently hiding it after deploy.
 */
export function shouldShowLabHeadSpotlight(settings: {
  labHead?: { _id: string } | null
  showLabHeadOnPeople?: boolean | null
}): boolean {
  return Boolean(settings.labHead) && settings.showLabHeadOnPeople !== false
}
