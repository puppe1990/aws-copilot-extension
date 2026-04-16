export type AwsPage =
  | { kind: 'notAws' }
  | { kind: 'awsUnknown' }
  | { kind: 's3' }
  | { kind: 'iam' };

export function detectAwsPage(url: string): AwsPage {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  const hash = parsed.hash.toLowerCase();

  if (!hostname.endsWith('console.aws.amazon.com')) {
    return { kind: 'notAws' };
  }

  if (hostname.startsWith('s3.') || pathname.startsWith('/s3')) {
    return { kind: 's3' };
  }

  if (pathname.startsWith('/iam') || isIamHashRoute(hash)) {
    return { kind: 'iam' };
  }

  return { kind: 'awsUnknown' };
}

function isIamHashRoute(hash: string): boolean {
  return hash.startsWith('#/policies') || /^#\/iam(?:$|[/?#])/u.test(hash);
}
