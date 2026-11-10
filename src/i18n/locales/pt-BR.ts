import type { TranslationKeyMap } from '../index'

export const ptBR: TranslationKeyMap = {
  'app.title': 'AWS Copilot',
  'app.subtitle': 'Crie um bucket S3 e uma política IAM para acesso da aplicação.',
  'app.panelBadge': 'Roda dentro do Console da AWS',
  'app.panelBody': 'Inicie o guia e siga o spotlight diretamente na interface da AWS.',
  'language.label': 'Idioma',
  'guide.start': 'Iniciar guia',
  'guide.restart': 'Reiniciar guia',
  'guide.launchStatus': 'Guia iniciado no Console da AWS',
  'guide.s3Iam.title': 'Bucket S3 + política IAM',
  'guide.s3Iam.stepObjective.title': 'Escolha o objetivo',
  'guide.s3Iam.stepObjective.body':
    'Este guia cria acesso de aplicação ao S3 sem abrir o bucket publicamente.',
  'guide.s3Iam.stepBucketName.title': 'Crie o bucket',
  'guide.s3Iam.stepBucketName.body':
    'Use um nome globalmente único, como {bucketName}. Não inclua segredos ou dados de clientes no nome.',
  'guide.s3Iam.stepSecurity.title': 'Mantenha o acesso público bloqueado',
  'guide.s3Iam.stepSecurity.body':
    'Bloqueie acesso público, exceto quando houver um motivo específico e revisado para publicar objetos.',
  'guide.s3Iam.stepIamPolicy.title': 'Crie uma política IAM de privilégio mínimo',
  'guide.s3Iam.stepIamPolicy.body':
    'Em IAM Policies, clique em Create policy, troque para o editor JSON, cole este JSON e mantenha o acesso restrito apenas ao seu bucket.',
  'guide.s3Iam.stepReview.title': 'Revise o resultado',
  'guide.s3Iam.stepReview.body':
    'Confirme que o bucket está privado e que a política IAM referencia apenas o bucket esperado.',
  'guide.state.goalIamPolicy':
    'Objetivo: criar a política IAM de privilégio mínimo para este bucket.',
  'guide.state.currentPageS3CreateBucket': 'Página atual: criação do bucket S3',
  'guide.state.currentPageIamCreatePolicy': 'Página atual: criação de policy no IAM',
  'guide.state.statusIamWrongService': 'Você ainda está na página de criação do bucket S3.',
  'guide.state.statusIamReadyToPaste': 'Cole o JSON abaixo no editor de policy.',
  'guide.state.checklistOpenIam': 'Abra IAM > Policies e clique em Create policy.',
  'guide.state.checklistSwitchJson': 'Troque para o editor JSON antes de colar a política.',
  'guide.state.checklistPastePolicy': 'Troque o nome de exemplo pelo bucket que você criou.',
  'action.copy': 'Copiar sugestão',
  'action.copyPolicyJson': 'Copiar JSON da política',
  'action.fill': 'Preencher campo',
  'action.openSpotlight': 'Abrir spotlight na AWS',
  'action.openIam': 'Abrir IAM',
  'action.next': 'Próxima etapa',
  'action.exit': 'Sair do guia',
  'action.highlightField': 'Destacar campo',
  'action.done': 'Marcar como concluído',
  'status.localOnly':
    'Roda localmente. Sem chamadas à API da AWS. Nenhum dado é enviado a servidores.',
  'error.notAws': 'Abra o Console da AWS para usar este guia.',
  'error.wrongPage': 'Busque por S3 no Console da AWS e abra Amazon S3.',
  'error.openIamPolicy':
    'Você ainda está na página de criação do bucket S3. Abra IAM Policies, clique em Create policy, troque para o editor JSON e cole o JSON da política exibido abaixo.',
}
