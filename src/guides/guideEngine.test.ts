import { createGuideState, currentStep, goNext, goPrevious, markDone } from './guideEngine';
import { s3IamGuide } from './s3IamGuide';

it('starts at the first guide step', () => {
  const state = createGuideState(s3IamGuide);
  expect(currentStep(s3IamGuide, state).id).toBe('objective');
});

it('moves forward and backward through steps', () => {
  const state = createGuideState(s3IamGuide);
  const next = goNext(s3IamGuide, state);
  expect(currentStep(s3IamGuide, next).id).toBe('bucket');
  expect(currentStep(s3IamGuide, goPrevious(s3IamGuide, next)).id).toBe('objective');
});

it('does not move beyond final step', () => {
  let state = createGuideState(s3IamGuide);
  for (let index = 0; index < 10; index += 1) {
    state = goNext(s3IamGuide, state);
  }
  expect(currentStep(s3IamGuide, state).id).toBe('review');
});

it('tracks completed step ids', () => {
  const state = markDone(createGuideState(s3IamGuide), 'bucket');
  expect(state.completedStepIds).toContain('bucket');
});
