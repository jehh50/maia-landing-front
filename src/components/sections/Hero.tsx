import { useEffect, useRef, useState } from 'react';
import { Box, Button, Container, Typography, Chip, Stack, IconButton } from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import * as THREE from 'three';
import { imageRawUrl, listImages, normalizeApi, type AdminImage } from '../../lib/api';

interface HeroProps { onOpenContact: () => void }

/** Estado de carga explícito, como pide `docs/conventions.md` §5. */
type Estado = 'loading' | 'ok' | 'error';

/** Diapositiva ya resuelta: el carrusel no distingue de dónde salió la imagen. */
interface Slide { key: string; src: string; alt: string }

/**
 * Respaldo del carrusel, decidido en la feature 36 (justificación en
 * `progress/impl_36.md`).
 *
 * **No es un respaldo de datos de la API**: es el estado en el que queda el
 * hueco de la imagen cuando la API no tiene nada que servir para la sección
 * `hero`. Es **una sola** imagen estática y sin controles de carrusel; el
 * carrusel de varias imágenes pasa a depender exclusivamente de lo que se
 * publique desde el panel. El Hero es el encabezado de la landing y no puede
 * quedar con un marco vacío, que es justo lo que prohíbe el acceptance 2.
 */
const HERO_RESPALDO: Slide = {
  key: 'respaldo-estatico',
  src: '/hero.png',
  alt: 'Plataforma MaIA: administra todos tus agentes de IA en un solo lugar',
};

function useCounter(target: number, suffix = '', dec = 0, active = true) {
  const [val, setVal] = useState('0' + suffix);
  useEffect(() => {
    if (!active) return;
    const dur = 1600;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const v = target * e;
      setVal((dec ? v.toFixed(dec) : Math.floor(v).toLocaleString()) + suffix);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, suffix, dec, active]);
  return val;
}

/**
 * Encabezado de la landing. Desde la feature 36, las imágenes del carrusel salen
 * del endpoint **público** `GET /api/images?seccion=hero`
 * (`docs/api-contract.md` §4 ter) en vez de los estáticos de `public/`.
 *
 * Reglas del contrato que no son preferencias de esta pantalla:
 *
 * - **La URL del binario se construye**, no llega: el JSON no trae ningún campo
 *   `url`, y `imageRawUrl(id)` es quien aplica `VITE_API_BASE`.
 * - **El orden es del backend** (`orden ASC, id ASC`): no se reordena ni se
 *   recorta en cliente.
 * - **El filtro por sección lo hace el servidor** (`?seccion=hero`), no un
 *   `filter()` sobre el listado completo.
 *
 * **Fallback (acceptance 2, decidido por el humano el 2026-07-31).** Coherente
 * con la feature 35, si la API no devuelve imágenes **no se pinta ninguna imagen
 * de la API**; pero, a diferencia de precios, la sección **nunca desaparece**:
 * el titular, el copy, las métricas y el CTA son el encabezado de la landing.
 * Lo que se adapta es solo el hueco de la imagen, y lo hace así:
 *
 * - **Mientras carga**, el marco del carrusel ya está montado con su
 *   `aspectRatio` final y **sin ninguna `<img>`**: reserva el espacio (cero
 *   salto de layout) y es imposible que salga el icono de imagen partida.
 * - **Con imágenes de la API**, se pintan esas y solo esas.
 * - **Con `rows: []`, error HTTP o fallo de red**, el mismo marco muestra
 *   `HERO_RESPALDO`. Nunca se mezclan respaldo e imágenes de la API, y nunca se
 *   pinta primero el respaldo para sustituirlo después: el marco pasa de vacío a
 *   su contenido definitivo en **una sola** transición.
 * - Los controles (flechas y puntos) solo existen con **dos o más** imágenes.
 */
export default function Hero({ onOpenContact }: HeroProps) {
  const statsRef = useRef<HTMLDivElement>(null);
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<{ destroy: () => void } | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!statsRef.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) { setActive(true); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(statsRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let destroyed = false;
    if (vantaRef.current && !vantaEffect.current) {
      import('vanta/dist/vanta.net.min').then((mod) => {
        if (destroyed || !vantaRef.current) return;
        vantaEffect.current = mod.default({
          el: vantaRef.current,
          THREE,
          color: 0xE8440A,
          backgroundColor: 0xFFDACD,
          points: 12,
          maxDistance: 22,
          spacing: 18,
          showDots: false,
        });
      });
    }
    return () => {
      destroyed = true;
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  const teams = useCounter(100, '+', 0, active);
  const ints = useCounter(1, 'M', 1, active);
  const red = useCounter(68, '%', 0, active);
  const roi = useCounter(2.5, '×', 1, active);

  const [estado, setEstado] = useState<Estado>('loading');
  const [imagenes, setImagenes] = useState<AdminImage[]>([]);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      // El mensaje de error no se usa: al visitante no se le enseña un aviso de
      // API en el encabezado, se le enseña el respaldo.
      const res = await normalizeApi(listImages({ seccion: 'hero' }), 'rows');
      if (!vigente) return;
      setImagenes(res.ok ? res.data.rows : []);
      setEstado(res.ok ? 'ok' : 'error');
    })();
    return () => { vigente = false; };
  }, []);

  // Mientras carga, el marco va sin imágenes; luego, o las de la API o el
  // respaldo. `alt: null` es una imagen decorativa: `alt=""` (conventions §6).
  const slides: Slide[] =
    estado === 'loading'
      ? []
      : imagenes.length > 0
        ? imagenes.map(img => ({ key: img.id, src: imageRawUrl(img.id), alt: img.alt ?? '' }))
        : [HERO_RESPALDO];

  const total = slides.length;
  // El índice se acota al número real de diapositivas: nunca apunta fuera.
  const actual = total > 0 ? slide % total : 0;
  const go = (n: number) => { if (total > 0) setSlide((n + total) % total); };

  useEffect(() => {
    if (paused || total <= 1) return;
    const id = setInterval(() => setSlide(s => (s + 1) % total), 5000);
    return () => clearInterval(id);
  }, [paused, total]);

  return (
    <Box component="section" id="hero" sx={{ position: 'relative', pt: { xs: 13, md: 16 }, pb: { xs: 7, md: 10 } }}>
      <Box ref={vantaRef} sx={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(180deg, transparent 40%, var(--bg) 100%)',
      }} />

      <Container sx={{ position: 'relative', zIndex: 2 }}>
        <Box className="fade-up" sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Chip
            label={<>
              <Box component="p" className="" sx={{ fontSize: { xs: 16, md: 18 } }} />
              El futuro del trabajo no es automatizar, es delegar a una fuerza laboral digital
            </>}
            sx={{ bgcolor: 'background.paper', border: '1px solid var(--border2)', fontWeight: 500 }}
          />
        </Box>

        <Typography variant="h1" className="fade-up fade-up-1" align="center" sx={{ fontSize: { xs: '2.2rem', md: '3.8rem' }, mb: 2 }}>
          Crea agentes de IA que<br />
          <Box component="span" className="gradient-text">trabajan para tu equipo</Box><br />
          24/7, sin código
        </Typography>

        <Typography className="fade-up fade-up-2" align="center" color="text.secondary" sx={{ maxWidth: 680, mx: 'auto', mb: 4, fontSize: { xs: 16, md: 18 } }}>
          Automatiza ventas, soporte y operaciones internas en tan solo minutos.
          Sin ingenieros. Con todas tus herramientas ya conectadas.
        </Typography>

        <Stack className="fade-up fade-up-3" direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 6 }}>
          <Button variant="contained" size="large" onClick={onOpenContact}>
            Agenda un demo →
          </Button>
          {/* <Button
            variant="outlined"
            size="large"
            startIcon={<PlayCircleOutlineIcon />}
            href="https://www.youtube.com/watch?v=EngW7tLk6R8"
            target="_blank"
            rel="noopener"
          >
            Ver demo
          </Button> */}
        </Stack>

        <Box ref={statsRef} className="fade-up fade-up-4" sx={{
          display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3, maxWidth: 800, mx: 'auto', mb: 6, textAlign: 'center',
        }}>
          {[
            { v: teams, l: 'Empresas' },
            { v: ints, l: 'Interacciones / mes' },
            { v: red, l: 'Reducción tiempo' },
            { v: roi, l: 'ROI aproximado' },
          ].map(s => (
            <Box key={s.l}>
              <Typography variant="h3" sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 800, color: 'primary.main' }}>{s.v}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 13 }}>{s.l}</Typography>
            </Box>
          ))}
        </Box>

        <Box
          className="reveal"
          role="group"
          aria-label="Capturas de la plataforma MaIA"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          sx={{
            position: 'relative',
            maxWidth: 1100, mx: 'auto',
            borderRadius: 1, overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)',
            border: '1px solid var(--border)',
            aspectRatio: '1381 / 677',
            bgcolor: 'surface.soft',
            lineHeight: 0,
            '&:hover .hero-arrow': { opacity: 1 },
          }}
        >
          {slides.map((s, i) => (
            <Box
              key={s.key}
              component="img"
              src={s.src}
              alt={s.alt}
              aria-hidden={i !== actual}
              sx={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'contain', objectPosition: 'center top',
                opacity: i === actual ? 1 : 0,
                transition: 'opacity 0.6s ease',
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Flechas y puntos: solo tienen sentido con dos o más imágenes. */}
          {total > 1 && (
            <>
              <IconButton
                className="hero-arrow"
                aria-label="Imagen anterior"
                onClick={() => go(actual - 1)}
                sx={{
                  position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.85)', color: 'var(--text)',
                  opacity: { xs: 1, md: 0 }, transition: 'opacity 0.2s ease',
                  '&:hover': { bgcolor: 'common.white' },
                }}
              >
                <KeyboardArrowLeftIcon />
              </IconButton>
              <IconButton
                className="hero-arrow"
                aria-label="Imagen siguiente"
                onClick={() => go(actual + 1)}
                sx={{
                  position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.85)', color: 'var(--text)',
                  opacity: { xs: 1, md: 0 }, transition: 'opacity 0.2s ease',
                  '&:hover': { bgcolor: 'common.white' },
                }}
              >
                <KeyboardArrowRightIcon />
              </IconButton>

              <Box sx={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 1, zIndex: 2,
              }}>
                {slides.map((s, i) => (
                  <Box
                    key={s.key}
                    component="button"
                    aria-label={`Ir a la imagen ${i + 1}`}
                    onClick={() => go(i)}
                    sx={{
                      p: 0, border: 'none', cursor: 'pointer',
                      width: i === actual ? 22 : 8, height: 8, borderRadius: 100,
                      background: i === actual ? 'var(--orange)' : 'rgba(0,0,0,0.25)',
                      transition: 'all 0.25s ease',
                    }}
                  />
                ))}
              </Box>
            </>
          )}
        </Box>
      </Container>
    </Box>
  );
}
