import { useEffect, useRef, useState } from 'react';
import { Box, Button, Container, Typography, Chip, Stack, IconButton } from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import * as THREE from 'three';

interface HeroProps { onOpenContact: () => void }

const HERO_SLIDES = [
  { src: '/hero.png', alt: 'Plataforma MaIA: administra todos tus agentes de IA en un solo lugar' },
  { src: '/hero-2.png', alt: 'Plataforma MaIA: conversaciones y conocimiento de tus agentes' },
  { src: '/hero-3.png', alt: 'Plataforma MaIA: integraciones y automatizaciones sin código' },
];

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

  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = (n: number) => setSlide((n + HERO_SLIDES.length) % HERO_SLIDES.length);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <Box component="section" id="hero" sx={{ position: 'relative', pt: { xs: 13, md: 16 }, pb: { xs: 7, md: 10 } }}>
      <Box ref={vantaRef} sx={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(180deg, transparent 40%, #FFFFFF 100%)',
      }} />

      <Container sx={{ position: 'relative', zIndex: 2 }}>
        <Box className="fade-up" sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Chip
            label={<>
              <Box component="span" className="" sx={{ fontSize: { xs: 16, md: 18 } }} />
              Multiplica tu capacidad, no tus tareas.
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
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          sx={{
            position: 'relative',
            maxWidth: 1100, mx: 'auto',
            borderRadius: 1, overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)',
            border: '1px solid var(--border)',
            aspectRatio: '1381 / 677',
            background: '#FAFAF9',
            lineHeight: 0,
            '&:hover .hero-arrow': { opacity: 1 },
          }}
        >
          {HERO_SLIDES.map((s, i) => (
            <Box
              key={s.src}
              component="img"
              src={s.src}
              alt={s.alt}
              aria-hidden={i !== slide}
              sx={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'contain', objectPosition: 'center top',
                opacity: i === slide ? 1 : 0,
                transition: 'opacity 0.6s ease',
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Flechas */}
          <IconButton
            className="hero-arrow"
            aria-label="Imagen anterior"
            onClick={() => go(slide - 1)}
            sx={{
              position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)',
              bgcolor: 'rgba(255,255,255,0.85)', color: 'var(--text)',
              opacity: { xs: 1, md: 0 }, transition: 'opacity 0.2s ease',
              '&:hover': { bgcolor: '#fff' },
            }}
          >
            <KeyboardArrowLeftIcon />
          </IconButton>
          <IconButton
            className="hero-arrow"
            aria-label="Imagen siguiente"
            onClick={() => go(slide + 1)}
            sx={{
              position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)',
              bgcolor: 'rgba(255,255,255,0.85)', color: 'var(--text)',
              opacity: { xs: 1, md: 0 }, transition: 'opacity 0.2s ease',
              '&:hover': { bgcolor: '#fff' },
            }}
          >
            <KeyboardArrowRightIcon />
          </IconButton>

          {/* Dots */}
          <Box sx={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 1, zIndex: 2,
          }}>
            {HERO_SLIDES.map((s, i) => (
              <Box
                key={s.src}
                component="button"
                aria-label={`Ir a la imagen ${i + 1}`}
                onClick={() => go(i)}
                sx={{
                  p: 0, border: 'none', cursor: 'pointer',
                  width: i === slide ? 22 : 8, height: 8, borderRadius: 100,
                  background: i === slide ? 'var(--orange)' : 'rgba(0,0,0,0.25)',
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
