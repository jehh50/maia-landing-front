import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect } from 'vitest';
import theme from '../../theme/theme';
import MarkdownRenderer, { getEmbedUrl } from '../MarkdownRenderer';

function renderMd(body: string) {
  return render(
    <ThemeProvider theme={theme}>
      <MarkdownRenderer body={body} />
    </ThemeProvider>,
  );
}

describe('MarkdownRenderer', () => {
  it('renderiza "# Título" como <h1>', () => {
    renderMd('# Mi título');
    expect(
      screen.getByRole('heading', { level: 1, name: /mi título/i }),
    ).toBeInTheDocument();
  });

  it('renderiza "## Subtítulo" como <h2>', () => {
    renderMd('## Subtítulo');
    expect(
      screen.getByRole('heading', { level: 2, name: /subtítulo/i }),
    ).toBeInTheDocument();
  });

  it('renderiza una tabla GFM con cabecera y filas', () => {
    const md = [
      '| Col A | Col B |',
      '| ----- | ----- |',
      '| 1     | dos   |',
    ].join('\n');
    const { container } = renderMd(md);
    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: /col a/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /col b/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /^1$/ })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /^dos$/ })).toBeInTheDocument();
  });

  it('renderiza un link de YouTube (línea sola) como <iframe> embebido', () => {
    const { container } = renderMd('https://www.youtube.com/watch?v=EngW7tLk6R8');
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('src') ?? '').toContain('youtube.com/embed/EngW7tLk6R8');
    expect(iframe!.getAttribute('loading')).toBe('lazy');
  });

  it('renderiza un link de Vimeo (línea sola) como iframe a player.vimeo.com', () => {
    const { container } = renderMd('https://vimeo.com/76979871');
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('src') ?? '').toContain('player.vimeo.com/video/76979871');
  });

  it('renderiza "![alt](url)" como <img> con loading="lazy"', () => {
    renderMd('![Foto del equipo](https://cdn.example.com/foo.png)');
    const img = screen.getByRole('img', { name: /foto del equipo/i }) as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('src')).toBe('https://cdn.example.com/foo.png');
  });

  it('links externos abren en nueva pestaña con rel noopener', () => {
    renderMd('Visita [MaIA](https://maiabuilder.ai) hoy.');
    const link = screen.getByRole('link', { name: /maia/i });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel') ?? '').toContain('noopener');
  });

  it('getEmbedUrl reconoce youtube.com/watch, youtu.be y vimeo.com', () => {
    expect(getEmbedUrl('https://www.youtube.com/watch?v=abc123XYZ_-'))
      .toBe('https://www.youtube.com/embed/abc123XYZ_-');
    expect(getEmbedUrl('https://youtu.be/abc123XYZ'))
      .toBe('https://www.youtube.com/embed/abc123XYZ');
    expect(getEmbedUrl('https://vimeo.com/76979871'))
      .toBe('https://player.vimeo.com/video/76979871');
    expect(getEmbedUrl('https://example.com/not-a-video'))
      .toBeNull();
  });

  it('renderiza un blockquote desde "> cita"', () => {
    const { container } = renderMd('> Esta es una cita');
    const bq = container.querySelector('blockquote');
    expect(bq).not.toBeNull();
    expect(bq!.textContent ?? '').toMatch(/esta es una cita/i);
  });
});
