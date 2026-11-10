import { detectAwsPage } from './pageDetection'

it('detects non-AWS pages', () => {
  expect(detectAwsPage('https://example.com')).toEqual({ kind: 'notAws' })
})

it('detects AWS S3 pages', () => {
  expect(detectAwsPage('https://s3.console.aws.amazon.com/s3/bucket/create')).toEqual({
    kind: 's3CreateBucket',
  })
})

it('detects AWS S3 bucket list pages', () => {
  expect(detectAwsPage('https://s3.console.aws.amazon.com/s3/home?region=us-east-1')).toEqual({
    kind: 's3BucketsList',
  })
  expect(
    detectAwsPage('https://us-east-1.console.aws.amazon.com/s3/home?region=us-east-1'),
  ).toEqual({
    kind: 's3BucketsList',
  })
})

it('detects AWS S3 bucket settings pages', () => {
  expect(
    detectAwsPage('https://s3.console.aws.amazon.com/s3/buckets/my-bucket/permissions'),
  ).toEqual({
    kind: 's3BucketSettings',
  })
  expect(
    detectAwsPage('https://us-east-1.console.aws.amazon.com/s3/buckets/my-bucket/permissions'),
  ).toEqual({
    kind: 's3BucketSettings',
  })
})

it('detects AWS IAM pages', () => {
  expect(detectAwsPage('https://us-east-1.console.aws.amazon.com/iam/home#/policies$new')).toEqual({
    kind: 'iamCreatePolicy',
  })
})

it('does not classify query string service names as S3', () => {
  expect(detectAwsPage('https://ec2.console.aws.amazon.com/ec2/home?next=/s3')).toEqual({
    kind: 'awsUnknown',
  })
})

it('does not classify non-iam hash fragments as IAM', () => {
  expect(
    detectAwsPage('https://lambda.console.aws.amazon.com/lambda/home#/iam-not-service'),
  ).toEqual({ kind: 'awsUnknown' })
})
