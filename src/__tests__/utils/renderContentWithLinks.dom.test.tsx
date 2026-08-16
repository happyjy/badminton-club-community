import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { renderContentWithLinks } from '@/utils/renderContentWithLinks';

describe('renderContentWithLinks', () => {
  it('URL을 새 탭으로 열리는 링크로 만든다', () => {
    render(
      <div>
        {renderContentWithLinks('신청은 https://example.com/apply 에서')}
      </div>
    );

    const link = screen.getByRole('link', {
      name: 'https://example.com/apply',
    });
    expect(link.getAttribute('href')).toBe('https://example.com/apply');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('URL 앞뒤 텍스트를 그대로 유지한다', () => {
    const { container } = render(
      <div>
        {renderContentWithLinks('신청은 https://example.com/apply 에서')}
      </div>
    );

    expect(container.textContent).toBe('신청은 https://example.com/apply 에서');
  });

  it('여러 URL을 모두 링크로 만든다', () => {
    render(
      <div>
        {renderContentWithLinks(
          '요강 https://a.com 접수 https://b.com 문의 https://c.com'
        )}
      </div>
    );

    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('줄바꿈으로 이어진 URL도 각각 링크로 만든다', () => {
    render(<div>{renderContentWithLinks('https://a.com\nhttps://b.com')}</div>);

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('http URL도 링크로 만든다', () => {
    render(<div>{renderContentWithLinks('http://example.com')}</div>);

    expect(screen.getByRole('link').getAttribute('href')).toBe(
      'http://example.com'
    );
  });

  it('URL이 없으면 링크를 만들지 않는다', () => {
    render(<div>{renderContentWithLinks('링크 없는 모집 요강입니다.')}</div>);

    expect(screen.queryByRole('link')).toBeNull();
  });

  it('빈 문자열도 처리한다', () => {
    const { container } = render(<div>{renderContentWithLinks('')}</div>);

    expect(container.textContent).toBe('');
    expect(screen.queryByRole('link')).toBeNull();
  });
});
