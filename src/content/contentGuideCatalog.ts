import { detectAwsPage, type AwsPage } from './pageDetection'

// WHY: overlay copy is inline bilingual because the content script cannot share
// the panel i18n bundle. Keep step ids in lockstep with src/guides/s3IamGuide.ts.

export type Locale = 'en' | 'pt-BR'
export type GuideStepId = 'objective' | 'bucket' | 'security' | 'iamPolicy' | 'review'
export type GuideState = {
  activeStepIndex: number
  completedStepIds: GuideStepId[]
}
export type RecoveryMode = 'none' | 'searchS3' | 'openIam'
export type GuideSnapshot = {
  guideMode: 'not_started' | 'active'
  pageKind: AwsPage['kind']
  stepId?: GuideStepId | string
  contextId?: string
  statusText?: string
  goalText?: string
}
export type ActiveGuideContextId = 'default' | 'iamWrongService' | 'iamReadyToPaste'
export type ActiveGuideContext = {
  contextId: ActiveGuideContextId
  statusText: string
  goalText: string
  bodyText: string
  checklist: string[]
}
export type ContentMessage = {
  type?: string
  selector?: unknown
  guideId?: unknown
  locale?: unknown
  activeStepIndex?: unknown
}
export type ContentGuideStep = {
  id: GuideStepId
  title: Record<Locale, string>
  body: Record<Locale, string>
  substeps?: Record<Locale, string[]>
  expectedPage:
    'anyAws' | 's3BucketsList' | 's3CreateBucket' | 's3BucketSettings' | 'iamCreatePolicy'
  highlightSelector?: string
  policyTemplate?: string
}
export type PersistedActiveGuide = {
  guideId: typeof CONTENT_GUIDE_ID
  locale: Locale
  state: GuideState
}

export const CONTENT_GUIDE_ID = 's3-iam-app-access'
export const LOCALES: Locale[] = ['en', 'pt-BR']
export const EXAMPLE_BUCKET_NAME = 'my-app-uploads-prod'
export const START_STEP_INDEX = 1
export const ACTIVE_GUIDE_STORAGE_KEY = 'awsCopilot.activeGuide'

export const overlayLabels = {
  copyPolicyJson: {
    en: 'Copy policy JSON',
    'pt-BR': 'Copiar JSON da politica',
  },
  next: {
    en: 'Next step',
    'pt-BR': 'Proxima etapa',
  },
  exit: {
    en: 'Exit guide',
    'pt-BR': 'Sair do guia',
  },
  wrongPage: {
    en: 'Search for S3 in the AWS Console, then open Amazon S3.',
    'pt-BR': 'Busque por S3 no Console da AWS e abra Amazon S3.',
  },
  notAws: {
    en: 'Open the AWS Console to use this guide.',
    'pt-BR': 'Abra o Console da AWS para usar este guia.',
  },
  searchS3: {
    en: 'Search S3',
    'pt-BR': 'Buscar S3',
  },
  openIam: {
    en: 'Open IAM',
    'pt-BR': 'Abrir IAM',
  },
  openCreateBucket: {
    en: 'Click Create bucket in Amazon S3.',
    'pt-BR': 'Clique em Create bucket no Amazon S3.',
  },
  openIamPolicy: {
    en: 'You are still on the S3 Create bucket page. Open IAM Policies, click Create policy, switch to the JSON editor, and paste the policy JSON shown below.',
    'pt-BR':
      'Voce ainda esta na pagina de criacao do bucket S3. Abra IAM Policies, clique em Create policy, troque para o editor JSON e cole o JSON da politica exibido abaixo.',
  },
  createBucket: {
    en: 'Create bucket',
    'pt-BR': 'Create bucket',
  },
  guideGoalIamPolicy: {
    en: 'Goal: Create the least-privilege IAM policy for this bucket.',
    'pt-BR': 'Objetivo: criar a politica IAM de privilegio minimo para este bucket.',
  },
  guideStatusS3CreateBucket: {
    en: 'Current page: S3 Create bucket',
    'pt-BR': 'Pagina atual: criacao do bucket S3',
  },
  guideStatusIamCreatePolicy: {
    en: 'Current page: IAM Create policy',
    'pt-BR': 'Pagina atual: criacao de policy no IAM',
  },
  guideStatusIamWrongService: {
    en: 'You are still on the S3 Create bucket page.',
    'pt-BR': 'Voce ainda esta na pagina de criacao do bucket S3.',
  },
  guideStatusIamReadyToPaste: {
    en: 'Paste the JSON below into the policy editor.',
    'pt-BR': 'Cole o JSON abaixo no editor de policy.',
  },
} as const

export const AWS_SEARCH_SELECTOR = [
  'input[aria-label="Search"]',
  'input[aria-label*="Search"]',
  'input[placeholder="Search"]',
  'input[type="search"]',
  '[role="searchbox"]',
].join(', ')

export const BUCKET_NAME_FIELD_SELECTORS = [
  '[data-testid="bucket-name"]',
  'input[name="bucketName"]',
  'input[aria-label*="Bucket" i]',
  'input[placeholder*="bucket" i]',
  'input[placeholder*="s3-demo" i]',
]

export const contentGuideSteps: ContentGuideStep[] = [
  {
    id: 'objective',
    title: {
      en: 'Choose the objective',
      'pt-BR': 'Escolha o objetivo',
    },
    body: {
      en: 'This guide creates app access to S3 without opening the bucket publicly.',
      'pt-BR': 'Este guia cria acesso de aplicacao ao S3 sem abrir o bucket publicamente.',
    },
    expectedPage: 'anyAws',
  },
  {
    id: 'bucket',
    title: {
      en: 'Create the bucket',
      'pt-BR': 'Crie o bucket',
    },
    body: {
      en: `Use a globally unique bucket name such as ${EXAMPLE_BUCKET_NAME}. Do not include secrets or customer data in the name.`,
      'pt-BR': `Use um nome globalmente unico, como ${EXAMPLE_BUCKET_NAME}. Nao inclua segredos ou dados de clientes no nome.`,
    },
    substeps: {
      en: [
        'Keep the default General purpose bucket type.',
        'Leave Global namespace selected.',
        'Enter a lowercase, globally unique bucket name.',
        'Do not put secrets, customer names, or account data in the bucket name.',
      ],
      'pt-BR': [
        'Mantenha o tipo General purpose.',
        'Deixe Global namespace selecionado.',
        'Digite um nome minusculo e globalmente unico.',
        'Nao coloque segredos, nomes de clientes ou dados da conta no nome do bucket.',
      ],
    },
    expectedPage: 's3CreateBucket',
    highlightSelector:
      '[data-testid="bucket-name"], input[name="bucketName"], input[aria-label*="Bucket"]',
  },
  {
    id: 'security',
    title: {
      en: 'Keep public access blocked',
      'pt-BR': 'Mantenha o acesso publico bloqueado',
    },
    body: {
      en: 'Block public access unless you have a specific reviewed reason to make objects public.',
      'pt-BR':
        'Bloqueie acesso publico, exceto quando houver um motivo especifico e revisado para publicar objetos.',
    },
    substeps: {
      en: [
        'Scroll to Block Public Access settings.',
        'Keep all public access block options enabled.',
        'Do not enable public ACLs or public bucket policies for app uploads.',
      ],
      'pt-BR': [
        'Role ate Block Public Access settings.',
        'Mantenha todas as opcoes de bloqueio publico ativadas.',
        'Nao habilite ACLs publicas nem politicas publicas para uploads da aplicacao.',
      ],
    },
    expectedPage: 's3BucketSettings',
    highlightSelector:
      '[data-testid="block-public-access"], [data-testid*="block-public"] input, input[name="blockPublicAccess"], input[aria-label*="Block public access"]',
  },
  {
    id: 'iamPolicy',
    title: {
      en: 'Create a least-privilege IAM policy',
      'pt-BR': 'Crie uma politica IAM de privilegio minimo',
    },
    body: {
      en: 'In IAM Policies, click Create policy, switch to the JSON editor, paste this JSON, and keep access scoped to your bucket only.',
      'pt-BR':
        'Em IAM Policies, clique em Create policy, troque para o editor JSON, cole este JSON e mantenha o acesso restrito apenas ao seu bucket.',
    },
    substeps: {
      en: [
        'Open IAM > Policies and click Create policy.',
        'Switch to the JSON editor before pasting the policy.',
        'Replace the example bucket name with the bucket you created.',
        'Keep actions limited to list, read, write, and delete only if your app needs them.',
      ],
      'pt-BR': [
        'Abra IAM > Policies e clique em Create policy.',
        'Troque para o editor JSON antes de colar a politica.',
        'Troque o nome de exemplo pelo bucket que voce criou.',
        'Mantenha as acoes limitadas a listar, ler, gravar e apagar apenas se a aplicacao precisar.',
      ],
    },
    expectedPage: 'iamCreatePolicy',
    highlightSelector:
      '[data-testid="policy-json"], [data-testid*="policy-json"], [aria-label="Policy JSON"], [aria-label*="Policy JSON"]',
    policyTemplate: JSON.stringify(
      {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: ['s3:ListBucket'],
            Resource: `arn:aws:s3:::${EXAMPLE_BUCKET_NAME}`,
          },
          {
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
            Resource: `arn:aws:s3:::${EXAMPLE_BUCKET_NAME}/*`,
          },
        ],
      },
      null,
      2,
    ),
  },
  {
    id: 'review',
    title: {
      en: 'Review the result',
      'pt-BR': 'Revise o resultado',
    },
    body: {
      en: 'Confirm the bucket is private and the IAM policy references only the intended bucket.',
      'pt-BR':
        'Confirme que o bucket esta privado e que a politica IAM referencia apenas o bucket esperado.',
    },
    substeps: {
      en: [
        'Check that public access is still blocked.',
        'Check that the policy uses only the intended bucket ARN.',
        'Attach the policy only to the app role or app user that needs S3 access.',
      ],
      'pt-BR': [
        'Confira se o acesso publico continua bloqueado.',
        'Confira se a politica usa apenas o ARN do bucket esperado.',
        'Anexe a politica apenas ao role ou usuario da aplicacao que precisa acessar S3.',
      ],
    },
    expectedPage: 'anyAws',
  },
]

export function detectLocaleFromNavigator(
  languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): Locale {
  return languages.some((language) => language.toLowerCase().startsWith('pt')) ? 'pt-BR' : 'en'
}

export function stepIndexForHref(href: string): number {
  const page = detectAwsPage(href)
  if (page.kind === 's3BucketSettings') {
    return 2
  }
  if (page.kind === 'iamCreatePolicy') {
    return 3
  }
  return START_STEP_INDEX
}

export function completedStepIdsForIndex(activeStepIndex: number): GuideStepId[] {
  return contentGuideSteps.slice(0, activeStepIndex).map((step) => step.id)
}

export function matchesExpectedPage(
  expectedPage: ContentGuideStep['expectedPage'],
  page: AwsPage,
): boolean {
  if (expectedPage === 'anyAws') {
    return page.kind !== 'notAws'
  }
  return page.kind === expectedPage
}

export function matchesExpectedStepPage(step: ContentGuideStep, page: AwsPage): boolean {
  if (step.id === 'security' && page.kind === 's3CreateBucket') {
    return true
  }
  return matchesExpectedPage(step.expectedPage, page)
}

export function isBucketStepLandingPage(step: ContentGuideStep, page: AwsPage): boolean {
  return step.id === 'bucket' && page.kind === 's3BucketsList'
}

export function isPersistedActiveGuide(value: unknown): value is PersistedActiveGuide {
  const candidate = value as PersistedActiveGuide | null | undefined
  return (
    candidate?.guideId === CONTENT_GUIDE_ID &&
    LOCALES.includes(candidate.locale) &&
    typeof candidate.state?.activeStepIndex === 'number' &&
    Array.isArray(candidate.state.completedStepIds)
  )
}
