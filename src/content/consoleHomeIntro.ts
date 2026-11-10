import { assertSafeElement, assertSafeSelector } from '../safety/safetyRules'
import { isVisibleEnough } from './consoleTargets'
import {
  HOME_INTRO_GUIDE_ID,
  type ContentGuideStep,
  type HomeIntroStepId,
  type Locale,
} from './contentGuideCatalog'

export { HOME_INTRO_GUIDE_ID }

type HeadingMatch = 'exact' | 'prefix'
type HomeIntroTargetSpec =
  { kind: 'selector'; selector: string } | { kind: 'heading'; match: HeadingMatch; text: string }

const HOME_INTRO_TARGETS: Record<HomeIntroStepId, HomeIntroTargetSpec> = {
  search: { kind: 'selector', selector: '#aws-unified-search-container' },
  services: { kind: 'selector', selector: 'button[aria-label="Open side navigation"]' },
  assistant: { kind: 'selector', selector: 'button[aria-label="AWS assistant"]' },
  notifications: { kind: 'selector', selector: 'button[data-testid="awsc-phd__bell-icon"]' },
  help: {
    kind: 'selector',
    selector: 'button[data-testid="more-menu__awsc-nav-support-menu-button"]',
  },
  settings: {
    kind: 'selector',
    selector: 'button[data-testid="more-menu__awsc-nav-quick-settings-button"]',
  },
  region: {
    kind: 'selector',
    selector: 'button[data-testid="more-menu__awsc-nav-regions-menu-button"]',
  },
  account: { kind: 'selector', selector: '#nav-usernameMenu' },
  agentToolkit: { kind: 'heading', match: 'prefix', text: 'Give your coding agent' },
  recent: { kind: 'heading', match: 'exact', text: 'Recently visited' },
  welcome: { kind: 'heading', match: 'exact', text: 'Welcome to AWS' },
  health: { kind: 'heading', match: 'exact', text: 'AWS Health' },
  cost: { kind: 'heading', match: 'exact', text: 'Cost and usage' },
  solutions: { kind: 'heading', match: 'prefix', text: 'Solutions' },
  explore: { kind: 'heading', match: 'exact', text: 'Explore AWS' },
  securityWidget: { kind: 'heading', match: 'exact', text: 'Security' },
  announcements: { kind: 'heading', match: 'exact', text: 'Latest announcements' },
  blog: { kind: 'heading', match: 'exact', text: 'Recent AWS blog posts' },
  trustedAdvisor: { kind: 'heading', match: 'exact', text: 'Trusted Advisor' },
  cloudshell: { kind: 'selector', selector: '#tools-experience-ingress' },
}

function headingText(element: HTMLElement): string {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function headingMatches(
  value: string,
  spec: Extract<HomeIntroTargetSpec, { kind: 'heading' }>,
): boolean {
  return spec.match === 'exact' ? value === spec.text : value.startsWith(spec.text)
}

function resolveSelectorTarget(selector: string): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null
  }
  assertSafeSelector(selector)
  const node = document.querySelector(selector)
  if (!(node instanceof HTMLElement) || !isVisibleEnough(node)) {
    return null
  }
  assertSafeElement(node)
  return node
}

function isIgnoredHeading(element: HTMLElement): boolean {
  return Boolean(
    element.closest('[data-aws-copilot-guide-card]') ||
    element.closest('#awsccc-cb-c') ||
    element.closest('nav') ||
    element.closest('#awsc-nav-header'),
  )
}

function findHeadingInRoot(
  root: ParentNode,
  spec: Extract<HomeIntroTargetSpec, { kind: 'heading' }>,
): HTMLElement | null {
  const selector = 'h1, h2, h3'
  assertSafeSelector(selector)
  for (const node of root.querySelectorAll(selector)) {
    if (!(node instanceof HTMLElement) || isIgnoredHeading(node)) {
      continue
    }
    if (!headingMatches(headingText(node), spec) || !isVisibleEnough(node)) {
      continue
    }
    assertSafeElement(node)
    return node
  }
  return null
}

function resolveHeadingTarget(
  spec: Extract<HomeIntroTargetSpec, { kind: 'heading' }>,
): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null
  }
  const mainSelector = 'main'
  assertSafeSelector(mainSelector)
  const main = document.querySelector(mainSelector)
  if (main) {
    const inMain = findHeadingInRoot(main, spec)
    if (inMain) {
      return inMain
    }
  }
  return findHeadingInRoot(document, spec)
}

export function isHomeIntroStepId(id: string): id is HomeIntroStepId {
  return Object.hasOwn(HOME_INTRO_TARGETS, id)
}

export function resolveHomeIntroTarget(stepId: string): HTMLElement | null {
  if (!isHomeIntroStepId(stepId)) {
    return null
  }
  const spec = HOME_INTRO_TARGETS[stepId]
  return spec.kind === 'selector'
    ? resolveSelectorTarget(spec.selector)
    : resolveHeadingTarget(spec)
}

function introStep(
  id: HomeIntroStepId,
  expectedPage: ContentGuideStep['expectedPage'],
  title: Record<Locale, string>,
  body: Record<Locale, string>,
): ContentGuideStep {
  return { id, expectedPage, title, body }
}

export const homeIntroSteps: ContentGuideStep[] = [
  introStep(
    'search',
    'anyAws',
    { en: 'Search', 'pt-BR': 'Busca' },
    {
      en: 'Type a service name here. Option+S focuses this field from anywhere in the Console.',
      'pt-BR':
        'Digite o nome de um servico. Option+S foca este campo de qualquer pagina do Console.',
    },
  ),
  introStep(
    'services',
    'anyAws',
    { en: 'All services', 'pt-BR': 'Todos os servicos' },
    {
      en: 'This button opens the side navigation that lists every AWS product.',
      'pt-BR': 'Este botao abre a navegacao lateral com todos os produtos da AWS.',
    },
  ),
  introStep(
    'assistant',
    'anyAws',
    { en: 'AWS assistant', 'pt-BR': 'Assistente AWS' },
    {
      en: 'Amazon Q lives here. Ask it about the service you have open.',
      'pt-BR': 'O Amazon Q fica aqui. Pergunte sobre o servico que esta aberto.',
    },
  ),
  introStep(
    'notifications',
    'anyAws',
    { en: 'Notifications', 'pt-BR': 'Notificacoes' },
    {
      en: 'Health events and Console notices land on this bell.',
      'pt-BR': 'Eventos de Health e avisos do Console chegam neste sino.',
    },
  ),
  introStep(
    'help',
    'anyAws',
    { en: 'Help', 'pt-BR': 'Ajuda' },
    {
      en: 'Documentation, support cases, and feedback sit in this menu.',
      'pt-BR': 'Documentacao, casos de suporte e feedback ficam neste menu.',
    },
  ),
  introStep(
    'settings',
    'anyAws',
    { en: 'Settings', 'pt-BR': 'Configuracoes' },
    {
      en: 'Language, visual mode, and Console preferences live here.',
      'pt-BR': 'Idioma, modo visual e preferencias do Console ficam aqui.',
    },
  ),
  introStep(
    'region',
    'anyAws',
    { en: 'Region', 'pt-BR': 'Regiao' },
    {
      en: 'Resources you create belong to this region. Switch it before you click Create.',
      'pt-BR':
        'Os recursos que voce cria pertencem a esta regiao. Troque antes de clicar em Create.',
    },
  ),
  introStep(
    'account',
    'anyAws',
    { en: 'Account', 'pt-BR': 'Conta' },
    {
      en: 'Account alias, ID, and sign-out live behind this menu.',
      'pt-BR': 'Alias da conta, ID e sair da sessao ficam neste menu.',
    },
  ),
  introStep(
    'agentToolkit',
    'consoleHome',
    { en: 'Agent Toolkit', 'pt-BR': 'Agent Toolkit' },
    {
      en: 'This banner offers IAM-safe docs for coding agents in your IDE. Dismiss it if you are not setting that up now.',
      'pt-BR':
        'Este banner oferece documentacao com IAM para coding agents no IDE. Feche se nao for configurar isso agora.',
    },
  ),
  introStep(
    'recent',
    'consoleHome',
    { en: 'Recently visited', 'pt-BR': 'Visitados recentemente' },
    {
      en: 'Shortcuts to the last consoles you opened in this account.',
      'pt-BR': 'Atalhos para os ultimos consoles que voce abriu nesta conta.',
    },
  ),
  introStep(
    'welcome',
    'consoleHome',
    { en: 'Welcome to AWS', 'pt-BR': 'Bem-vindo a AWS' },
    {
      en: 'Getting-started cards for the first services most accounts need.',
      'pt-BR': 'Cards de inicio para os primeiros servicos que a maioria das contas precisa.',
    },
  ),
  introStep(
    'health',
    'consoleHome',
    { en: 'AWS Health', 'pt-BR': 'AWS Health' },
    {
      en: 'Outages and maintenance that affect this account show up here.',
      'pt-BR': 'Interrupcoes e manutencao que afetam esta conta aparecem aqui.',
    },
  ),
  introStep(
    'cost',
    'consoleHome',
    { en: 'Cost and usage', 'pt-BR': 'Custo e uso' },
    {
      en: 'A snapshot of spend for this account. Open Billing for the full bill.',
      'pt-BR': 'Um retrato do gasto desta conta. Abra Billing para a fatura completa.',
    },
  ),
  introStep(
    'solutions',
    'consoleHome',
    { en: 'Solutions', 'pt-BR': 'Solucoes' },
    {
      en: 'Packaged architectures you can launch without assembling each service by hand.',
      'pt-BR': 'Arquiteturas prontas que voce sobe sem montar cada servico na mao.',
    },
  ),
  introStep(
    'explore',
    'consoleHome',
    { en: 'Explore AWS', 'pt-BR': 'Explorar AWS' },
    {
      en: 'Training, blogs, and product tours when you are still mapping the platform.',
      'pt-BR': 'Treinamento, blogs e tours de produto enquanto voce ainda mapeia a plataforma.',
    },
  ),
  introStep(
    'securityWidget',
    'consoleHome',
    { en: 'Security', 'pt-BR': 'Seguranca' },
    {
      en: 'Identity findings and GuardDuty alerts for this account, without opening those consoles first.',
      'pt-BR':
        'Achados de identidade e alertas do GuardDuty desta conta, sem abrir esses consoles antes.',
    },
  ),
  introStep(
    'announcements',
    'consoleHome',
    { en: 'Latest announcements', 'pt-BR': 'Ultimos anuncios' },
    {
      en: 'New AWS features as they ship. Region availability still varies.',
      'pt-BR': 'Novos recursos da AWS conforme saem. Disponibilidade por regiao ainda varia.',
    },
  ),
  introStep(
    'blog',
    'consoleHome',
    { en: 'Recent AWS blog posts', 'pt-BR': 'Posts recentes do blog' },
    {
      en: 'Official how-tos and launch posts from aws.amazon.com/blogs.',
      'pt-BR': 'How-tos oficiais e posts de lancamento do aws.amazon.com/blogs.',
    },
  ),
  introStep(
    'trustedAdvisor',
    'consoleHome',
    { en: 'Trusted Advisor', 'pt-BR': 'Trusted Advisor' },
    {
      en: 'Checks for cost, performance, security, and fault tolerance against AWS best practices.',
      'pt-BR':
        'Checagens de custo, desempenho, seguranca e tolerancia a falha contra as praticas da AWS.',
    },
  ),
  introStep(
    'cloudshell',
    'anyAws',
    { en: 'CloudShell', 'pt-BR': 'CloudShell' },
    {
      en: 'A browser terminal already signed in as this account. Use aws cli without installing anything.',
      'pt-BR':
        'Um terminal no navegador ja autenticado nesta conta. Use o aws cli sem instalar nada.',
    },
  ),
]
