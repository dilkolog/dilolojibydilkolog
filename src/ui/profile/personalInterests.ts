/** The learner's interests: the profile's chips and the story topics, without repeats. */
export function interestsOf(settings: { profile?: { interests?: string[] }; story?: { interests?: string[]; custom?: string } } | undefined): string[] {
  return [...new Set([...(settings?.profile?.interests ?? []), ...(settings?.story?.interests ?? []), ...(settings?.story?.custom ? [settings.story.custom] : [])].map((s) => s.trim()).filter(Boolean))].slice(0, 8)
}
