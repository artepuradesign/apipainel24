import React, { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CircleHelp, Package, RefreshCw, X } from "lucide-react";
import * as Icons from "lucide-react";
import { useLocation } from "react-router-dom";
import { useApiModules } from "@/hooks/useApiModules";

interface SimpleTitleBarProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  leftActions?: React.ReactNode;
  leftActionsTooltip?: string;
  useModuleMetadata?: boolean;
}

const SimpleTitleBar = ({
  title,
  subtitle,
  onBack,
  icon,
  right,
  leftActions,
  leftActionsTooltip,
  useModuleMetadata = true,
}: SimpleTitleBarProps) => {
  const [isMobileSubtitleOpen, setIsMobileSubtitleOpen] = useState(false);
  const [typedSubtitle, setTypedSubtitle] = useState("");
  const [activeActionBalloon, setActiveActionBalloon] = useState<"back" | "refresh" | "left" | null>(null);
  const location = useLocation();
  const { modules } = useApiModules();

  const normalizedPath = useMemo(() => {
    const path = (location?.pathname || "").trim();
    // ignora query/hash (pathname já vem limpo, mas deixamos robusto)
    return path || "/";
  }, [location?.pathname]);

  const currentModule = useMemo(() => {
    const normalizeToPath = (raw: string): string => {
      if (!raw) return "";
      const trimmed = raw.trim();
      if (trimmed.startsWith("/dashboard/")) return trimmed;
      if (trimmed.startsWith("dashboard/")) return `/${trimmed}`;
      if (trimmed.startsWith("/")) return `/dashboard${trimmed}`;
      return `/dashboard/${trimmed}`;
    };

    console.log('🔍 [SimpleTitleBar] Buscando módulo para:', normalizedPath);
    console.log('🔍 [SimpleTitleBar] Total de módulos:', modules?.length);

    const match = (modules || []).find((m: any) => {
      const apiEndpoint = normalizeToPath(m?.api_endpoint || "");
      const modulePath = normalizeToPath(m?.path || "");
      
      const isMatch = (apiEndpoint && apiEndpoint === normalizedPath) || 
             (modulePath && modulePath === normalizedPath);
      
      if (isMatch) {
        console.log('✅ [SimpleTitleBar] Módulo encontrado:', m?.title, 'icon:', m?.icon);
      }
      
      return isMatch;
    });

    if (!match) {
      console.log('❌ [SimpleTitleBar] Nenhum módulo encontrado para:', normalizedPath);
      // Log dos primeiros 5 módulos para debug
      (modules || []).slice(0, 5).forEach((m: any) => {
        console.log('  📦 Módulo:', m?.title, '| api_endpoint:', m?.api_endpoint, '| path:', m?.path);
      });
    }

    return match || null;
  }, [modules, normalizedPath]);

  const moduleTitle = currentModule?.title?.toString().trim() || "";
  const moduleDescription = currentModule?.description?.toString().trim() || "";

  // Obter o componente do ícone dinamicamente
  const ModuleIcon = useMemo(() => {
    if (icon) return null; // Se já foi passado um ícone, não precisamos buscar

    const iconName = currentModule?.icon;
    if (!iconName) return Package;

    const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<any>;
    return IconComponent || Package;
  }, [currentModule?.icon, icon]);

  // Obter a cor do módulo
  const moduleColor = currentModule?.color || null;

  const displayTitle = useModuleMetadata ? (moduleTitle || title) : title;
  const displaySubtitle = useModuleMetadata ? (moduleDescription || subtitle) : subtitle;
  const handleActionBalloonOpen = (balloon: "back" | "refresh" | "left") => {
    setActiveActionBalloon(balloon);
    setIsMobileSubtitleOpen(false);
  };
  const handleActionBalloonClose = () => setActiveActionBalloon(null);
  const subtitlePreview = useMemo(() => {
    if (!displaySubtitle) return '';
    if (displaySubtitle.length <= 85) return displaySubtitle;
    return `${displaySubtitle.slice(0, 85).trimEnd()}...`;
  }, [displaySubtitle]);

  useEffect(() => {
    if (!isMobileSubtitleOpen || !displaySubtitle) {
      setTypedSubtitle("");
      return;
    }

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTypedSubtitle(displaySubtitle);
      return;
    }

    let cursor = 0;
    setTypedSubtitle("");

    const timer = window.setInterval(() => {
      cursor += 1;
      const nextValue = displaySubtitle.slice(0, cursor);
      setTypedSubtitle(nextValue);

      if (cursor >= displaySubtitle.length) {
        window.clearInterval(timer);
      }
    }, 20);

    return () => window.clearInterval(timer);
  }, [displaySubtitle, isMobileSubtitleOpen]);

  // Gerar estilos dinâmicos baseados na cor do módulo
  const getIconStyles = () => {
    if (moduleColor) {
      return {
        backgroundColor: `${moduleColor}15`, // 15% opacity
        borderColor: `${moduleColor}30`, // 30% opacity
      };
    }
    return {};
  };

  // Renderizar o ícone grande à esquerda
  const renderLargeIcon = () => {
    if (icon) {
      const sizedIcon = React.isValidElement(icon)
        ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
            className: `h-6 w-6 md:h-7 md:w-7 ${(icon as React.ReactElement<{ className?: string }>).props.className || ''}`.trim(),
          })
        : icon;

          return (
            <div 
              className="shrink-0 p-1 rounded-lg border"
          style={moduleColor ? getIconStyles() : undefined}
        >
          <span style={moduleColor ? { color: moduleColor } : undefined} className={!moduleColor ? "text-primary" : ""}>
            {sizedIcon}
          </span>
        </div>
      );
    }
    
    // Mostrar ícone dinâmico em todas as telas
    if (ModuleIcon) {
          return (
            <div 
              className="shrink-0 p-1 rounded-lg border"
          style={moduleColor ? getIconStyles() : undefined}
        >
              <ModuleIcon 
                className="h-6 w-6 md:h-7 md:w-7" 
            style={moduleColor ? { color: moduleColor } : undefined}
          />
        </div>
      );
    }

    return null;
  };

  const iconElement = renderLargeIcon();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="px-3 py-3 md:px-4 md:py-3">
        <div className="relative flex items-center gap-2">
          <div className="relative" onMouseLeave={handleActionBalloonClose}>
            <Button
              variant="outline"
              size="icon"
              onClick={onBack}
              onMouseEnter={() => handleActionBalloonOpen("back")}
              className="rounded-full h-8 w-8 shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            {activeActionBalloon === "back" ? (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md z-20 whitespace-nowrap">
                Voltar
              </div>
            ) : null}
          </div>

          <div className="relative" onMouseLeave={handleActionBalloonClose}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.location.reload()}
              onMouseEnter={() => handleActionBalloonOpen("refresh")}
              className="rounded-full h-8 w-8 shrink-0"
              aria-label="Atualizar página"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {activeActionBalloon === "refresh" ? (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md z-20 whitespace-nowrap">
                Atualizar
              </div>
            ) : null}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setActiveActionBalloon(null);
              setIsMobileSubtitleOpen((prev) => !prev);
            }}
            className="rounded-full h-8 w-8 shrink-0"
            aria-label="Ajuda"
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </Button>

          {leftActions ? (
            <div
              className="relative flex items-center gap-2 shrink-0"
              onMouseEnter={() => handleActionBalloonOpen("left")}
              onMouseLeave={handleActionBalloonClose}
            >
              {leftActions}
              {activeActionBalloon === "left" ? (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md z-20 whitespace-nowrap">
                  {leftActionsTooltip || "Adicionar"}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="ml-auto flex items-center gap-3 min-w-0">
            {right ? right : null}
            <div
              className="min-w-0 text-right flex flex-col items-end gap-0 relative"
            >
              <CardTitle className="text-base md:text-lg leading-none m-0 p-0">
                <span className="truncate">{displayTitle}</span>
              </CardTitle>

              {displaySubtitle ? (
                <p className="hidden sm:block text-xs md:text-xs lg:text-xs text-muted-foreground -mt-1 md:-mt-1 leading-none whitespace-nowrap overflow-hidden text-ellipsis max-w-[420px]">
                  {subtitlePreview}
                </p>
              ) : null}
            </div>
            {iconElement}
          </div>

          {displaySubtitle && isMobileSubtitleOpen ? (
            <>
              <button
                type="button"
                onClick={() => setIsMobileSubtitleOpen(false)}
                className="fixed inset-0 bg-foreground/45 z-10"
                aria-label="Fechar destaque da descrição"
              />
              <div className="absolute top-full left-1/2 sm:left-auto sm:right-0 -translate-x-1/2 sm:translate-x-0 mt-2 w-[320px] max-w-[calc(100vw-1rem)] rounded-md border border-border bg-popover px-4 py-3 text-left shadow-md z-20 overflow-visible">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsMobileSubtitleOpen(false);
                  }}
                className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-popover text-popover-foreground shadow-sm z-10 transition-colors hover:bg-popover-foreground hover:text-popover"
                  aria-label="Fechar descrição"
                  title="Fechar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <p className="text-sm text-popover-foreground leading-tight pr-1">{typedSubtitle || displaySubtitle}</p>
              </div>
            </>
          ) : null}
        </div>
      </CardHeader>
    </Card>
  );
};

export default SimpleTitleBar;
