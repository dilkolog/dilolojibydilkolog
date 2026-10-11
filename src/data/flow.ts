import type { FlowItem } from '../engine/flow'

/** Every `flow/*.json` holds a list of paragraphs with connectors missing; one more file adds more. */
const FILES = import.meta.glob<FlowItem[]>('./flow/*.json', { import: 'default', eager: true })

export const flowItems: FlowItem[] = Object.values(FILES).flat()
