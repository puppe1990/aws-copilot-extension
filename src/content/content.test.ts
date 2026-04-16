import { clearHighlight, highlightElement } from './highlight';
import { detectAwsPage } from './pageDetection';

it('detects non-AWS pages', () => {
  expect(detectAwsPage('https://example.com')).toEqual({ kind: 'notAws' });
});

it('detects AWS S3 pages', () => {
  expect(detectAwsPage('https://s3.console.aws.amazon.com/s3/bucket/create')).toEqual({ kind: 's3' });
});

it('detects AWS IAM pages', () => {
  expect(detectAwsPage('https://us-east-1.console.aws.amazon.com/iam/home#/policies$new')).toEqual({ kind: 'iam' });
});

it('adds and clears a highlight overlay', () => {
  document.body.innerHTML = '<input id="bucket" />';
  const target = document.getElementById('bucket') as HTMLElement;

  highlightElement(target);
  expect(document.querySelector('[data-aws-copilot-highlight]')).toBeInTheDocument();

  clearHighlight();
  expect(document.querySelector('[data-aws-copilot-highlight]')).not.toBeInTheDocument();
});
