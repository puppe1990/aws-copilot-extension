import { faker } from '@faker-js/faker'
import { beforeEach } from 'vitest'
import {
  putS3InSearch,
  resolveAwsSearchTarget,
  resolveCookieAcceptTarget,
  resolveS3ServiceResultTarget,
} from './consoleTargets'

function visibleRect(): DOMRect {
  return {
    x: faker.number.int({ min: 8, max: 80 }),
    y: faker.number.int({ min: 8, max: 40 }),
    left: 24,
    top: 16,
    right: 420,
    bottom: 48,
    width: 396,
    height: 32,
    toJSON: () => ({}),
  } as DOMRect
}

function mockVisible(element: HTMLElement): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(visibleRect())
}

beforeEach(() => {
  document.body.innerHTML = ''
})

it('finds the unified Console search field inside #aws-unified-search-container', () => {
  const placeholder = faker.lorem.word()
  document.body.innerHTML = `
    <div id="aws-unified-search-container">
      <input type="text" placeholder="${placeholder}" />
    </div>
  `
  const input = document.querySelector('#aws-unified-search-container input') as HTMLInputElement
  mockVisible(input)

  expect(resolveAwsSearchTarget()).toBe(input)
})

it('types S3 after clicking the Search control that reveals the unified field', () => {
  document.body.innerHTML = `
    <div id="aws-unified-search-container">
      <span aria-label="Search"></span>
    </div>
  `
  const container = document.getElementById('aws-unified-search-container') as HTMLElement
  const searchControl = document.querySelector('[aria-label="Search"]') as HTMLElement
  mockVisible(container)
  mockVisible(searchControl)
  searchControl.addEventListener('click', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.setAttribute('role', 'searchbox')
    container.appendChild(input)
    mockVisible(input)
  })

  const target = resolveAwsSearchTarget()
  putS3InSearch(target)

  const typed = document.querySelector('#aws-unified-search-container input') as HTMLInputElement
  expect(typed).toBeInstanceOf(HTMLInputElement)
  expect(typed.value).toBe('S3')
})

it('ignores the Recently visited S3 tile and highlights the concierge search result', () => {
  document.body.innerHTML = `
    <section>
      <h2>Recently visited</h2>
      <a id="recent-s3" href="/s3/home">
        <span>S3</span>
        <span>Scalable Storage in the Cloud</span>
      </a>
    </section>
    <div id="aws-unified-search-container">
      <div id="awsc-concierge-dropdown" role="dialog" aria-label="Search results">
        <a id="search-s3" href="/s3/home">
          <span>S3</span>
          <span>Scalable Storage in the Cloud</span>
        </a>
      </div>
    </div>
  `
  const recent = document.getElementById('recent-s3') as HTMLElement
  const searchResult = document.getElementById('search-s3') as HTMLElement
  mockVisible(recent)
  mockVisible(searchResult)

  expect(resolveS3ServiceResultTarget()).toBe(searchResult)
})

it('does not treat a Recently visited S3 tile as a search result', () => {
  document.body.innerHTML = `
    <section>
      <h2>Recently visited</h2>
      <a id="recent-s3" href="/s3/home">
        <span>S3</span>
        <span>Scalable Storage in the Cloud</span>
      </a>
    </section>
  `
  mockVisible(document.getElementById('recent-s3') as HTMLElement)

  expect(resolveS3ServiceResultTarget()).toBeNull()
})

it('finds the visible cookie Accept button on Console Home', () => {
  document.body.innerHTML = `
    <div id="awsccc-cb-c" role="dialog">
      <h2>Select your cookie preferences</h2>
      <p>${faker.lorem.sentence()}</p>
      <button aria-label="Accept all cookies" type="submit">Accept</button>
    </div>
  `
  const banner = document.getElementById('awsccc-cb-c') as HTMLElement
  const accept = document.querySelector(
    'button[aria-label="Accept all cookies"]',
  ) as HTMLButtonElement
  mockVisible(banner)
  mockVisible(accept)

  expect(resolveCookieAcceptTarget()).toBe(accept)
})
