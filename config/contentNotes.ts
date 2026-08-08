export const contentNoteOptions = [
  { value: 'grief', label: 'Grief' },
  { value: 'loss', label: 'Loss' },
  { value: 'death', label: 'Death' },
  { value: 'medical-themes', label: 'Medical themes' },
  { value: 'pain', label: 'Pain' },
  { value: 'body-themes', label: 'Body themes' },
  { value: 'isolation', label: 'Isolation' },
  { value: 'dark-imagery', label: 'Dark imagery' },
  { value: 'high-contrast', label: 'High contrast' },
  { value: 'sensory-intensity', label: 'Sensory intensity' },
  { value: 'fatigue-themes', label: 'Fatigue themes' },
  { value: 'mobility-aids', label: 'Mobility aids' },
  { value: 'hospital-setting', label: 'Hospital / clinical setting' },
  { value: 'sleep-rest', label: 'Sleep / rest' },
  { value: 'anxiety', label: 'Anxiety' },
  { value: 'trauma-reference', label: 'Trauma reference' },
  { value: 'blood-non-graphic', label: 'Blood, non-graphic' },
  { value: 'medication', label: 'Medication' },
] as const;

export type ContentNote = typeof contentNoteOptions[number]['value'];

const contentNoteLabels = new Map<string, string>(
  contentNoteOptions.map(option => [option.value, option.label]),
);
const allowedContentNotes = new Set<string>(contentNoteOptions.map(option => option.value));

export function contentNoteLabel(value: string): string {
  return contentNoteLabels.get(value) ?? value;
}

export function normalizeContentNotes(value: unknown): ContentNote[] {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(
    value.filter((item): item is ContentNote =>
      typeof item === 'string' && allowedContentNotes.has(item),
    ),
  ));
}
