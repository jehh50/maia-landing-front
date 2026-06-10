import { Box, Container, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const faqs = [
  { q: '¿Qué es un crédito?', a: 'Es una conversación en una ventana de 24 horas.' },
  { q: '¿Cuánto cuesta una llamada de mi agente?', a: 'Las llamadas se descuentan de tus créditos, siendo 1 minuto equivalente a 1.5 créditos.' },
  { q: '¿Qué pasa si me quedo sin créditos?', a: 'Puedes activar cualquiera de los paquetes adicionales o aumentar tu plan.' },
  { q: '¿Cuánto tiempo toma ponerlo en producción?', a: 'Desde 30 minutos para un agente básico hasta 2 semanas para uno con integraciones complejas. Te acompañamos en el onboarding.' },
  { q: '¿Necesito saber programar?', a: 'No. MaIA está pensado para equipos de negocio. Configuras agentes desde una UI visual y todas las integraciones son nativas.' },
  { q: '¿Mis datos están seguros?', a: 'Cifrado en tránsito y reposo, SOC 2 compliant, hosting en regiones seleccionables. Tus datos nunca entrenan modelos públicos.' },
  { q: '¿Qué pasa si supero mis interacciones?', a: 'Te avisamos al 80% del consumo. Puedes hacer upgrade en cualquier momento sin recargo retroactivo o adquirir un paquete de interacciones adicional.' },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. No hay penalidades. Tu suscripción se mantiene activa hasta el final del periodo. Si pagas anual y cancelas, te reembolsamos los meses no usados.' },
  { q: '¿Tienen soporte en español?', a: 'Sí, todo nuestro soporte es en español. Chat en vivo (Team y Growth), email 24h, documentación y onboarding guiado.' },
  { q: '¿Qué modelos de IA usa MaIA?', a: 'Modelo-agnóstico. Cada agente puede usar el modelo que prefieras, Maia te recomendará cuál utilizar según tu caso de uso.' },
];

export default function FAQ() {
  return (
    <Box component="section" id="faq" sx={{ py: { xs: 7, md: 10 }, background: 'linear-gradient(180deg, var(--orange-xxl) 0%, var(--bg-soft) 30%, var(--bg-soft) 70%, var(--orange-xxl) 100%)' }}>
      <Container maxWidth="md">
        <Box className="reveal" sx={{ textAlign: 'center', maxWidth: 680, mx: 'auto', mb: 5 }}>
          <Typography variant="overline" color="primary" fontWeight={600}>Preguntas frecuentes</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', md: '2.4rem' }, mt: 1 }}>Resolvemos tus dudas</Typography>
        </Box>
        <Box className="reveal">
          {faqs.map((f, i) => (
            <Accordion key={i} disableGutters elevation={0} sx={{
              background: '#fff', mb: 1.5, borderRadius: '12px !important',
              border: '1px solid var(--border)', '&::before': { display: 'none' },
            }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3, py: 1 }}>
                <Typography fontWeight={600}>{f.q}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pt: 0, pb: 2.5 }}>
                <Typography color="text.secondary" sx={{ fontSize: 15 }}>{f.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
