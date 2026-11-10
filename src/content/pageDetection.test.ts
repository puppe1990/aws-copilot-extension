import { faker } from '@faker-js/faker'
import { detectAwsPage } from './pageDetection'

const AWS_CONSOLE_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-2',
  'sa-east-1',
  'eu-west-1',
  'ap-northeast-1',
] as const

it('detects non-AWS pages', () => {
  expect(detectAwsPage('https://example.com')).toEqual({ kind: 'notAws' })
})

it('detects AWS Console Home as consoleHome', () => {
  const region = faker.helpers.arrayElement(AWS_CONSOLE_REGIONS)
  expect(
    detectAwsPage(`https://${region}.console.aws.amazon.com/console/home?region=${region}`),
  ).toEqual({ kind: 'consoleHome' })
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
