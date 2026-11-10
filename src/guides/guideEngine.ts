import type { GuideDefinition, GuideStep, GuideStepId } from './s3IamGuide'

export type GuideState = {
  activeStepIndex: number
  completedStepIds: GuideStepId[]
}

export function createGuideState(_guide: GuideDefinition): GuideState {
  return {
    activeStepIndex: 0,
    completedStepIds: [],
  }
}

export function currentStep(guide: GuideDefinition, state: GuideState): GuideStep {
  return guide.steps[state.activeStepIndex]
}

export function goNext(guide: GuideDefinition, state: GuideState): GuideState {
  return {
    ...state,
    activeStepIndex: Math.min(state.activeStepIndex + 1, guide.steps.length - 1),
  }
}

export function goPrevious(_guide: GuideDefinition, state: GuideState): GuideState {
  return {
    ...state,
    activeStepIndex: Math.max(state.activeStepIndex - 1, 0),
  }
}

export function markDone(state: GuideState, stepId: GuideStepId): GuideState {
  if (state.completedStepIds.includes(stepId)) {
    return state
  }

  return {
    ...state,
    completedStepIds: [...state.completedStepIds, stepId],
  }
}
