export const en = {
  'app.title': 'AWS Copilot',
  'app.subtitle': 'Create an S3 bucket and IAM policy for app access.',
  'app.panelBadge': 'Runs inside AWS Console',
  'app.panelBody': 'Start the guide, then follow the spotlight directly in the AWS interface.',
  'language.label': 'Language',
  'guide.start': 'Start guide',
  'guide.restart': 'Restart guide',
  'guide.launchStatus': 'Guide launched in AWS Console',
  'guide.s3Iam.title': 'S3 bucket + IAM policy',
  'guide.s3Iam.stepObjective.title': 'Choose the objective',
  'guide.s3Iam.stepObjective.body':
    'This guide creates app access to S3 without opening the bucket publicly.',
  'guide.s3Iam.stepBucketName.title': 'Create the bucket',
  'guide.s3Iam.stepBucketName.body':
    'Use a globally unique bucket name such as {bucketName}. Do not include secrets or customer data in the name.',
  'guide.s3Iam.stepSecurity.title': 'Keep public access blocked',
  'guide.s3Iam.stepSecurity.body':
    'Block public access unless you have a specific reviewed reason to make objects public.',
  'guide.s3Iam.stepIamPolicy.title': 'Create a least-privilege IAM policy',
  'guide.s3Iam.stepIamPolicy.body':
    'In IAM Policies, click Create policy, switch to the JSON editor, paste this JSON, and keep access scoped to your bucket only.',
  'guide.s3Iam.stepReview.title': 'Review the result',
  'guide.s3Iam.stepReview.body':
    'Confirm the bucket is private and the IAM policy references only the intended bucket.',
  'guide.state.goalIamPolicy': 'Goal: Create the least-privilege IAM policy for this bucket.',
  'guide.state.currentPageS3CreateBucket': 'Current page: S3 Create bucket',
  'guide.state.currentPageIamCreatePolicy': 'Current page: IAM Create policy',
  'guide.state.statusIamWrongService': 'You are still on the S3 Create bucket page.',
  'guide.state.statusIamReadyToPaste': 'Paste the JSON below into the policy editor.',
  'guide.state.checklistOpenIam': 'Open IAM > Policies and click Create policy.',
  'guide.state.checklistSwitchJson': 'Switch to the JSON editor before pasting the policy.',
  'guide.state.checklistPastePolicy':
    'Replace the example bucket name with the bucket you created.',
  'action.copy': 'Copy suggestion',
  'action.copyPolicyJson': 'Copy policy JSON',
  'action.fill': 'Fill field',
  'action.openSpotlight': 'Open spotlight in AWS',
  'action.openIam': 'Open IAM',
  'action.next': 'Next step',
  'action.exit': 'Exit guide',
  'action.highlightField': 'Highlight field',
  'action.done': 'Mark done',
  'status.localOnly': 'Runs locally. No AWS API calls. No data sent to servers.',
  'error.notAws': 'Open the AWS Console to use this guide.',
  'error.wrongPage': 'Search for S3 in the AWS Console, then open Amazon S3.',
  'error.openIamPolicy':
    'You are still on the S3 Create bucket page. Open IAM Policies, click Create policy, switch to the JSON editor, and paste the policy JSON shown below.',
} as const
