import type { TranslationKey } from '../i18n'

export type GuideStepId = 'objective' | 'bucket' | 'security' | 'iamPolicy' | 'review'

type IamPolicyStatement = {
  Effect: 'Allow'
  Action: string[]
  Resource: string | string[]
}

export type IamPolicyTemplate = {
  bucketNamePlaceholder: string
  document: {
    Version: '2012-10-17'
    Statement: IamPolicyStatement[]
  }
}

export type GuideStep = {
  id: GuideStepId
  titleKey: TranslationKey
  bodyKey: TranslationKey
  expectedPage: 'anyAws' | 's3CreateBucket' | 's3BucketSettings' | 'iamCreatePolicy'
  highlightSelector?: string
  suggestedValues?: Record<string, string>
  policyTemplate?: IamPolicyTemplate
}

export type GuideDefinition = {
  id: 's3-iam-app-access'
  titleKey: TranslationKey
  steps: GuideStep[]
}

const bucketName = 'my-app-uploads-prod'

export const s3AppAccessPolicyTemplate: IamPolicyTemplate = {
  bucketNamePlaceholder: '{bucketName}',
  document: {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['s3:ListBucket'],
        Resource: 'arn:aws:s3:::{bucketName}',
      },
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
        Resource: 'arn:aws:s3:::{bucketName}/*',
      },
    ],
  },
}

export function renderIamPolicyTemplate(
  template: IamPolicyTemplate,
  values: Record<string, string>,
): string {
  return JSON.stringify(
    substituteTemplateValues(template.document, template.bucketNamePlaceholder, values.bucketName),
    null,
    2,
  )
}

function substituteTemplateValues(value: unknown, placeholder: string, replacement = ''): unknown {
  if (typeof value === 'string') {
    return value.replaceAll(placeholder, replacement)
  }

  if (Array.isArray(value)) {
    return value.map((item) => substituteTemplateValues(item, placeholder, replacement))
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        substituteTemplateValues(item, placeholder, replacement),
      ]),
    )
  }

  return value
}

export const s3IamGuide: GuideDefinition = {
  id: 's3-iam-app-access',
  titleKey: 'guide.s3Iam.title',
  steps: [
    {
      id: 'objective',
      titleKey: 'guide.s3Iam.stepObjective.title',
      bodyKey: 'guide.s3Iam.stepObjective.body',
      expectedPage: 'anyAws',
    },
    {
      id: 'bucket',
      titleKey: 'guide.s3Iam.stepBucketName.title',
      bodyKey: 'guide.s3Iam.stepBucketName.body',
      expectedPage: 's3CreateBucket',
      highlightSelector:
        '[data-testid="bucket-name"], input[name="bucketName"], input[aria-label*="Bucket"]',
      suggestedValues: {
        bucketName,
      },
    },
    {
      id: 'security',
      titleKey: 'guide.s3Iam.stepSecurity.title',
      bodyKey: 'guide.s3Iam.stepSecurity.body',
      expectedPage: 's3BucketSettings',
      highlightSelector:
        '[data-testid="block-public-access"], [data-testid*="block-public"] input, input[name="blockPublicAccess"], input[aria-label*="Block public access"]',
    },
    {
      id: 'iamPolicy',
      titleKey: 'guide.s3Iam.stepIamPolicy.title',
      bodyKey: 'guide.s3Iam.stepIamPolicy.body',
      expectedPage: 'iamCreatePolicy',
      highlightSelector:
        '[data-testid="policy-json"], [data-testid*="policy-json"], [aria-label="Policy JSON"], [aria-label*="Policy JSON"]',
      suggestedValues: {
        bucketName,
      },
      policyTemplate: s3AppAccessPolicyTemplate,
    },
    {
      id: 'review',
      titleKey: 'guide.s3Iam.stepReview.title',
      bodyKey: 'guide.s3Iam.stepReview.body',
      expectedPage: 'anyAws',
    },
  ],
}
