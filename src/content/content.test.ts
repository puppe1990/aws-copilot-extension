import { handleContentMessage } from './main';
import { clearHighlight, highlightElement, highlightSelector } from './highlight';
import { detectAwsPage } from './pageDetection';

it('detects non-AWS pages', () => {
  expect(detectAwsPage('https://example.com')).toEqual({ kind: 'notAws' });
});

it('detects AWS S3 pages', () => {
  expect(detectAwsPage('https://s3.console.aws.amazon.com/s3/bucket/create')).toEqual({ kind: 's3CreateBucket' });
});

it('detects AWS S3 bucket settings pages', () => {
  expect(detectAwsPage('https://s3.console.aws.amazon.com/s3/buckets/my-bucket/permissions')).toEqual({
    kind: 's3BucketSettings'
  });
});

it('detects AWS IAM pages', () => {
  expect(detectAwsPage('https://us-east-1.console.aws.amazon.com/iam/home#/policies$new')).toEqual({
    kind: 'iamCreatePolicy'
  });
});

it('does not classify query string service names as S3', () => {
  expect(detectAwsPage('https://ec2.console.aws.amazon.com/ec2/home?next=/s3')).toEqual({ kind: 'awsUnknown' });
});

it('does not classify non-iam hash fragments as IAM', () => {
  expect(detectAwsPage('https://lambda.console.aws.amazon.com/lambda/home#/iam-not-service')).toEqual({ kind: 'awsUnknown' });
});

it('adds and clears a highlight overlay', () => {
  document.body.innerHTML = '<input id="bucket" />';
  const target = document.getElementById('bucket') as HTMLElement;

  highlightElement(target);
  expect(document.querySelector('[data-aws-copilot-highlight]')).toBeInTheDocument();

  clearHighlight();
  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument();
});

it("returns false for malformed highlight selectors", () => {
  expect(() => highlightSelector('[')).not.toThrow();
  expect(highlightSelector('[')).toBe(false);
  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument();
});

it('returns false when a highlight selector matches multiple elements', () => {
  document.body.innerHTML = '<input class="target" /><input class="target" />';

  expect(highlightSelector('.target')).toBe(false);
  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument();
});

it('blocks a sensitive matched element even when the selector string is benign', () => {
  document.body.innerHTML = '<input class="target" name="secretAccessKey" />';

  expect(() => highlightSelector('.target')).toThrow('Refusing to target sensitive AWS fields');
  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument();
});

it('responds with an explicit error for sensitive highlight selectors', () => {
  const sendResponse = vi.fn();

  expect(() =>
    handleContentMessage(
      {
        type: 'AWS_COPILOT_HIGHLIGHT',
        selector: 'input[type="password"]'
      },
      'https://console.aws.amazon.com/iam/home',
      sendResponse
    )
  ).not.toThrow();

  expect(sendResponse).toHaveBeenCalledWith({
    ok: false,
    error: 'Refusing to target sensitive AWS fields'
  });
});
