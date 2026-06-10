import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/sections/Hero';
//import Trust from './components/sections/Trust';
import Pain from './components/sections/Pain';
import Solution from './components/sections/Solution';
import Features from './components/sections/Features';
import Integrations from './components/sections/Integrations';
//import ROI from './components/sections/ROI';
import Pricing from './components/sections/Pricing';
//import Testimonials from './components/sections/Testimonials';
//import Blog from './components/sections/Blog';
import FAQ from './components/sections/FAQ';
import CTAFinal from './components/sections/CTAFinal';
import Footer from './components/Footer';
import WhatsAppFloat from './components/WhatsAppFloat';
import ContactModal from './components/ContactModal';
import { useReveal } from './hooks/useReveal';
import type { LeadType } from './lib/api';

export default function App() {
  const [contactOpen, setContactOpen] = useState(false);
  const [contactTipo, setContactTipo] = useState<LeadType>('demo');
  const [isAnnual, setIsAnnual] = useState(true);

  const openContact = (tipo: LeadType = 'demo') => {
    setContactTipo(tipo);
    setContactOpen(true);
  };

  useReveal();

  return (
    <>
      <Navbar onOpenContact={() => openContact('demo')} />
      <Hero onOpenContact={() => openContact('demo')} />
      {/*<Trust />*/}
      <Pain />
      <Solution />
      <Features />
      <Integrations />
      {/*<ROI isAnnual={isAnnual} />*/}
      <Pricing isAnnual={isAnnual} onToggle={() => setIsAnnual(v => !v)} onOpenContact={() => openContact('contacto')} />
      {/*<Testimonials />*/}
      {/*<Blog />*/}
      <FAQ />
      <CTAFinal />
      <Footer />
      <WhatsAppFloat />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} tipo={contactTipo} />
    </>
  );
}
