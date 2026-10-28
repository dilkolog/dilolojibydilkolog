// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEntry } from '../../data/wordInput'
import type { PlanItem } from '../../engine/dailyPlan'
import type { VocabularyEntry } from '../../engine/types'
import { ExerciseRunner } from './ExerciseRunner'

vi.mock('../aiContext', () => ({
  useAi: () => ({ apiKey: 'sk-test-key', setApiKey: async () => {}, needsApproval: false }),
}))

const mockEvaluateTranslation = vi.fn()
vi.mock('../../ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../ai')>()
  return {
    ...actual,
    evaluateTranslation: (...args: unknown[]) => mockEvaluateTranslation(...args),
  }
})

let root: ReturnType<typeof createRoot> | undefined

const dummyEntry: VocabularyEntry = {
  ...createEntry(
    {
      word: 'la pomme',
      meaning: 'elma',
      partOfSpeech: 'noun',
      example: 'Je mange une pomme rouge dans la cuisine.',
      exampleTranslation: 'Mutfakta kırmızı bir elma yiyorum.',
    },
    'fr',
    new Date(),
  ),
  id: 'word-pomme',
}

const item: PlanItem = {
  kind: 'exercise',
  entryId: dummyEntry.id,
  exerciseType: 'back_translation',
  skill: 'production',
  reason: 'due',
}

beforeEach(() => {
  mockEvaluateTranslation.mockReset()
})

afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 60))))

describe('ExerciseRunner AI back_translation evaluation', () => {
  it('calls evaluateTranslation and submits with feedback and example translation on success', async () => {
    mockEvaluateTranslation.mockResolvedValueOnce({
      verdict: 'correct',
      errorType: undefined,
      corrected: 'Je mange une pomme rouge dans la cuisine.',
      feedback: 'Çok doğal ve doğru bir çeviri!',
    })

    const onAnswer = vi.fn().mockResolvedValue({
      ev: { verdict: 'correct', given: 'Je mange une pomme rouge dans la cuisine.' },
      studiedAt: new Date().toISOString(),
    })
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root!.render(
        <ExerciseRunner
          entry={dummyEntry}
          item={item}
          catalog={[dummyEntry]}
          rng={() => 0.5}
          onAnswer={onAnswer}
          onOverride={async () => null}
          onDiscard={async () => true}
          onContinue={() => {}}
          combo={0}
          listenRate={1}
          helpFor={() => null}
          onRelearn={async () => {}}
          wordState={() => undefined}
          onEntryUpdated={() => {}}
          onToggleDifficult={() => {}}
        />,
      )
    })
    await wait()

    const input = host.querySelector<HTMLInputElement>('input.answer-input')!
    expect(input).not.toBeNull()

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, 'Je mange une pomme rouge dans la cuisine.')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const form = host.querySelector('form')!
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await wait()

    expect(mockEvaluateTranslation).toHaveBeenCalledWith(
      'sk-test-key',
      dummyEntry,
      'Mutfakta kırmızı bir elma yiyorum.',
      'Je mange une pomme rouge dans la cuisine.',
      'Je mange une pomme rouge dans la cuisine.',
    )

    expect(onAnswer).toHaveBeenCalledTimes(1)
    const answerResult = onAnswer.mock.calls[0][0]
    expect(answerResult.verdict).toBe('correct')
    expect(answerResult.feedback).toContain('Çok doğal ve doğru bir çeviri!')
    expect(answerResult.feedback).toContain('Örnek çeviri: Je mange une pomme rouge dans la cuisine.')
  })
})
