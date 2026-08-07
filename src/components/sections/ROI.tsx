import { useMemo, useState } from 'react';
import { Box, Container, Typography, Slider } from '@mui/material';

interface ROIProps { isAnnual: boolean }

export default function ROI({ isAnnual }: ROIProps) {
  const [agents, setAgents] = useState(5);
  const [salary, setSalary] = useState(559);
  const [rep, setRep] = useState(60);

  const calc = useMemo(() => {
    const manualCost = agents * salary * (rep / 100);
    const saving = Math.round(manualCost * 0.75);
    let planCost = agents <= 5 ? 299 : agents <= 20 ? 699 : 1499;
    if (isAnnual) planCost = Math.round(planCost * 0.8);
    const net = Math.max(0, saving - planCost);
    const roi = ((net / Math.max(planCost, 1)) + 1).toFixed(1);
    return {
      manualCost: manualCost.toLocaleString(),
      saving: saving.toLocaleString(),
      yearly: (saving * 12).toLocaleString(),
      planCost: planCost.toLocaleString(),
      net: net.toLocaleString(),
      roi,
    };
  }, [agents, salary, rep, isAnnual]);

  return (
    <Box component="section" id="roi" sx={{ py: { xs: 7, md: 10 }, background: 'var(--bg-soft)' }}>
      <Container>
        <Box className="reveal" sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: 6 }}>
          <Typography variant="overline" color="primary" fontWeight={600}>Calculadora</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 1, mb: 2 }}>
            Cuánto puedes ahorrar con MaIA
          </Typography>
        </Box>
        <Box className="reveal" sx={{
          display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4,
          bgcolor: 'background.paper', borderRadius: 4, p: { xs: 3, md: 5 }, border: '1px solid var(--border)',
        }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Ajusta tu situación</Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">Agentes equivalentes: <b style={{ color: 'var(--text)' }}>{agents}</b></Typography>
              <Slider value={agents} onChange={(_, v) => setAgents(v as number)} min={1} max={50} />
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">Costo Plan: <b style={{ color: 'var(--text)' }}>${salary.toLocaleString()}</b></Typography>
              <Slider value={salary} onChange={(_, v) => setSalary(v as number)} min={300} max={5000} step={50} />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">% tareas repetitivas: <b style={{ color: 'var(--text)' }}>{rep}%</b></Typography>
              <Slider value={rep} onChange={(_, v) => setRep(v as number)} min={20} max={100} />
            </Box>
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>Tu ahorro estimado</Typography>
            <Typography variant="caption" color="text.secondary">Ahorro mensual</Typography>
            <Typography sx={{ fontSize: 40, fontWeight: 800, color: 'primary.main', lineHeight: 1.1 }}>${calc.saving}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>${calc.yearly} al año — ROI {calc.roi}×</Typography>
            <Box sx={{ borderTop: '1px solid var(--border)', pt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'text.secondary', py: 0.5 }}>
                <span>Costo actual</span><b style={{ color: 'var(--text)' }}>${calc.manualCost}/mo</b>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'text.secondary', py: 0.5 }}>
                <span>Inversión en MaIA</span><b style={{ color: 'var(--text)' }}>${calc.planCost}/mo</b>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: 'success.main', fontWeight: 700, py: 0.5, borderTop: '1px solid var(--border)', mt: 1, pt: 1 }}>
                <span>Ahorro neto</span><span>${calc.net}/mo</span>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
