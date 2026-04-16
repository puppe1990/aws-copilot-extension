export type AwsPage =
  | { kind: 'notAws' }
  | { kind: 'awsUnknown' }
  | { kind: 's3' }
  | { kind: 'iam' };

export function detectAwsPage(url: string): AwsPage {
  const parsed = new URL(url);
  if (!parsed.hostname.endsWith('console.aws.amazon.com')) {
    return { kind: 'notAws' };
  }

  const fullUrl = url.toLowerCase();
  if (fullUrl.includes('/s3')) {
    return { kind: 's3' };
  }
  if (fullUrl.includes('/iam')) {
    return { kind: 'iam' };
  }
  return { kind: 'awsUnknown' };
}
