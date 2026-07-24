import { Box, Container, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

function highlightBrand(text: string) {
  return text.split(/(MaIA)/gi).map((part, i) =>
    /^maia$/i.test(part) ? (
      <Box key={i} component="span" sx={{ fontWeight: 700 }}>
        {part}
      </Box>
    ) : (
      part
    ),
  );
}

const faqs = [
  //
  { q: '¿Qué es MaIA y cómo se diferencia de un chatbot tradicional?', a: 'Un chatbot tradicional solo responde preguntas preprogramadas usando un menú rígido de botones. MaIA es una plataforma de Inteligencia Agéntica. Esto significa que los asistentes creados en MaIA no solo hablan, sino que razonan, toman decisiones autónomas, ejecutan flujos de trabajo y completan tareas complejas de principio a fin.' },
  { q: '¿Qué modelos de Inteligencia Artificial usa MaIA?', a: 'MaIA es una plataforma modelo-agnóstica. No estamos atados a un único proveedor tecnológico. Cada agente puede utilizar el modelo de lenguaje que prefieras (como GPT de OpenAI, Claude de Anthropic o Gemini de Google), y el sistema te recomendará de forma inteligente cuál utilizar según la tarea específica para optimizar el rendimiento y el gasto de tokens.' },
  { q: '¿Mis datos y la información de mi empresa están seguros?', a: 'Absolutamente. Protegemos tu propiedad intelectual y tu "receta secreta" con medidas de Seguridad de Estándar Bancario, y lo más importante: tus datos y el conocimiento que subas a la plataforma nunca se utilizarán para entrenar modelos de lenguaje públicos externos.' },
  { q: '¿Qué es un crédito en MaIA?', a: 'Un crédito es nuestra medida unificada de atención. Equivale a toda la conversación generada en una ventana de 24 horas con un usuario final. Durante ese día, tu cliente puede enviarle textos, audios y fotos de forma ilimitada al agente, y sólo consumirá 1 crédito de tu plan. No cobramos por mensaje enviado ni te penalizamos por conversaciones largas.' },
  { q: '¿Cuánto cuesta una llamada telefónica de mi agente?', a: 'Las llamadas en tiempo real con voz natural en español se descuentan directamente de tus créditos incluidos. La regla de conversión es muy simple: 1 minuto de llamada hablada equivale a 1.5 créditos.' },
  { q: '¿Qué pasa si me quedo sin créditos en mi plan?', a: 'Tu asistente virtual nunca dejará de atender. Si consumes la bolsa de tu plan mensual, puedes activar en cualquier momento cualquiera de nuestros paquetes adicionales prepagados (el Paquete S de 500 créditos, el Paquete M de 1.000 créditos o el Paquete L de 2.500 créditos) o simplemente hacer un upgrade de nivel para ampliar tu capacidad.' },
  { q: '¿Qué pasa si supero mis conversaciones mensuales?', a: 'Queremos que tengas el control absoluto. La plataforma te enviará una notificación automática cuando alcances el 80% del consumo de tu plan. En ese momento, podrás realizar un upgrade de plan de forma inmediata (sin ningún tipo de recargo o penalidad retroactiva) o adquirir un paquete de créditos adicionales para cubrir el excedente de tu operación.' },
  { q: '¿Necesito saber programar o tener conocimientos de código?', a: 'No. MaIA está diseñada específicamente para empoderar a los equipos de negocio (Ventas, Soporte, Operaciones, RRHH). Configuras, entrenas y gestionas a tus agentes virtuales desde una interfaz visual sumamente intuitiva y amigable, y todas las integraciones de la plataforma se conectan de manera nativa.' },
  { q: '¿Cuánto tiempo toma poner un agente en producción?', a: 'La velocidad es una de nuestras mayores ventajas. Puedes tener un agente básico de atención automatizando tareas en tan solo 20 minutos. Para agentes complejos que requieran flujos de trabajo avanzados, integraciones técnicas o conexión a tus bases de datos, el proceso puede tomar hasta 2 semanas. En ambos casos, nuestro equipo te acompaña de cerca en todo el proceso de onboarding para garantizar el éxito.' },
  { q: '¿Puedo cancelar mi suscripción cuando quiera?', a: 'Sí. Creemos en relaciones comerciales basadas en el valor real, no en contratos obligatorios. Puedes cancelar tu suscripción en cualquier momento sin penalidades de ningún tipo. Tu cuenta se mantendrá activa y completamente operativa hasta que termine el periodo de facturación actual. Si elegiste el pago anual y decides cancelar antes, te reembolsamos de manera prorrateada los meses que no hayas utilizado.' },
  { q: '¿Ofrecen soporte y atención en español?', a: 'Sí, todo nuestro equipo y soporte técnico opera 100% en español. Dependiendo de tu plan, tienes acceso a un centro de ayuda con documentación completa, soporte prioritario por correo electrónico las 24 horas y canales de chat en vivo en tiempo real (disponible para planes Team y Growth), además de sesiones de onboarding guiado.' },
  { q: '¿Cómo puedo controlar y administrar el uso de la IA?', a: 'La plataforma te permite crear Workspaces (espacios de trabajo) aislados por departamentos o área de neocio (Ventas, Soporte, RRHH) y asignar permisos basados en Roles. Así te aseguras de que cada asistente y cada conjunto de datos sea accedido y administrado únicamente por el personal autorizado, manteniendo el orden y la seguridad transversal.' },
  // 

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
                <Typography color="text.secondary" sx={{ fontSize: 15 }}>{highlightBrand(f.a)}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
