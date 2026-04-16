import type { TranslationKey } from '../i18n';

export type GuideStepId = 'objective' | 'bucket' | 'security' | 'iamPolicy' | 'review';

export type GuideStep = {
  id: GuideStepId;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  expectedPage: 'anyAws' | 's3CreateBucket' | 's3BucketSettings' | 'iamCreatePolicy';
  highlightSelector?: string;
  suggestedValues?: Record<string, string>;
};

export type GuideDefinition = {
  id: 's3-iam-app-access';
  titleKey: TranslationKey;
  steps: GuideStep[];
};

export const s3IamGuide: GuideDefinition = {
  id: 's3-iam-app-access',
  titleKey: 'guide.s3Iam.title',
  steps: [
    {
      id: 'objective',
      titleKey: 'guide.s3Iam.stepObjective.title',
      bodyKey: 'guide.s3Iam.stepObjective.body',
      expectedPage: 'anyAws'
    },
    {
      id: 'bucket',
      titleKey: 'guide.s3Iam.stepBucketName.title',
      bodyKey: 'guide.s3Iam.stepBucketName.body',
      expectedPage: 's3CreateBucket',
      highlightSelector: '[data-testid="bucket-name"], input[name="bucketName"], input[aria-label*="Bucket"]',
      suggestedValues: {
        bucketName: 'my-app-uploads-prod'
      }
    },
    {
      id: 'security',
      titleKey: 'guide.s3Iam.stepSecurity.title',
      bodyKey: 'guide.s3Iam.stepSecurity.body',
      expectedPage: 's3BucketSettings',
      highlightSelector: '[data-testid*="block-public"], input[type="checkbox"]'
    },
    {
      id: 'iamPolicy',
      titleKey: 'guide.s3Iam.stepIamPolicy.title',
      bodyKey: 'guide.s3Iam.stepIamPolicy.body',
      expectedPage: 'iamCreatePolicy',
      highlightSelector: 'textarea, [data-testid*="policy"], [role="textbox"]'
    },
    {
      id: 'review',
      titleKey: 'guide.s3Iam.stepReview.title',
      bodyKey: 'guide.s3Iam.stepReview.body',
      expectedPage: 'anyAws'
    }
  ]
};
