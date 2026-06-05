import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renderer markdown reusable usado por:
 *  - `BlogArticle.tsx`  (vista pública del artículo)
 *  - Preview en vivo del editor en `ArticleEdit.tsx` (admin)
 *
 * Soporta GFM (tablas, listas, autolinks), imágenes con lazy loading,
 * videos embebidos de YouTube y Vimeo (cuando un parágrafo contiene un
 * único link a uno de esos servicios, se reemplaza por un `<iframe>`
 * responsivo 16:9), blockquotes con borde naranja, código (inline + bloque)
 * sobre `surface.soft` y links externos abriéndose en otra pestaña.
 */

export interface MarkdownRendererProps {
  body: string;
  compact?: boolean;
  /** Override de estilos extra del wrapper. */
  sx?: SxProps<Theme>;
}

/** Patrones para detectar URLs de YouTube y Vimeo. */
const YOUTUBE_RE = /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})(?:[&?][^\s]*)?$/i;
const VIMEO_RE   = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)(?:[/?#][^\s]*)?$/i;

export function getEmbedUrl(url: string): string | null {
  const yt = url.match(YOUTUBE_RE);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(VIMEO_RE);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

function isExternal(href: string | undefined): boolean {
  if (!href) return false;
  return /^https?:\/\//i.test(href);
}

/** Wrapper de `<iframe>` 16:9 responsivo. */
function VideoEmbed({ src, title }: { src: string; title?: string }) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        pt: '56.25%', // 16:9
        my: 3,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: '#000',
      }}
    >
      <Box
        component="iframe"
        src={src}
        title={title ?? 'video embebido'}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 0,
        }}
      />
    </Box>
  );
}

function getMarkdownSx(compact: boolean): SxProps<Theme> {
  const titleScale = compact ? 0.85 : 1;
  return {
    color: 'text.primary',
    fontSize: compact ? 15 : 17,
    lineHeight: 1.7,
    '& h1': {
      fontSize: { xs: `${1.8 * titleScale}rem`, md: `${2.2 * titleScale}rem` },
      fontWeight: 700,
      letterSpacing: '-0.025em',
      mt: compact ? 3 : 5,
      mb: 2,
    },
    '& h2': {
      fontSize: { xs: `${1.5 * titleScale}rem`, md: `${1.8 * titleScale}rem` },
      fontWeight: 700,
      letterSpacing: '-0.025em',
      mt: compact ? 2.5 : 4,
      mb: 1.5,
    },
    '& h3': {
      fontSize: { xs: `${1.2 * titleScale}rem`, md: `${1.4 * titleScale}rem` },
      fontWeight: 600,
      mt: compact ? 2 : 3,
      mb: 1,
    },
    '& p': { mb: 2 },
    '& ul, & ol': { pl: 3, mb: 2 },
    '& li': { mb: 0.5 },
    '& a': {
      color: 'primary.main',
      textDecoration: 'none',
      '&:hover': { textDecoration: 'underline' },
    },
    '& blockquote': {
      borderLeft: '4px solid',
      borderColor: 'primary.main',
      background: 'var(--bg-soft)',
      pl: 2,
      py: 1,
      my: 2,
      color: 'text.secondary',
      fontStyle: 'italic',
    },
    '& code': {
      background: '#FAFAF9',
      border: '1px solid var(--border)',
      borderRadius: 1,
      px: 0.75,
      py: 0.25,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '0.9em',
    },
    '& pre': {
      background: '#FAFAF9',
      border: '1px solid var(--border)',
      borderRadius: 2,
      p: 2,
      my: 2,
      overflowX: 'auto',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 14,
    },
    '& pre code': {
      background: 'transparent',
      border: 'none',
      padding: 0,
    },
    '& img': {
      maxWidth: '100%',
      borderRadius: 2,
      my: 2,
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      my: 2,
      fontSize: compact ? 14 : 15,
    },
    '& th, & td': {
      border: '1px solid var(--border)',
      padding: '8px 12px',
      textAlign: 'left',
    },
    '& th': { background: 'var(--bg-soft)', fontWeight: 600 },
    '& hr': { border: 'none', borderTop: '1px solid var(--border)', my: 4 },
  };
}

const components: Components = {
  img({ src, alt, ...rest }) {
    if (!src) return null;
    return (
      <img
        src={typeof src === 'string' ? src : undefined}
        alt={alt ?? ''}
        loading="lazy"
        {...rest}
      />
    );
  },
  a({ href, children, ...rest }) {
    const external = isExternal(href);
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        {...rest}
      >
        {children}
      </a>
    );
  },
  // Si un parágrafo contiene únicamente un link a YouTube/Vimeo, lo
  // reemplazamos por un iframe embebido responsivo. Si no, render normal.
  p({ children, ...rest }) {
    const kids = Array.isArray(children) ? children : [children];
    const meaningful = kids.filter(
      (c) => !(typeof c === 'string' && c.trim() === ''),
    );
    if (meaningful.length === 1) {
      const only = meaningful[0] as unknown;
      if (
        only &&
        typeof only === 'object' &&
        'props' in (only as Record<string, unknown>)
      ) {
        const props = (only as { props?: { href?: string; children?: unknown } }).props ?? {};
        const href = props.href;
        if (typeof href === 'string') {
          const embed = getEmbedUrl(href);
          if (embed) {
            const title = typeof props.children === 'string' ? props.children : undefined;
            return <VideoEmbed src={embed} title={title} />;
          }
        }
      }
    }
    return <p {...rest}>{children}</p>;
  },
};

export default function MarkdownRenderer({ body, compact = false, sx }: MarkdownRendererProps) {
  const baseSx = getMarkdownSx(compact);
  return (
    <Box sx={sx ? ({ ...baseSx, ...(sx as object) } as SxProps<Theme>) : baseSx}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {body || ''}
      </ReactMarkdown>
    </Box>
  );
}
