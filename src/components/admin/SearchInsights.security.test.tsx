import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SearchInsights from './SearchInsights';

vi.mock('@/hooks/useSearchAdmin', () => ({
  useSearchInsights: () => ({
    data: [{ term_normalized: '<img src=x onerror="window.compromised=true">',
      total_searches: 1, zero_result_count: 1, last_searched_at: new Date().toISOString(),
      last_suggestion: '</td><script>window.compromised=true</script>', }],
    isLoading: false, isFetching: false, refetch: vi.fn(),
  }),
}));

afterEach(() => vi.restoreAllMocks());

describe('Search report stored input', () => {
  it('never executes public search terms or suggestions in the admin print window', () => {
    const report = document.implementation.createHTMLDocument('Report');
    const popup = { document: report, opener: window, print: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    render(<SearchInsights />);
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    expect(report.querySelector('img')).toBeNull();
    expect(report.querySelector('script')).toBeNull();
    expect(report.body.textContent).toContain('<img src=x onerror="window.compromised=true">');
    expect(report.body.textContent).toContain('</td><script>window.compromised=true</script>');
    expect(popup.opener).toBeNull();
    expect(popup.print).toHaveBeenCalledOnce();
  });
});