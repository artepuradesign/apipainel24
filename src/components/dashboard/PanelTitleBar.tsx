import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, CircleHelp, Plus, X } from 'lucide-react';

interface PanelTitleBarProps {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  badge?: React.ReactNode;
  isExpanded?: boolean;
  isReorderEnabled?: boolean;
  showAddButton?: boolean;
  onIconHoldStart?: () => void;
  onIconHoldEnd?: () => void;
  onAdd?: () => void;
  onToggle?: () => void;
}

const PanelTitleBar: React.FC<PanelTitleBarProps> = ({
  title,
  icon,
  description,
  badge,
  isExpanded = true,
  isReorderEnabled = false,
  showAddButton = false,
  onIconHoldStart,
  onIconHoldEnd,
  onAdd,
  onToggle,
}) => {
  const [isHelpBalloonOpen, setIsHelpBalloonOpen] = React.useState(false);
  const [typedDescription, setTypedDescription] = React.useState('');
  const [isMobileViewport, setIsMobileViewport] = React.useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));
  const [mobileBalloonTop, setMobileBalloonTop] = React.useState<number | undefined>(undefined);
  const helpButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const updateMobileBalloonPosition = React.useCallback(() => {
    if (typeof window === 'undefined') return;

    const mobile = window.innerWidth < 640;
    setIsMobileViewport(mobile);

    if (!mobile || !helpButtonRef.current) return;

    const rect = helpButtonRef.current.getBoundingClientRect();
    setMobileBalloonTop(rect.bottom + 8);
  }, []);

  const toggleHelpBalloon = React.useCallback(() => {
    if (isHelpBalloonOpen) {
      setIsHelpBalloonOpen(false);
      return;
    }

    updateMobileBalloonPosition();
    setIsHelpBalloonOpen(true);
  }, [isHelpBalloonOpen, updateMobileBalloonPosition]);

  React.useEffect(() => {
    updateMobileBalloonPosition();

    const handleResize = () => {
      updateMobileBalloonPosition();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateMobileBalloonPosition]);

  React.useEffect(() => {
    if (!isHelpBalloonOpen || !description) {
      setTypedDescription('');
      return;
    }

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedDescription(description);
      return;
    }

    let cursor = 0;
    setTypedDescription('');

    const timer = window.setInterval(() => {
      cursor += 1;
      const nextValue = description.slice(0, cursor);
      setTypedDescription(nextValue);

      if (cursor >= description.length) {
        window.clearInterval(timer);
      }
    }, 20);

    return () => window.clearInterval(timer);
  }, [description, isHelpBalloonOpen]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="px-3 py-3 md:px-4 md:py-3">
        <div className="relative flex items-center gap-3 min-w-0">
          {icon ? (
            <button
              type="button"
              className={`shrink-0 p-2 rounded-lg border border-border bg-accent/40 ${isReorderEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
              aria-label="Pressione e segure por 1 segundo para ordenar painéis"
              onPointerDown={onIconHoldStart}
              onPointerUp={onIconHoldEnd}
              onPointerLeave={onIconHoldEnd}
            >
              {icon}
            </button>
          ) : null}
          <CardTitle className="text-base md:text-lg leading-none truncate">{title}</CardTitle>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {badge ? <div>{badge}</div> : null}
            {description ? (
              <div
                className="relative"
              >
                <Button
                  ref={helpButtonRef}
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full h-8 w-8 shrink-0"
                  aria-label={`Ajuda sobre ${title}`}
                  onClick={toggleHelpBalloon}
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
            {showAddButton ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full shrink-0"
                aria-label="Adicionar"
                onClick={onAdd}
              >
                <Plus className="h-4 w-4" />
              </Button>
            ) : null}
            {onToggle ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8 rounded-full"
                aria-label={isExpanded ? 'Recolher painel' : 'Expandir painel'}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            ) : null}
          </div>

          {description && isHelpBalloonOpen ? (
            <>
              <button
                type="button"
                onClick={() => setIsHelpBalloonOpen(false)}
                className="fixed inset-0 bg-foreground/45 z-10"
                aria-label="Fechar destaque da descrição"
              />
              <div
                className="fixed sm:absolute top-0 sm:top-full left-1/2 sm:left-auto sm:right-0 -translate-x-1/2 sm:translate-x-0 mt-0 sm:mt-2 w-[320px] max-w-[calc(100vw-1rem)] rounded-md border border-border bg-popover px-4 py-3 text-left shadow-md z-20 overflow-visible"
                style={isMobileViewport && mobileBalloonTop ? { top: mobileBalloonTop } : undefined}
              >
                <button
                  type="button"
                  className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-popover text-popover-foreground shadow-sm z-10 transition-colors hover:bg-popover-foreground hover:text-popover"
                  aria-label="Fechar ajuda"
                  title="Fechar"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsHelpBalloonOpen(false);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <p className="text-sm text-popover-foreground leading-tight pr-1">{typedDescription || description}</p>
              </div>
            </>
          ) : null}
        </div>
      </CardHeader>
    </Card>
  );
};

export default PanelTitleBar;