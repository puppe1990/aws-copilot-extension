export type AwsPage =
  | { kind: 'notAws' }
  | { kind: 'awsUnknown' }
  | { kind: 's3CreateBucket' }
  | { kind: 's3BucketSettings' }
  | { kind: 'iamCreatePolicy' };

export function detectAwsPage(url: string): AwsPage {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  const hash = parsed.hash.toLowerCase();

  if (!hostname.endsWith('console.aws.amazon.com')) {
    return { kind: 'notAws' };
  }

  if (isS3CreateBucketPage(hostname, pathname)) {
    return { kind: 's3CreateBucket' };
  }

  if (isS3BucketSettingsPage(hostname, pathname)) {
    return { kind: 's3BucketSettings' };
  }

  if (isIamCreatePolicyPage(pathname, hash)) {
    return { kind: 'iamCreatePolicy' };
  }

  return { kind: 'awsUnknown' };
}

function isS3CreateBucketPage(hostname: string, pathname: string): boolean {
  return hostname.startsWith('s3.') && pathname.startsWith('/s3/bucket/create');
}

function isS3BucketSettingsPage(hostname: string, pathname: string): boolean {
  return hostname.startsWith('s3.') && /^\/s3\/buckets\/[^/]+\/(?:permissions|properties|management|metrics|access-points)/u.test(pathname);
}

function isIamCreatePolicyPage(pathname: string, hash: string): boolean {
  return pathname.startsWith('/iam') && (hash.startsWith('#/policies$new') || hash.startsWith('#/policies/create'));
}
