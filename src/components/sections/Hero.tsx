import { useEffect, useRef, useState } from 'react';
import { Box, Button, Container, Typography, Chip, Stack } from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import * as THREE from 'three';

interface HeroProps { onOpenContact: () => void }

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

  return (
    <Box component="section" id="hero" sx={{ position: 'relative', pt: { xs: 13, md: 16 }, pb: { xs: 7, md: 10 } }}>
      {/* Vanta NET canvas background */}
      <Box ref={vantaRef} sx={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      {/* Gradient overlay: fades to white at the bottom */}
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
          <Button
            variant="outlined"
            size="large"
            startIcon={<PlayCircleOutlineIcon />}
            href="https://www.youtube.com/watch?v=EngW7tLk6R8"
            target="_blank"
            rel="noopener"
          >
            Ver demo
          </Button>
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

        <Box className="reveal" sx={{
          maxWidth: 980, mx: 'auto',
          background: '#FAFAF9', borderRadius: 4, overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)',
          border: '1px solid var(--border)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderBottom: '1px solid var(--border)', background: '#FAFAF9' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#FF5F56' }} />
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#FEBC2E' }} />
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#27C840' }} />
            <Box sx={{ ml: 2, fontSize: 12, color: 'text.secondary' }}>app.maiabuilder.ai / mis-agentes</Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px 1fr' }, minHeight: 360 }}>
            <Box sx={{ display: { xs: 'none', md: 'block' }, p: 2, borderRight: '1px solid var(--border)' }}>
              <Box component="img" src="/logo-maia.svg" alt="MaIA" sx={{ height: 22, mb: 2 }} />
              {['Mis agentes', 'Conversaciones', 'Conocimiento', 'Integraciones', 'Configuración'].map((it, i) => (
                <Box key={it} sx={{
                  px: 1.5, py: 1, borderRadius: 1.5, fontSize: 13, color: i === 0 ? 'primary.main' : 'text.secondary',
                  background: i === 0 ? 'var(--orange-xl)' : 'transparent', fontWeight: i === 0 ? 600 : 400,
                }}>{it}</Box>
              ))}
            </Box>
            <Box sx={{ p: 3, background: '#FFFFFF' }}>
              <Typography variant="h6" fontWeight={700}>Mis agentes IA</Typography>
              <Typography variant="caption" color="text.secondary">Administra todos tus agentes en un solo lugar.</Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {[
                  { i: 'C', n: 'Carlos · Soporte L1', r: 'Resuelve 78% de tickets sin escalar', a: true },
                  { i: 'V', n: 'Valeria · SDR', r: 'Califica leads y agenda demos' },
                  { i: 'M', n: 'Mateo · Onboarding', r: 'Guía a nuevos clientes paso a paso' },
                ].map(a => (
                  <Box key={a.n} sx={{
                    display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2,
                    background: '#fff', border: `1px solid ${a.a ? 'var(--orange)' : 'var(--border)'}`,
                    backgroundColor: a.a ? 'var(--orange-xxl)' : '#fff',
                  }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{a.i}</Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ fontSize: 13, fontWeight: 600 }}>{a.n}</Box>
                      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{a.r}</Box>
                    </Box>
                    <Chip size="small" label="Activo" sx={{ bgcolor: 'var(--green-l)', color: 'var(--green)', fontWeight: 600 }} />
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
