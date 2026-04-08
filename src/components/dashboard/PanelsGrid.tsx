
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, Reorder, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Panel } from '@/utils/apiService';
import { useApiModules } from '@/hooks/useApiModules';
import { useUserBalance } from '@/hooks/useUserBalance';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleTemplate } from '@/contexts/ModuleTemplateContext';
import * as Icons from 'lucide-react';
import { Package, Lock, ShoppingCart } from 'lucide-react';
import EmptyState from '../ui/empty-state';
import ModuleCardTemplates from '@/components/configuracoes/personalization/ModuleCardTemplates';
import ModuleGridWrapper from '@/components/configuracoes/personalization/ModuleGridWrapper';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useIsMobile } from '@/hooks/use-mobile';
import { useModuleRecords } from '@/hooks/useModuleRecords';
import { useLiquidGlass } from '@/contexts/LiquidGlassContext';
import { useTheme } from '@/components/ThemeProvider';
import { usePixPaymentFlow } from '@/hooks/usePixPaymentFlow';
import { useUserDataApi } from '@/hooks/useUserDataApi';
import { moduleHistoryService } from '@/services/moduleHistoryService';
import { pdfRgService } from '@/services/pdfRgService';
import PixQRCodeModal from '@/components/payment/PixQRCodeModal';
import FloatingPendingPix from '@/components/payment/FloatingPendingPix';
import QRCode from 'react-qr-code';
import { API_BASE_URL } from '@/config/apiConfig';
import { formatMoneyBR } from '@/utils/formatters';
import { getModulePrice } from '@/utils/modulePrice';
import PanelTitleBar from '@/components/dashboard/PanelTitleBar';

interface PanelsGridProps {
  activePanels: Panel[];
}

const PanelsGrid: React.FC<PanelsGridProps> = ({ activePanels }) => {
  const { config: liquidGlassConfig } = useLiquidGlass();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Build inline glass style matching the LiquidGlassAdmin preview model
  const glassStyle = useMemo<React.CSSProperties>(() => {
    if (!liquidGlassConfig.enabled) return {};
    const filter = `blur(${liquidGlassConfig.strength + liquidGlassConfig.extraBlur}px) saturate(${liquidGlassConfig.tintSaturation}%) contrast(${liquidGlassConfig.contrast}%) brightness(${liquidGlassConfig.brightness}%) invert(${liquidGlassConfig.invert}%) hue-rotate(${liquidGlassConfig.tintHue}deg)`;
    
    const bgAlpha = Math.max(liquidGlassConfig.backgroundAlpha / 100, 0.96);
    const specHighAlpha = liquidGlassConfig.edgeSpecularity / 200;
    const specLowAlpha = liquidGlassConfig.edgeSpecularity / 300;
    const borderAlpha = Math.max(liquidGlassConfig.backgroundAlpha / 200, 0.35);
    
    return {
      borderRadius: `${liquidGlassConfig.cornerRadius}px`,
      backdropFilter: filter,
      WebkitBackdropFilter: filter,
      background: `rgba(255,255,255,${bgAlpha})`,
      boxShadow: `0 0 ${liquidGlassConfig.softness}px rgba(255,255,255,${specHighAlpha}), inset 0 1px 0 rgba(255,255,255,${specLowAlpha})`,
      opacity: liquidGlassConfig.opacity / 100,
      border: `1px solid rgba(255,255,255,${borderAlpha})`,
    };
  }, [liquidGlassConfig, isDark]);
  
  const glassClass = liquidGlassConfig.enabled ? '' : 'bg-card border border-border';
  const { modules, isLoading: isModulesLoading } = useApiModules();
  const { 
    calculateDiscountedPrice, 
    subscription, 
    planInfo, 
    discountPercentage, 
    hasActiveSubscription 
  } = useUserSubscription();
  const { totalAvailableBalance, isLoading: isBalanceLoading, hasLoadedOnce, loadTotalAvailableBalance } = useUserBalance();
  const { user } = useAuth();
  const canConfigureModules = (user as any)?.user_role === 'suporte' || (user as any)?.user_role === 'admin';
  const { selectedTemplate } = useModuleTemplate();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { hasRecordsInModule } = useModuleRecords();
  const { userData } = useUserDataApi();
  const { loading: pixLoading, pixResponse, checkingPayment, createPixPayment, checkPaymentStatus, generateNewPayment, cancelPayment } = usePixPaymentFlow();
  
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixModuleAmount, setPixModuleAmount] = useState(0);
  const [purchasingModule, setPurchasingModule] = useState<{ title: string; route: string } | null>(null);
  const [showFloatingPix, setShowFloatingPix] = useState(false);
  const [notificationToastId, setNotificationToastId] = useState<string | number | null>(null);
  const [moduleRecordsCountByRoute, setModuleRecordsCountByRoute] = useState<Record<string, number>>({});
  const [collapsedPanels, setCollapsedPanels] = useState<Record<number, boolean>>({});
  const [orderedPanels, setOrderedPanels] = useState<Panel[]>(activePanels);
  const [animatedTitlePanelIds, setAnimatedTitlePanelIds] = useState<Set<number>>(new Set());
  const [initiallyExpandedPanelIds, setInitiallyExpandedPanelIds] = useState<Set<number>>(new Set());
  const [isTitleRevealComplete, setIsTitleRevealComplete] = useState(false);
  const [isInitialRevealComplete, setIsInitialRevealComplete] = useState(false);
  const [isManualReorderEnabled, setIsManualReorderEnabled] = useState(false);
  const iconHoldTimerRef = useRef<number | null>(null);
  const revealTimersRef = useRef<number[]>([]);
  const hasStartedInitialRevealRef = useRef(false);

  useEffect(() => {
    setOrderedPanels((prev) => {
      if (!prev.length) return activePanels;

      const incomingById = new Map(activePanels.map((panel) => [panel.id, panel]));
      const kept = prev
        .map((panel) => incomingById.get(panel.id))
        .filter((panel): panel is Panel => Boolean(panel));
      const keptIds = new Set(kept.map((panel) => panel.id));
      const appended = activePanels.filter((panel) => !keptIds.has(panel.id));
      const next = [...kept, ...appended];

      const isSameOrderAndRefs =
        prev.length === next.length &&
        prev.every((panel, index) => panel.id === next[index]?.id && panel === next[index]);

      return isSameOrderAndRefs ? prev : next;
    });
  }, [activePanels]);

  useEffect(() => {
    let cancelled = false;

    const getCountFromRoute = async (route: string): Promise<number> => {
      const [stats, history] = await Promise.all([
        moduleHistoryService.getStats(route),
        moduleHistoryService.getHistory(route, 1, 0),
      ]);

      const totalFromStats = stats.success ? Number(stats.data?.total || 0) : 0;
      const totalFromHistory = history.success ? Number(history.data?.total || 0) : 0;
      return Math.max(totalFromStats, totalFromHistory);
    };

    const loadRegistroGeralCount = async () => {
      if (!user) {
        setModuleRecordsCountByRoute({});
        return;
      }

      const userId = Number(user.id);
      const pdfRgListResponse = await pdfRgService.listar({ limit: 1000, offset: 0, user_id: userId });

      if (cancelled) return;

      const pedidos = pdfRgListResponse.success ? (pdfRgListResponse.data?.data || []) : [];

      const pdfRgModuleId = modules.find((m) => getModulePageRoute(m) === '/dashboard/pdf-rg')?.id;
      const imprimirRgModuleId = modules.find((m) => getModulePageRoute(m) === '/dashboard/imprimir-rg')?.id;

      const totalPdfRgByModule = pdfRgModuleId
        ? pedidos.filter((pedido) => Number(pedido.module_id) === Number(pdfRgModuleId)).length
        : 0;

      const totalImprimirRgByModule = imprimirRgModuleId
        ? pedidos.filter((pedido) => Number(pedido.module_id) === Number(imprimirRgModuleId)).length
        : 0;

      if (totalPdfRgByModule > 0 || totalImprimirRgByModule > 0) {
        setModuleRecordsCountByRoute((prev) => ({
          ...prev,
          '/dashboard/pdf-rg': totalPdfRgByModule,
          '/dashboard/pdf-rg/': totalPdfRgByModule,
          '/dashboard/imprimir-rg': totalImprimirRgByModule,
          '/dashboard/imprimir-rg/': totalImprimirRgByModule,
        }));
        return;
      }

      const [countPdfRg, countPdfRgSlash, countImprimirRg, countImprimirRgSlash] = await Promise.all([
        getCountFromRoute('/dashboard/pdf-rg'),
        getCountFromRoute('/dashboard/pdf-rg/'),
        getCountFromRoute('/dashboard/imprimir-rg'),
        getCountFromRoute('/dashboard/imprimir-rg/'),
      ]);

      if (cancelled) return;

      const registroGeralCount = Math.max(countPdfRg, countPdfRgSlash, countImprimirRg, countImprimirRgSlash);

      setModuleRecordsCountByRoute((prev) => ({
        ...prev,
        '/dashboard/pdf-rg': registroGeralCount,
        '/dashboard/pdf-rg/': registroGeralCount,
        '/dashboard/imprimir-rg': registroGeralCount,
        '/dashboard/imprimir-rg/': registroGeralCount,
      }));
    };

    loadRegistroGeralCount();

    return () => {
      cancelled = true;
    };
  }, [user, modules.length]);

  useEffect(() => {
    if (hasStartedInitialRevealRef.current || orderedPanels.length === 0 || isModulesLoading) return;

    const startTimer = window.setTimeout(() => {
      hasStartedInitialRevealRef.current = true;

      orderedPanels.forEach((panel, index) => {
        const titleTimer = window.setTimeout(() => {
          setAnimatedTitlePanelIds((prev) => {
            const next = new Set(prev);
            next.add(panel.id);
            return next;
          });

          if (index === orderedPanels.length - 1) {
            const titlesDoneTimer = window.setTimeout(() => {
              setIsTitleRevealComplete(true);
            }, 280);
            revealTimersRef.current.push(titlesDoneTimer);
          }
        }, index * 140);

        revealTimersRef.current.push(titleTimer);
      });

      const expandStartDelay = orderedPanels.length * 140 + 320;
      const expandStartTimer = window.setTimeout(() => {
        setIsTitleRevealComplete(true);

        orderedPanels.forEach((panel, index) => {
          const timer = window.setTimeout(() => {
            setInitiallyExpandedPanelIds((prev) => {
              const next = new Set(prev);
              next.add(panel.id);
              return next;
            });

            if (index === orderedPanels.length - 1) {
              setIsInitialRevealComplete(true);
            }
          }, index * 220);

          revealTimersRef.current.push(timer);
        });
      }, expandStartDelay);

      revealTimersRef.current.push(expandStartTimer);

    }, 120);

    revealTimersRef.current.push(startTimer);

    return () => {
      revealTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      revealTimersRef.current = [];
    };
  }, [orderedPanels, isModulesLoading]);

  const handleIconHoldStart = () => {
    if (iconHoldTimerRef.current !== null) {
      window.clearTimeout(iconHoldTimerRef.current);
    }

    iconHoldTimerRef.current = window.setTimeout(() => {
      setIsManualReorderEnabled((prev) => {
        const next = !prev;
        toast.success(next ? 'Ordenação manual ativada' : 'Ordenação manual desativada');
        return next;
      });
    }, 1000);
  };

  const handleIconHoldEnd = () => {
    if (iconHoldTimerRef.current !== null) {
      window.clearTimeout(iconHoldTimerRef.current);
      iconHoldTimerRef.current = null;
    }
  };
  
  // Obter plano atual (subscription > planInfo > fallback em localStorage)
  // Importante: parênteses para evitar precedência incorreta entre `||` e ternário.
  const currentPlan =
    subscription?.plan_name ||
    planInfo?.name ||
    (user ? localStorage.getItem(`user_plan_${user.id}`) || 'Pré-Pago' : 'Pré-Pago');

  // Desconto efetivo deve vir do plano configurado (discount_percentage) / assinatura.
  // Sem fallback local, para refletir exatamente a configuração da Personalização.
  // (o painel 38 é tratado como exceção mais abaixo, tanto na exibição quanto no clique)
  const effectiveDiscountPercentage = hasActiveSubscription ? (discountPercentage || 0) : 0;
  
  console.log('🔍 [PANELSGRID] Dados do plano da API:', {
    hasActiveSubscription,
    subscriptionPlan: subscription?.plan_name,
    planInfoName: planInfo?.name,
    discountPercentageFromAPI: discountPercentage,
    currentPlan,
    effectiveDiscountPercentage
  });
  
  const getIconComponent = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<any>;
    return IconComponent || Package;
  };

  const getPanelModules = (panelId: number) => {
    return modules.filter(module => 
      module.panel_id === panelId && 
      module.is_active === true && 
      module.operational_status === 'on'
    );
  };

  const getPanelTemplate = (panelId: number): 'corporate' | 'creative' | 'minimal' | 'modern' | 'elegant' | 'forest' | 'rose' | 'cosmic' | 'neon' | 'sunset' | 'arctic' | 'volcano' | 'matrix' => {
    const validTemplates = ['corporate', 'creative', 'minimal', 'modern', 'elegant', 'forest', 'rose', 'cosmic', 'neon', 'sunset', 'arctic', 'volcano', 'matrix'];
    const panel = activePanels.find(p => p.id === panelId);
    
    // PRIORIDADE ABSOLUTA: template específico do painel (configurado na personalização)
    if (panel?.template && validTemplates.includes(panel.template)) {
      const template = panel.template as 'corporate' | 'creative' | 'minimal' | 'modern' | 'elegant' | 'forest' | 'rose' | 'cosmic' | 'neon' | 'sunset' | 'arctic' | 'volcano' | 'matrix';
      console.log(`🎨 [TEMPLATE DASHBOARD] ✅ Painel ${panelId} (${panel.name}) usando template CONFIGURADO: ${template}`);
      return template;
    }
    
    // Fallback para 'modern' se não há template específico
    console.log(`⚠️ [TEMPLATE DASHBOARD] Painel ${panelId} sem template específico, usando fallback: modern (template do painel: ${panel?.template})`);
    return 'modern';
  };

  const formatPrice = (price: number | string) => {
    if (price === null || price === undefined || price === '') return '0,00';

    const numericValue = typeof price === 'string'
      ? Number(price.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))
      : Number(price);

    return formatMoneyBR(Number.isFinite(numericValue) ? numericValue : 0);
  };

  const getModulePageRoute = (module: any): string => {
    // Agora o campo `api_endpoint` representa a rota interna da página do módulo (ex.: /dashboard/consultar-cpf-simples)
    const raw = (module?.api_endpoint || module?.path || '').toString().trim();
    if (!raw) return `/module/${module.slug}`;
    if (raw.startsWith('/')) return raw;
    // Normaliza rotas internas digitadas sem a barra inicial
    if (raw.startsWith('dashboard/')) return `/${raw}`;
    // Se vier apenas o "slug" (ex.: consultar-cpf-simples), assume rota interna em /dashboard/
    if (!raw.includes('/')) return `/dashboard/${raw}`;
    // Fallback legado
    return `/module/${module.slug}`;
  };

  const parseModulePrice = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const normalized = String(value ?? '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getDisplayBasePrice = (module: any): number => {
    const route = getModulePageRoute(module);
    const modulePrice = parseModulePrice(module?.price);

    const shouldIncludeQrPrice =
      Number(module?.id) === 165 ||
      route === '/dashboard/pdf-rg' ||
      route === '/dashboard/imprimir-rg';

    if (!shouldIncludeQrPrice) {
      return modulePrice;
    }

    const qrModule = (modules || []).find((m: any) => getModulePageRoute(m) === '/dashboard/qrcode-rg-1m');
    const qrPriceFromApi = parseModulePrice(qrModule?.price);
    const qrPrice = qrPriceFromApi > 0 ? qrPriceFromApi : getModulePrice('/dashboard/qrcode-rg-1m');

    return modulePrice + qrPrice;
  };

  // Comparação financeira em centavos para evitar erro de ponto flutuante
  const toCents = (value: number) => Math.round((Number(value) || 0) * 100);
  const hasEnoughBalance = (balance: number, price: number) => toCents(balance) >= toCents(price);
  const getMissingAmount = (price: number, balance: number) => Math.max((toCents(price) - toCents(balance)) / 100, 0);

  // Handler para compra direta via PIX no overlay do módulo
  const handleDirectPurchase = async (e: React.MouseEvent, amount: number, module: any) => {
    e.stopPropagation();
    const remaining = getMissingAmount(amount, totalAvailableBalance);

    if (remaining <= 0) {
      navigate(getModulePageRoute(module));
      return;
    }

    setPixModuleAmount(remaining);
    
    const moduleRoute = getModulePageRoute(module);
    setPurchasingModule({ title: module.title, route: moduleRoute });
    
    const pixData = await createPixPayment(remaining, userData);
    if (pixData) {
      setShowPixModal(true);
      setShowFloatingPix(false);
      
      // Criar notificação toast com QR code embutido
      const tId = toast.info(
        <div className="flex items-center gap-3">
          {pixData.qr_code && (
            <div className="flex-shrink-0 bg-white p-2 rounded border-2 border-green-500">
              <QRCode value={pixData.qr_code} size={70} />
            </div>
          )}
          <div className="space-y-2">
            <div>
              <p className="font-semibold text-sm">PIX para {module.title}</p>
              <p className="text-xs text-muted-foreground">Não feche sem pagar!</p>
            </div>
            <button
              onClick={() => {
                toast.dismiss(tId);
                handleCancelPurchase();
              }}
              className="text-xs px-2 py-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>,
        {
          duration: Infinity,
          action: {
            label: 'Ver QR Code',
            onClick: () => setShowPixModal(true)
          },
        }
      );
      setNotificationToastId(tId);
    }
  };

  // Handler para cancelar compra
  const handleCancelPurchase = () => {
    if (pixResponse?.payment_id) {
      cancelPayment(pixResponse.payment_id);
    }
    setShowPixModal(false);
    setShowFloatingPix(false);
    setPurchasingModule(null);
    if (notificationToastId) {
      toast.dismiss(notificationToastId);
      setNotificationToastId(null);
    }
    toast.info('Ordem de compra cancelada');
  };

  // Handler para fechar modal (mantém floating)
  const handleClosePixModal = () => {
    setShowPixModal(false);
    if (pixResponse && pixResponse.status !== 'approved') {
      setShowFloatingPix(true);
    }
  };

  // Auto-check payment status while PIX modal is open OR floating widget is visible
  useEffect(() => {
    if ((!showPixModal && !showFloatingPix) || !pixResponse?.payment_id) return;
    let cancelled = false;

    const checkLive = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/mercadopago/check-payment-status-live.php?payment_id=${pixResponse.payment_id}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const newStatus = data?.data?.status;
        if (newStatus === 'approved' && !cancelled) {
          toast.success('🎉 Pagamento Aprovado! Redirecionando...');
          setShowPixModal(false);
          setShowFloatingPix(false);
          if (notificationToastId) {
            toast.dismiss(notificationToastId);
            setNotificationToastId(null);
          }
          // Redirecionar para a página do módulo que estava sendo comprado
          const targetRoute = purchasingModule?.route || '/dashboard';
          setPurchasingModule(null);
          setTimeout(() => {
            window.location.href = targetRoute;
          }, 1500);
        }
      } catch (error) {
        console.error('Erro ao checar status (live):', error);
      }
    };

    const interval = setInterval(checkLive, 3000);
    checkLive();
    return () => { cancelled = true; clearInterval(interval); };
  }, [showPixModal, showFloatingPix, pixResponse?.payment_id]);

  const handlePixPaymentConfirm = async () => {
    if (!pixResponse?.payment_id) return;
    toast.loading('Verificando pagamento...', { id: 'checking-pix' });
    const status = await checkPaymentStatus(pixResponse.payment_id);
    if (status === 'approved') {
      toast.success('🎉 Pagamento aprovado!', { id: 'checking-pix' });
      setShowPixModal(false);
      setShowFloatingPix(false);
      if (notificationToastId) {
        toast.dismiss(notificationToastId);
        setNotificationToastId(null);
      }
      const targetRoute = purchasingModule?.route || '/dashboard';
      setPurchasingModule(null);
      setTimeout(() => {
        window.location.href = targetRoute;
      }, 1500);
    } else {
      toast.info('⏳ Ainda processando, aguarde...', { id: 'checking-pix' });
    }
  };

  const handleModuleClick = (module: any) => {
    if (isBalanceLoading || !hasLoadedOnce) {
      toast.info('Verificando saldo...', {
        description: 'Aguarde um instante e tente novamente.'
      });
      loadTotalAvailableBalance();
      return;
    }

    if (module.operational_status === 'maintenance') {
      toast.info(`Módulo ${module.title} em manutenção`, {
        description: "Voltará em breve"
      });
      return;
    }

    // Calcular preço (Imprimir RG usa módulo + QR 1M no dashboard)
    const originalPrice = getDisplayBasePrice(module);

    const shouldApplyDiscountOnClick = effectiveDiscountPercentage > 0 && module.panel_id !== 38;

    const finalPrice = shouldApplyDiscountOnClick
      ? (hasActiveSubscription
          ? calculateDiscountedPrice(originalPrice, module.panel_id).discountedPrice
          : Math.max(originalPrice - (originalPrice * effectiveDiscountPercentage) / 100, 0.01))
      : originalPrice;
    
    const moduleRoute = getModulePageRoute(module);
    const userHasRecords = hasRecordsInModule(moduleRoute);

    // Para módulos de pedidos (PDF), permitir acesso mesmo sem saldo se tem registros
    const isPdfModule = moduleRoute.includes('/pdf-personalizado') || moduleRoute.includes('/pdf-rg');
    
    const hasSufficientBalance = hasEnoughBalance(totalAvailableBalance, finalPrice);

    if (!hasSufficientBalance && !userHasRecords && !isPdfModule) {
      const remaining = getMissingAmount(finalPrice, totalAvailableBalance);
      toast.error(
        `Saldo insuficiente para ${module.title}! Valor necessário: R$ ${finalPrice.toFixed(2)}`,
        {
          action: {
            label: "💰 Depositar",
            onClick: () => navigate(`/dashboard/adicionar-saldo?valor=${remaining.toFixed(2)}&fromModule=true`)
          }
        }
      );
      return;
    }

    if (!hasSufficientBalance && (userHasRecords || isPdfModule)) {
      toast.info(
        `Você pode visualizar seu histórico em ${module.title}, mas precisa de saldo para novos pedidos.`,
        { duration: 4000 }
      );
    }

    navigate(getModulePageRoute(module));
  };


  if (isModulesLoading) {
    return (
      <div className={`${glassClass} rounded-lg p-8`} style={glassStyle}>
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="text-sm font-medium">Carregando dados dos painéis...</span>
        </div>
      </div>
    );
  }

  if (activePanels.length === 0) {
    return (
      <div className={`${glassClass} rounded-lg p-8`} style={glassStyle}>
        <EmptyState
          icon={Package}
          title="Nenhum painel ativo"
          description="Configure painéis na seção de Personalização para começar a usar o sistema."
          className="justify-center"
        />
      </div>
    );
  }

  return (
    <>
    <Reorder.Group
      axis="y"
      values={orderedPanels}
      onReorder={setOrderedPanels}
      className={`space-y-2 md:space-y-3 ${
        isManualReorderEnabled
          ? 'rounded-lg border border-dashed border-border p-2 bg-muted/20 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:18px_18px]'
          : ''
      }`}
    >
      {orderedPanels.map((panel) => {
        const PanelIcon = getIconComponent(panel.icon);
        const panelModules = getPanelModules(panel.id);
        const isLargePanel = panelModules.length > 6;
        const collapseSpeedFactor = isLargePanel ? 0.5 : 1;
        const template = getPanelTemplate(panel.id);
        const panelIndex = orderedPanels.findIndex((p) => p.id === panel.id);
        const titleDirectionX = panelIndex % 2 === 0 ? -36 : 36;
        const isTitleVisible = isTitleRevealComplete || animatedTitlePanelIds.has(panel.id);
        
        const isCollapsed =
          collapsedPanels[panel.id] ??
          (isInitialRevealComplete ? false : !initiallyExpandedPanelIds.has(panel.id));

        return (
          <Reorder.Item
            key={panel.id}
            value={panel}
            drag={isManualReorderEnabled ? 'y' : false}
            id={`panel-${panel.id}`}
            className={isManualReorderEnabled ? 'animate-fade-in rounded-lg border border-dashed border-border/70 bg-background/90 p-1' : ''}
          >
            <motion.div
              initial={false}
              animate={
                isTitleVisible
                  ? { opacity: 1, x: 0 }
                  : { opacity: 0, x: titleDirectionX }
              }
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <PanelTitleBar
                title={panel.name}
                icon={<PanelIcon className="h-5 w-5 text-primary" />}
                description={panel.description}
                badge={
                  <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-success text-success-foreground px-2 text-sm font-bold">
                    {panelModules.length}
                  </div>
                }
                isExpanded={!isCollapsed}
                isReorderEnabled={isManualReorderEnabled}
                showAddButton={canConfigureModules}
                onIconHoldStart={handleIconHoldStart}
                onIconHoldEnd={handleIconHoldEnd}
                onAdd={() => navigate('/dashboard/personalizacao')}
                onToggle={() => setCollapsedPanels((prev) => ({ ...prev, [panel.id]: !(prev[panel.id] ?? false) }))}
              />
            </motion.div>

            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  key={`panel-content-${panel.id}`}
                  className="overflow-hidden mt-0.5 md:mt-1"
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  variants={{
                    collapsed: {
                      height: 0,
                      opacity: 0,
                      transition: {
                        duration: 0.36 * collapseSpeedFactor,
                        ease: [0.4, 0, 1, 1],
                        when: 'afterChildren',
                      },
                    },
                    expanded: {
                      height: 'auto',
                      opacity: 1,
                      transition: {
                        duration: 0.36,
                        ease: [0.22, 1, 0.36, 1],
                        when: 'beforeChildren',
                        delayChildren: 0.08,
                      },
                    },
                  }}
                >
                  <div className={`${glassClass} rounded-lg`} style={glassStyle}>
                    {panelModules.length > 0 ? (
                      <motion.div
                        variants={{
                          collapsed: {
                            transition: {
                              staggerChildren: (isMobile ? 0.04 : 0.06) * collapseSpeedFactor,
                              staggerDirection: -1,
                            },
                          },
                          expanded: {
                            transition: {
                              staggerChildren: isMobile ? 0.04 : 0.06,
                            },
                          },
                        }}
                      >
                        <ModuleGridWrapper className={isMobile ? 'px-0 pt-2 pb-2 [grid-template-columns:repeat(2,minmax(0,150px))] justify-between gap-x-2' : 'px-3 pt-2 pb-3 md:px-4 md:pt-2 md:pb-4 lg:[grid-template-columns:repeat(auto-fill,minmax(150px,150px))] lg:justify-between lg:justify-items-start'}>
                 {panelModules.map((module) => {
                   // Calcular preços - apenas com desconto se houver plano ativo da API
                   // Painel 38 não deve mostrar desconto
                  const originalPrice = getDisplayBasePrice(module);
                  const shouldShowDiscount = effectiveDiscountPercentage > 0 && module.panel_id !== 38;

                   const finalDiscountedPrice = shouldShowDiscount
                     ? (hasActiveSubscription
                         ? calculateDiscountedPrice(originalPrice, module.panel_id).discountedPrice
                         : Math.max(originalPrice - (originalPrice * effectiveDiscountPercentage) / 100, 0.01))
                     : originalPrice;
                  
                  console.log('🔍 Debug PanelsGrid - Dados do módulo:', {
                    moduleName: module.title,
                    originalPrice,
                    finalPrice: finalDiscountedPrice,
                    hasActiveSubscription,
                    shouldShowDiscount,
                    discountPercentageFromAPI: discountPercentage,
                     effectiveDiscountPercentage,
                    currentPlan,
                    formatPrice: formatPrice(finalDiscountedPrice),
                    willShowOriginalPrice: shouldShowDiscount ? formatPrice(originalPrice) : undefined,
                     willShowDiscountPercentage: shouldShowDiscount ? effectiveDiscountPercentage : undefined
                  });
                  
                  const moduleRoute = getModulePageRoute(module);
                  const isRegistroGeralModule = moduleRoute === '/dashboard/pdf-rg' || moduleRoute === '/dashboard/imprimir-rg';
                  const normalizedModuleRoute = moduleRoute.endsWith('/') ? moduleRoute : `${moduleRoute}/`;
                  const moduleRecordCount =
                    moduleRecordsCountByRoute[moduleRoute] ||
                    moduleRecordsCountByRoute[normalizedModuleRoute] ||
                    0;
                  const userHasRecordsInThis = isRegistroGeralModule
                    ? moduleRecordCount > 0
                    : hasRecordsInModule(moduleRoute);

                    return (
                    <motion.div
                      key={module.id}
                      variants={{
                        collapsed: {
                          opacity: 0,
                          y: -10,
                          scale: 0.97,
                          filter: 'blur(6px)',
                          transition: { duration: 0.32 * collapseSpeedFactor, ease: [0.4, 0, 1, 1] },
                        },
                        expanded: {
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          filter: 'blur(0px)',
                          transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
                        },
                      }}
                      className={`relative cursor-pointer group ${isMobile ? 'mb-0' : ''}`}
                      onClick={() => handleModuleClick(module)}
                    >
                      {moduleRecordCount > 0 && (
                        <div className="absolute top-2 left-2 z-[90] min-w-6 h-6 px-1.5 rounded-full bg-primary text-primary-foreground border border-background shadow-sm flex items-center justify-center text-xs font-semibold leading-none pointer-events-none">
                          {moduleRecordCount}
                        </div>
                      )}

                      <ModuleCardTemplates
                        module={{
                          title: module.title,
                          description: module.description,
                          price: formatPrice(finalDiscountedPrice),
                          // No template, o valor original aparece com moeda (ex.: "R$ 3,00")
                          originalPrice: shouldShowDiscount ? `R$ ${formatPrice(originalPrice)}` : undefined,
                          discountPercentage: shouldShowDiscount ? effectiveDiscountPercentage : undefined,
                          status: module.is_active ? 'ativo' : 'inativo',
                          operationalStatus: module.operational_status === 'maintenance' ? 'manutencao' : module.operational_status,
                          iconSize: 'medium',
                          showDescription: true,
                          icon: module.icon,
                          color: module.color
                        }}
                        template={template}
                      />
                      
                      
                      {/* Overlay para saldo insuficiente - botão Comprar verde */}
                      {hasLoadedOnce && !isBalanceLoading && !hasEnoughBalance(totalAvailableBalance, finalDiscountedPrice) && !userHasRecordsInThis && (
                        <div className="absolute inset-0 bg-black/60 dark:bg-black/70 rounded-lg z-50 flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="text-center text-white bg-black/80 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20 shadow-2xl w-[85%] max-w-[170px]">
                            <Lock className="h-5 w-5 mx-auto mb-1.5 text-white" />
                            <p className="text-sm font-medium mb-2">Saldo Insuficiente</p>
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold w-full"
                              onClick={(e) => handleDirectPurchase(e, finalDiscountedPrice, module)}
                              disabled={pixLoading}
                            >
                              <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                              {pixLoading ? 'Gerando...' : 'Comprar'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Overlay para usuário com histórico - botão Acessar */}
                      {hasLoadedOnce && !isBalanceLoading && !hasEnoughBalance(totalAvailableBalance, finalDiscountedPrice) && userHasRecordsInThis && (
                        <div className="absolute inset-0 bg-black/60 dark:bg-black/70 rounded-lg z-50 flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="text-center text-white bg-black/80 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20 shadow-2xl w-[85%] max-w-[170px]">
                            <p className="text-sm font-medium mb-2">Histórico disponível</p>
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90 text-success-foreground text-xs font-semibold w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(moduleRoute);
                              }}
                            >
                              Acessar
                            </Button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                  })}
                        </ModuleGridWrapper>
                      </motion.div>
                    ) : (
                      <div className="p-6 pt-0">
                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Nenhum módulo ativo
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Este painel não possui módulos ativos configurados.
                          </p>
                          {canConfigureModules ? (
                            <Link 
                              to="/dashboard/personalizacao"
                              className="inline-flex items-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                            >
                              Configurar módulos →
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Reorder.Item>
        );
      })}
    </Reorder.Group>

    {/* Modal PIX para compra direta */}
    <PixQRCodeModal
      isOpen={showPixModal}
      onClose={handleClosePixModal}
      amount={pixModuleAmount}
      onPaymentConfirm={handlePixPaymentConfirm}
      isProcessing={checkingPayment}
      pixData={pixResponse}
      onGenerateNew={() => generateNewPayment(pixModuleAmount, userData)}
    />

    {/* Widget flutuante de PIX pendente */}
    <FloatingPendingPix
      isVisible={showFloatingPix && !showPixModal}
      pixData={pixResponse}
      amount={pixModuleAmount}
      moduleName={purchasingModule?.title}
      onOpenModal={() => {
        setShowPixModal(true);
        setShowFloatingPix(false);
      }}
      onCancel={handleCancelPurchase}
    />
  </>
  );
};

export default PanelsGrid;
