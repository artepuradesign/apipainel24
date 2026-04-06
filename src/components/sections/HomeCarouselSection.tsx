import React, { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowRight, Zap, ShieldCheck, FileSearch } from "lucide-react";
import { useSiteTheme } from "@/contexts/SiteThemeContext";
import { Locale, useLocale } from "@/contexts/LocaleContext";

import slide01 from "@/assets/home-carousel-01.jpg";
import slide02 from "@/assets/home-carousel-02.jpg";
import slide03 from "@/assets/home-carousel-03.jpg";
import slide04 from "@/assets/home-carousel-04.jpg";

type Slide = {
  title: string;
  subtitle: string;
  description: string;
  image: string;
};

type HomeCarouselContent = {
  platformBadge: string;
  goToSlide: string;
  slides: Slide[];
  stats: Array<{ value: string; label: string }>;
  featureCards: Array<{ title: string; desc: string }>;
};

const CARD_ENTRANCE_DELAY_MS = 150;
const CARD_ENTRANCE_DURATION_MS = 700;
const TITLE_CHAR_MS = 38;
const TYPE_START_GAP_MS = 120;
const CARD_SEQUENCE_GAP_MS = 220;
const INFO_TYPING_START_DELAY_MS = 140;
const INFO_TITLE_CHAR_MS = 36;
const INFO_DESC_CHAR_MS = 24;
const INFO_TITLE_TO_DESC_GAP_MS = 180;
const INFO_TO_CARDS_GAP_MS = 220;
const SLIDE_END_BUFFER_MS = 650;

const getTypingDuration = (text: string, charMs: number) => Math.max(650, text.length * charMs);

const getCardTypingTotalDuration = (card: { title: string }) => getTypingDuration(card.title, TITLE_CHAR_MS);

const getInfoBoxTypingDuration = (slide: { subtitle: string; description: string }) => {
  const subtitleDuration = getTypingDuration(slide.subtitle, INFO_TITLE_CHAR_MS);
  const descriptionDuration = getTypingDuration(slide.description, INFO_DESC_CHAR_MS);

  return INFO_TYPING_START_DELAY_MS + subtitleDuration + INFO_TITLE_TO_DESC_GAP_MS + descriptionDuration;
};

const getCardTypeStartDelay = (cards: Array<{ title: string }>, cardIndex: number, baseDelayMs = 0) => {
  const previousCardsDuration = cards.slice(0, cardIndex).reduce((acc, card) => {
    return acc + getCardTypingTotalDuration(card) + CARD_SEQUENCE_GAP_MS;
  }, 0);

  return baseDelayMs + CARD_ENTRANCE_DELAY_MS + CARD_ENTRANCE_DURATION_MS + TYPE_START_GAP_MS + previousCardsDuration;
};

const getSlideAutoAdvanceMs = (cards: Array<{ title: string }>, baseDelayMs = 0) => {
  const lastCardCompletion = cards.reduce((maxDuration, card, cardIndex) => {
    const titleStart = getCardTypeStartDelay(cards, cardIndex, baseDelayMs);
    const cardCompletion = titleStart + getCardTypingTotalDuration(card);
    return Math.max(maxDuration, cardCompletion);
  }, 0);

  return lastCardCompletion + SLIDE_END_BUFFER_MS;
};

const TypewriterText: React.FC<{
  text: string;
  startDelay: number;
  charMs: number;
  className: string;
}> = ({ text, startDelay, charMs, className }) => {
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    setVisibleChars(0);

    let cancelled = false;
    let nextTimer: number | null = null;

    const getHumanizedDelay = (char: string) => {
      const punctuationPause = /[.,!?;:]/.test(char) ? 120 : 0;
      const spacePause = char === " " ? 20 : 0;
      const jitter = Math.floor((Math.random() - 0.5) * 18);
      return Math.max(20, charMs + punctuationPause + spacePause + jitter);
    };

    const typeNextChar = (charIndex: number) => {
      if (cancelled) return;
      const nextIndex = charIndex + 1;
      setVisibleChars(nextIndex);
      if (nextIndex >= text.length) return;

      const currentChar = text[nextIndex - 1] ?? "";
      nextTimer = window.setTimeout(() => typeNextChar(nextIndex), getHumanizedDelay(currentChar));
    };

    const delayTimer = window.setTimeout(() => {
      if (!text.length) return;
      typeNextChar(0);
    }, startDelay);

    return () => {
      cancelled = true;
      window.clearTimeout(delayTimer);
      if (nextTimer) window.clearTimeout(nextTimer);
    };
  }, [text, startDelay, charMs]);

  return (
    <p className={cn("relative", className)} aria-label={text}>
      <span aria-hidden="true" className="invisible block">
        {text}
      </span>
      <span aria-hidden="true" className="absolute inset-0 block">
        {text.slice(0, visibleChars)}
      </span>
    </p>
  );
};

const homeCarouselContent: Record<Locale, HomeCarouselContent> = {
  'pt-BR': {
    platformBadge: 'Plataforma Online',
    goToSlide: 'Ir para slide',
    slides: [
      {
        title: 'Criamos Soluções',
        subtitle: 'Painéis sob medida para cada necessidade',
        description: 'Criamos painéis personalizados para pessoas e empresas, com módulos sob medida para cada operação.',
        image: slide02,
      },
      {
        title: 'Painel via API',
        subtitle: 'Integre por API ou use direto no painel',
        description: 'Conecte seus sistemas com rapidez e opere consultas e serviços em um ambiente único e eficiente.',
        image: slide01,
      },
      {
        title: 'Integração Segura',
        subtitle: 'Conecte bots, apps e processos internos',
        description: 'Integrações com estabilidade, proteção de dados e privacidade para manter sua operação segura.',
        image: slide03,
      },
      {
        title: 'Loja Virtual Fácil',
        subtitle: 'Publique sua loja online em poucos cliques',
        description: 'Transforme seu catálogo em vitrine digital e comece a vender com uma estrutura simples e prática.',
        image: slide04,
      },
      {
        title: 'Controle de Produtos',
        subtitle: 'Cadastro, edição e gestão em um só painel',
        description: 'Organize categorias, preços e descrições com agilidade para manter seu catálogo sempre atualizado.',
        image: slide02,
      },
      {
        title: 'Controle de Estoque',
        subtitle: 'Acompanhe saldo e movimentações em tempo real',
        description: 'Tenha visão clara do estoque para evitar rupturas, melhorar decisões e manter a operação eficiente.',
        image: slide04,
      },
    ],
    stats: [
      { value: '99,9%', label: 'Disponibilidade' },
      { value: '100%', label: 'Criptografia' },
      { value: 'LGPD', label: 'Conformidade' },
      { value: '24h', label: 'Suporte Telegram' },
    ],
    featureCards: [
      { title: 'Validação de dados cadastrais', desc: 'Qualidade e consistência para cadastro' },
      { title: 'Checagem de status em tempo real', desc: 'Atualização contínua para cada consulta' },
      { title: 'Consulta de registros oficiais', desc: 'Dados confiáveis para fluxos críticos' },
      { title: 'Integração com bots e aplicativos', desc: 'Conexão estável com seus sistemas' },
      { title: 'Relatórios rápidos e criptografados', desc: 'Informação acionável com privacidade' },
    ],
  },
  en: {
    platformBadge: 'Online Platform',
    goToSlide: 'Go to slide',
    slides: [
      {
        title: 'Real-Time Registration Data',
        subtitle: 'Smart validation',
        description: 'Access accurate and updated registration data directly in your system.',
        image: slide02,
      },
      {
        title: 'Test our API in our panel',
        subtitle: 'Integrate via API or use directly in the panel',
        description: 'Sell and operate in both models: technical integration and immediate interface usage.',
        image: slide01,
      },
      {
        title: 'Secure Real-Time Integration',
        subtitle: 'Connect bots, apps, and internal processes with ease',
        description: 'Connect bots, apps, and internal flows with stability and full privacy.',
        image: slide03,
      },
      {
        title: 'Reliable Security Compliance',
        subtitle: 'End-to-end encryption with trusted infrastructure',
        description: 'Scale with continuous performance, compliance, and full protection.',
        image: slide04,
      },
    ],
    stats: [
      { value: '99.9%', label: 'Availability' },
      { value: '100%', label: 'Encryption' },
      { value: 'Compliance', label: 'Standards' },
      { value: '24h', label: 'Telegram Support' },
    ],
    featureCards: [
      { title: 'Registration data validation', desc: 'Quality and consistency for onboarding' },
      { title: 'Real-time status checks', desc: 'Continuous updates for each query' },
      { title: 'Official records lookup', desc: 'Reliable data for critical flows' },
      { title: 'Bot and app integration', desc: 'Stable connection with your systems' },
      { title: 'Fast encrypted reports', desc: 'Actionable information with privacy' },
    ],
  },
  es: {
    platformBadge: 'Plataforma en línea',
    goToSlide: 'Ir al slide',
    slides: [
      {
        title: 'Datos Registrales en Tiempo Real',
        subtitle: 'Validación inteligente',
        description: 'Accede a datos registrales precisos y actualizados directamente en tu sistema.',
        image: slide02,
      },
      {
        title: 'Prueba nuestra API en nuestro panel',
        subtitle: 'Integra por API o úsala directo en el panel',
        description: 'Vende y opera en ambos modelos: integración técnica y uso inmediato de la interfaz.',
        image: slide01,
      },
      {
        title: 'Integración Segura en Tiempo Real',
        subtitle: 'Conecta bots, apps y procesos internos con facilidad',
        description: 'Conecta bots, apps y flujos internos con estabilidad y privacidad total.',
        image: slide03,
      },
      {
        title: 'Cumplimiento Seguro y Real',
        subtitle: 'Cifrado de extremo a extremo con infraestructura confiable',
        description: 'Escala con rendimiento continuo, cumplimiento y protección completa.',
        image: slide04,
      },
    ],
    stats: [
      { value: '99,9%', label: 'Disponibilidad' },
      { value: '100%', label: 'Cifrado' },
      { value: 'Cumplimiento', label: 'Normativas' },
      { value: '24h', label: 'Soporte Telegram' },
    ],
    featureCards: [
      { title: 'Validación de datos registrales', desc: 'Calidad y consistencia para el registro' },
      { title: 'Verificación en tiempo real', desc: 'Actualización continua para cada consulta' },
      { title: 'Consulta de registros oficiales', desc: 'Datos confiables para flujos críticos' },
      { title: 'Integración con bots y apps', desc: 'Conexión estable con tus sistemas' },
      { title: 'Reportes rápidos cifrados', desc: 'Información accionable con privacidad' },
    ],
  },
};

const HomeCarouselSection: React.FC = () => {
  const { currentVisualTheme } = useSiteTheme();
  const { locale } = useLocale();
  const content = homeCarouselContent[locale];
  const isMatrix = currentVisualTheme === "matrix";
  const [active, setActive] = useState(0);
  const [loadedSlides, setLoadedSlides] = useState<boolean[]>([]);

  const slides = useMemo<Slide[]>(() => content.slides, [content.slides]);

  const goToNextSlide = useCallback(() => {
    setActive((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goToPrevSlide = useCallback(() => {
    setActive((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    let isMounted = true;
    setLoadedSlides(new Array(slides.length).fill(false));

    slides.forEach((slide, idx) => {
      const img = new Image();
      img.src = slide.image;

      const markAsLoaded = () => {
        if (!isMounted) return;
        setLoadedSlides((prev) => {
          const next = prev.length === slides.length ? [...prev] : new Array(slides.length).fill(false);
          if (next[idx]) return prev;
          next[idx] = true;
          return next;
        });
      };

      if (img.complete) {
        markAsLoaded();
      } else {
        img.onload = markAsLoaded;
        img.onerror = markAsLoaded;
      }
    });

    return () => {
      isMounted = false;
    };
  }, [slides]);

  const stats = content.stats;

  const featureCards = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: content.featureCards[0].title,
      desc: content.featureCards[0].desc,
      delay: 0.3,
      initial: { opacity: 0, x: 80, rotate: 5 },
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: content.featureCards[1].title,
      desc: content.featureCards[1].desc,
      delay: 0.45,
      initial: { opacity: 0, x: 100, y: 20, scale: 0.85 },
    },
    {
      icon: <FileSearch className="h-5 w-5" />,
      title: content.featureCards[2].title,
      desc: content.featureCards[2].desc,
      delay: 0.6,
      initial: { opacity: 0, x: 60, y: 40, rotate: -3 },
    },
    {
      icon: <ArrowRight className="h-5 w-5" />,
      title: content.featureCards[3].title,
      desc: content.featureCards[3].desc,
      delay: 0.75,
      initial: { opacity: 0, x: 90, y: 15, rotate: 2 },
    },
    {
      icon: <ArrowRight className="h-5 w-5" />,
      title: content.featureCards[4].title,
      desc: content.featureCards[4].desc,
      delay: 0.9,
      initial: { opacity: 0, x: 70, y: 20, rotate: -2 },
    },
  ];

  const cardsPerSlide = 3;
  const startCardIndex = active % featureCards.length;
  const visibleFeatureCards = Array.from({ length: Math.min(cardsPerSlide, featureCards.length) }, (_, idx) =>
    featureCards[(startCardIndex + idx) % featureCards.length]
  );
  const infoBoxTypingDuration = getInfoBoxTypingDuration(slides[active]);
  const cardsTypingBaseDelay = infoBoxTypingDuration + INFO_TO_CARDS_GAP_MS;

  useEffect(() => {
    const autoAdvanceDelay = getSlideAutoAdvanceMs(visibleFeatureCards, cardsTypingBaseDelay);
    const timer = window.setTimeout(() => {
      goToNextSlide();
    }, autoAdvanceDelay);

    return () => window.clearTimeout(timer);
  }, [active, cardsTypingBaseDelay, goToNextSlide, visibleFeatureCards]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldSlide = Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 450;
    if (!shouldSlide) return;

    if (info.offset.x < 0 || info.velocity.x < 0) {
      goToNextSlide();
      return;
    }

    goToPrevSlide();
  };

  return (
    <motion.section
      aria-label="Hero"
      className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.12}
      onDragEnd={handleDragEnd}
      style={{ touchAction: "pan-y" }}
    >
      {/* Background images with crossfade */}
      <div className="absolute inset-0">
        <div className={cn("absolute inset-0", isMatrix ? "bg-black" : "bg-foreground")} />
        {slides.map((slide, idx) => (
          <motion.div
            key={idx}
            className="absolute inset-0"
            initial={false}
            animate={{
              opacity:
                idx === active &&
                loadedSlides[idx] &&
                true
                  ? 1
                  : 0,
              scale: idx === active ? 1 : 1.04,
              filter: idx === active ? "blur(0px)" : "blur(4px)",
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            {!isMatrix && (
              <img
                src={slide.image}
                alt=""
                loading="eager"
                className="w-full h-full object-cover scale-105"
              />
            )}
          </motion.div>
        ))}

        {/* Overlay gradients */}
        {!isMatrix ? (
          <>
            <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
            <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/60 via-transparent to-black/30" />
          </>
        ) : (
          <div className="absolute inset-0 z-[1] bg-black/90" />
        )}

        {/* Surreal glow accents */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30",
              isMatrix ? "bg-green-500" : "bg-[hsl(262,83%,58%)]"
            )}
          />
          <motion.div
            animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[140px] opacity-20",
              isMatrix ? "bg-green-400" : "bg-secondary"
            )}
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-[3] min-h-[520px] sm:min-h-[560px] lg:min-h-[600px] flex items-center">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl w-full py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left: Text + Search */}
            <div className="space-y-6 text-left flex flex-col items-start">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase",
                    isMatrix
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-white/10 text-white/90 border border-white/15 backdrop-blur-sm"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                  {content.platformBadge}
                </span>
              </motion.div>

              {/* Title */}
              <AnimatePresence mode="wait">
                <motion.h1
                  key={`title-${active}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.5 }}
                  className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-white leading-[1.1]"
                >
                  {slides[active].title}
                </motion.h1>
              </AnimatePresence>

              {/* Subtitle with glass */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`sub-${active}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className={cn(
                    "inline-block rounded-xl px-4 py-3",
                    isMatrix
                      ? "bg-black/40 border border-green-500/15"
                      : "bg-white/10 border border-white/15"
                  )}
                  style={{
                    backdropFilter: "blur(20px) saturate(1.4)",
                    WebkitBackdropFilter: "blur(20px) saturate(1.4)",
                  }}
                >
                  <TypewriterText
                    text={slides[active].subtitle}
                    startDelay={INFO_TYPING_START_DELAY_MS}
                    charMs={INFO_TITLE_CHAR_MS}
                    className="text-sm sm:text-base text-white/90 leading-relaxed max-w-[44ch] font-semibold sm:whitespace-nowrap"
                  />
                  <TypewriterText
                    text={slides[active].description}
                    startDelay={
                      INFO_TYPING_START_DELAY_MS +
                      getTypingDuration(slides[active].subtitle, INFO_TITLE_CHAR_MS) +
                      INFO_TITLE_TO_DESC_GAP_MS
                    }
                    charMs={INFO_DESC_CHAR_MS}
                    className="text-xs sm:text-sm text-white/70 leading-relaxed max-w-[50ch] mt-2 line-clamp-2 min-h-[2.5rem] sm:min-h-[2.875rem]"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex items-center gap-6 pt-2"
              >
                {stats.map((stat, i) => (
                  <div key={i} className="flex flex-col">
                    <span
                      className={cn(
                        "text-lg sm:text-xl font-bold",
                        isMatrix ? "text-green-400" : "text-white"
                      )}
                    >
                      {stat.value}
                    </span>
                    <span className="text-[11px] sm:text-xs text-white/50 uppercase tracking-wider">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: Floating glass cards */}
            <div className="hidden lg:flex flex-col items-end justify-center gap-5 relative min-h-[320px]">
              {/* Central orb glow */}
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.6, 0.4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className={cn(
                  "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[60px] pointer-events-none",
                  isMatrix ? "bg-green-500/30" : "bg-[hsl(262,83%,58%)]/25"
                )}
              />

              {/* Feature cards - aligned right with unique entrance animations */}
              {visibleFeatureCards.map((card, i) => {
                const cardTypingStartDelay = getCardTypeStartDelay(visibleFeatureCards, i, cardsTypingBaseDelay);
                const cardEntranceDelay = Math.max(0, cardTypingStartDelay - 180);

                return (
                  <motion.div
                    key={`${active}-${card.title}`}
                    initial={card.initial}
                    animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
                    transition={{ duration: 0.7, delay: cardEntranceDelay / 1000, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -6, scale: 1.04, transition: { duration: 0.25 } }}
                    className={cn(
                      "relative z-10 w-[260px] rounded-2xl p-4 cursor-default self-end",
                      isMatrix
                        ? "bg-black/50 border border-green-500/20"
                        : "bg-white/10 border border-white/15"
                    )}
                    style={{
                      backdropFilter: "blur(24px) saturate(1.5)",
                      WebkitBackdropFilter: "blur(24px) saturate(1.5)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          isMatrix
                            ? "bg-green-500/15 text-white"
                            : "bg-secondary/20 text-white"
                        )}
                        animate={{
                          opacity: [0.9, 1, 0.9],
                          scale: [1, 1.04, 1],
                          filter: [
                            "drop-shadow(0 0 0px hsl(var(--primary-foreground) / 0))",
                            "drop-shadow(0 0 8px hsl(var(--primary-foreground) / 0.45))",
                            "drop-shadow(0 0 0px hsl(var(--primary-foreground) / 0))",
                          ],
                        }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                      >
                        {card.icon}
                      </motion.div>
                      <div>
                        <TypewriterText
                          text={card.title}
                          startDelay={cardTypingStartDelay}
                          charMs={TITLE_CHAR_MS}
                          className="text-sm font-semibold text-white"
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Slide indicators */}
          <div className="flex items-center gap-2 mt-10">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${content.goToSlide} ${i + 1}`}
                onClick={() => setActive(i)}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === active
                    ? cn("w-8", isMatrix ? "bg-green-400" : "bg-white")
                    : "w-2 bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default HomeCarouselSection;
