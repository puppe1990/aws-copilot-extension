import type { TranslationKeyMap } from '../index';

export const ptBR: TranslationKeyMap = {
  'app.title': 'AWS Copilot',
  'app.subtitle': 'Crie um bucket S3 e uma política IAM para acesso da aplicação.',
  'language.label': 'Idioma',
  'guide.start': 'Iniciar guia',
  'guide.s3Iam.title': 'Bucket S3 + política IAM',
  'guide.s3Iam.stepObjective.title': 'Escolha o objetivo',
  'guide.s3Iam.stepObjective.body': 'Este guia cria acesso de aplicação ao S3 sem abrir o bucket publicamente.',
  'guide.s3Iam.stepBucketName.title': 'Crie o bucket',
  'guide.s3Iam.stepBucketName.body': 'Use um nome globalmente único, como {bucketName}. Não inclua segredos ou dados de clientes no nome.',
  'guide.s3Iam.stepSecurity.title': 'Mantenha o acesso público bloqueado',
  'guide.s3Iam.stepSecurity.body': 'Bloqueie acesso público, exceto quando houver um motivo específico e revisado para publicar objetos.',
  'guide.s3Iam.stepIamPolicy.title': 'Crie uma política IAM de privilégio mínimo',
  'guide.s3Iam.stepIamPolicy.body': 'Restrinja a política a este bucket e apenas às ações S3 que a aplicação precisa.',
  'guide.s3Iam.stepReview.title': 'Revise o resultado',
  'guide.s3Iam.stepReview.body': 'Confirme que o bucket está privado e que a política IAM referencia apenas o bucket esperado.',
  'action.copy': 'Copiar sugestão',
  'action.fill': 'Preencher campo',
  'action.done': 'Marcar como concluído',
  'status.localOnly': 'Roda localmente. Sem chamadas à API da AWS. Nenhum dado é enviado a servidores.',
  'error.notAws': 'Abra o Console da AWS para usar este guia.',
  'error.wrongPage': 'Esta etapa precisa de outra página do Console da AWS.'
};
