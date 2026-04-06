import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Loader2,
  Plus,
  Search,
  UserCircle,
  Users,
  Wallet,
  Phone,
  Mail,
  MapPin,
  Heart,
  AlertTriangle,
  Smartphone,
  Camera,
  Database,
  FileText,
  Building2,
  Shield,
  IdCard,
  Pill,
  Landmark,
  KeyRound,
  Briefcase,
  Pencil,
  Trash2,
} from 'lucide-react';
import SimpleTitleBar from '@/components/dashboard/SimpleTitleBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useApiModules } from '@/hooks/useApiModules';
import { useApiPanels } from '@/hooks/useApiPanels';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { getDashboardPageClassName } from '@/components/dashboard/layout/dashboardPageTemplate';
import { formatCpf, formatPhone } from '@/utils/formatters';
import { todayBrasilia } from '@/utils/timezone';
import { baseCpfService } from '@/services/baseCpfService';
import { consultasCpfService, ConsultaCpf } from '@/services/consultasCpfService';
import { apiRequest } from '@/config/api';
import { toast } from 'sonner';
import FotosSection from '@/components/dashboard/FotosSection';
import ScoreGaugeCard from '@/components/dashboard/ScoreGaugeCard';
import { baseFotoService } from '@/services/baseFotoService';
import { baseTelefoneService } from '@/services/baseTelefoneService';
import { baseEmailService } from '@/services/baseEmailService';
import { baseEnderecoService } from '@/services/baseEnderecoService';
import { baseParenteService } from '@/services/baseParenteService';
import { baseCertidaoService } from '@/services/baseCertidaoService';
import { baseDocumentoService } from '@/services/baseDocumentoService';
import { baseCnsService } from '@/services/baseCnsService';
import { baseVacinaService } from '@/services/baseVacinaService';
import { baseEmpresaSocioService } from '@/services/baseEmpresaSocioService';
import { baseCnpjMeiService } from '@/services/baseCnpjMeiService';
import { baseDividasAtivasService } from '@/services/baseDividasAtivasService';
import { baseAuxilioEmergencialService } from '@/services/baseAuxilioEmergencialService';
import { baseRaisService } from '@/services/baseRaisService';
import { baseInssService } from '@/services/baseInssService';
import { baseClaroService } from '@/services/baseClaroService';
import { baseVivoService } from '@/services/baseVivoService';
import { baseTimService } from '@/services/baseTimService';
import { baseOperadoraOiService } from '@/services/baseOperadoraOiService';
import { baseSenhaEmailService } from '@/services/baseSenhaEmailService';
import { baseSenhaCpfService } from '@/services/baseSenhaCpfService';
import { baseGestaoService } from '@/services/baseGestaoService';
import ModuleCardTemplates from '@/components/configuracoes/personalization/ModuleCardTemplates';
import ModuleGridWrapper from '@/components/configuracoes/personalization/ModuleGridWrapper';
import { cn } from '@/lib/utils';
import { smoothScrollToHash } from '@/utils/smoothScroll';
import { buscaNomeService, NomeConsultaResultado } from '@/services/buscaNomeService';
import { parseFdxHtmlResults } from '@/utils/fdxHtmlResultsParser';

type CpfLookupResult = Record<string, unknown>;
type ClientStatus = 'prioridade-alta' | 'prioridade-media' | 'prioridade-baixa' | 'em-andamento' | 'concluido';

interface ControlePessoalApiItem {
  id: number;
  titulo: string;
  descricao?: string | null;
  cliente_nome?: string | null;
  valor?: number | string | null;
  status?: string | null;
  data_referencia: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

interface SavedClient {
  id: string;
  title: string;
  createdAt: string;
  document?: string;
  moduleTitle?: string;
  consultationId?: number;
  manual?: boolean;
  phone?: string;
  email?: string;
  notes?: string;
  status?: ClientStatus;
}

const relevantLookupRoutes = [
  '/dashboard/consultar-cpf-puxa-tudo',
  '/dashboard/consultar-cpf-completo',
  '/dashboard/consultar-cpf-basico',
  '/dashboard/consultar-cpf-simples',
  '/dashboard/consultar-nome-completo',
];

const allowedLookupModuleIds = new Set([156, 21, 155, 83, 166, 23]);

type ModuleTemplateType = 'corporate' | 'creative' | 'minimal' | 'modern' | 'elegant' | 'forest' | 'rose' | 'cosmic' | 'neon' | 'sunset' | 'arctic' | 'volcano' | 'matrix';

const validModuleTemplates: ModuleTemplateType[] = [
  'corporate',
  'creative',
  'minimal',
  'modern',
  'elegant',
  'forest',
  'rose',
  'cosmic',
  'neon',
  'sunset',
  'arctic',
  'volcano',
  'matrix',
];

const moduleFallbackById: Record<number, { title: string; description: string; price: number; icon: string; color: string; panelId: number }> = {
  154: { title: 'CPF Puxa Tudo', description: 'Consulta completa com todas as seções', price: 0, icon: 'Shield', color: '#7c3aed', panelId: 0 },
  156: { title: 'Busca Nome', description: 'Consulta CPF e dados básicos', price: 0, icon: 'Search', color: '#7c3aed', panelId: 0 },
  155: { title: 'CPF Simples', description: 'Consulta CPF sem foto', price: 0, icon: 'UserRoundSearch', color: '#7c3aed', panelId: 0 },
  21: { title: 'CPF Básico', description: 'Consulta CPF com dados essenciais', price: 0, icon: 'Package', color: '#7c3aed', panelId: 0 },
  83: { title: 'CPF Completo', description: 'Consulta CPF completa', price: 0, icon: 'BarChart3', color: '#7c3aed', panelId: 0 },
  166: { title: 'Consulta CPF', description: 'Consulta com retorno completo de dados', price: 0, icon: 'Shield', color: '#7c3aed', panelId: 0 },
  23: { title: 'Consulta CPF', description: 'Consulta com retorno completo de dados', price: 0, icon: 'Shield', color: '#7c3aed', panelId: 0 },
};

const moduleFallbackByRoute: Record<string, { title: string; description: string; price: number; icon: string; color: string; panelId: number }> = {
  '/dashboard/consultar-cpf-puxa-tudo': { title: 'CPF Puxa Tudo', description: 'Consulta completa com todas as seções', price: 0, icon: 'Shield', color: '#7c3aed', panelId: 0 },
  '/dashboard/consultar-cpf-completo': { title: 'CPF Completo', description: 'Consulta CPF completa', price: 0, icon: 'BarChart3', color: '#7c3aed', panelId: 0 },
  '/dashboard/consultar-cpf-basico': { title: 'CPF Básico', description: 'Consulta CPF com dados essenciais', price: 0, icon: 'Package', color: '#7c3aed', panelId: 0 },
  '/dashboard/consultar-cpf-simples': { title: 'CPF Simples', description: 'Consulta CPF sem foto', price: 0, icon: 'UserRoundSearch', color: '#7c3aed', panelId: 0 },
  '/dashboard/consultar-nome-completo': { title: 'Busca Nome', description: 'Consulta CPF e dados básicos', price: 0, icon: 'Search', color: '#7c3aed', panelId: 0 },
};

const formatModulePrice = (value: number) => (Number.isFinite(value) ? value : 0).toFixed(2).replace('.', ',');

const resolveModuleTemplate = (rawTemplate?: string | null): ModuleTemplateType => {
  if (rawTemplate && validModuleTemplates.includes(rawTemplate as ModuleTemplateType)) {
    return rawTemplate as ModuleTemplateType;
  }
  return 'modern';
};

const clientStatusOptions: { label: string; value: ClientStatus; badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' }[] = [
  { label: 'Prioridade alta', value: 'prioridade-alta', badgeVariant: 'destructive' },
  { label: 'Prioridade média', value: 'prioridade-media', badgeVariant: 'default' },
  { label: 'Prioridade baixa', value: 'prioridade-baixa', badgeVariant: 'secondary' },
  { label: 'Em andamento', value: 'em-andamento', badgeVariant: 'outline' },
  { label: 'Concluído', value: 'concluido', badgeVariant: 'secondary' },
];

const getClientStatusMeta = (status?: string) =>
  clientStatusOptions.find((item) => item.value === status) || clientStatusOptions[1];

const resolvePhoto = (result: CpfLookupResult | null) => {
  if (!result) return '';
  const candidates = [
    result.foto,
    result.foto2,
    result.photo,
    result.photo2,
    result.photo3,
    result.photo4,
    result.foto_rosto_rg,
    result.foto_rosto_cnh,
  ];

  const first = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return typeof first === 'string' ? first : '';
};

const normalizeCollection = (value: unknown): Array<Record<string, unknown>> => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => (typeof item === 'object' ? (item as Record<string, unknown>) : { valor: item }));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeCollection(parsed);
      } catch {
        return [{ valor: trimmed }];
      }
    }

    return [{ valor: trimmed }];
  }

  if (typeof value === 'object') {
    return [value as Record<string, unknown>];
  }

  return [{ valor: String(value) }];
};

const extractListData = (value: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) return normalizeCollection(value);
  if (!value || typeof value !== 'object') return [];

  const raw = value as Record<string, unknown>;
  if (Array.isArray(raw.data)) return normalizeCollection(raw.data);
  if (raw.data && typeof raw.data === 'object') return normalizeCollection(raw.data);
  return [];
};

const labelFromKey = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? `${value.length} registro(s)` : '-';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return String(value);
};

const formatDateTime = (date: string) =>
  new Date(date.includes('T') ? date : date.replace(' ', 'T')).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const normalizeModuleRoute = (rawValue?: string | null) => {
  if (!rawValue) return '';
  const cleaned = rawValue.trim();
  if (!cleaned) return '';
  if (cleaned.startsWith('/dashboard/')) return cleaned;
  if (cleaned.startsWith('dashboard/')) return `/${cleaned}`;
  if (cleaned.startsWith('/')) return `/dashboard${cleaned}`;
  return `/dashboard/${cleaned}`;
};

const extractDocument = (result: CpfLookupResult | null, fallback: string) => {
  const raw = typeof result?.cpf === 'string' ? result.cpf : fallback;
  return raw.replace(/\D/g, '').slice(0, 11);
};

const extractName = (result: CpfLookupResult | null) => {
  if (!result) return '';
  return typeof result.nome === 'string' ? result.nome.trim() : '';
};

const extractResultContact = (result: CpfLookupResult | null) => {
  if (!result) {
    return { phone: '', email: '' };
  }

  const phones = normalizeCollection(result.telefones);
  const emails = normalizeCollection(result.emails);

  const rawPhone =
    (typeof result.telefone === 'string' ? result.telefone : '') ||
    (typeof phones[0]?.telefone === 'string' ? phones[0].telefone : '') ||
    (typeof phones[0]?.numero === 'string' ? phones[0].numero : '');

  const rawEmail =
    (typeof result.email === 'string' ? result.email : '') ||
    (typeof result.email_pessoal === 'string' ? result.email_pessoal : '') ||
    (typeof emails[0]?.email === 'string' ? emails[0].email : '');

  return {
    phone: rawPhone ? formatPhone(rawPhone) : '',
    email: rawEmail,
  };
};

const SectionGrid = ({ title, icon, data, sectionId }: { title: string; icon: React.ReactNode; data: Array<Record<string, unknown>>; sectionId?: string }) => (
  <Card id={sectionId}>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados retornados para esta seção.</p>
      ) : (
        <div className="space-y-3">
          {data.map((row, rowIndex) => (
            <div key={`${title}-${rowIndex}`} className="rounded-md border border-border p-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {Object.entries(row).map(([key, value]) => (
                  <div key={`${title}-${rowIndex}-${key}`}>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{labelFromKey(key)}</p>
                    <p className="text-sm break-words">{formatValue(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

type StructuredSectionKey =
  | 'fotos'
  | 'score'
  | 'csb8'
  | 'csba'
  | 'dadosFinanceiros'
  | 'dadosBasicos'
  | 'telefones'
  | 'emails'
  | 'enderecos'
  | 'tituloEleitor'
  | 'parentes'
  | 'certidaoNascimento'
  | 'documento'
  | 'cns'
  | 'pis'
  | 'vacinas'
  | 'empresasSocio'
  | 'cnpjMei'
  | 'dividasAtivas'
  | 'auxilioEmergencial'
  | 'rais'
  | 'inss'
  | 'operadoraClaro'
  | 'operadoraVivo'
  | 'operadoraTim'
  | 'operadoraOi'
  | 'senhasEmail'
  | 'senhasCpf'
  | 'gestaoCadastral';

const sectionMetaByKey: Record<StructuredSectionKey, { title: string; icon: React.ReactNode }> = {
  fotos: { title: 'Fotos', icon: <Camera className="h-4 w-4" /> },
  score: { title: 'Score', icon: <Shield className="h-4 w-4" /> },
  csb8: { title: 'CSB8', icon: <Shield className="h-4 w-4" /> },
  csba: { title: 'CSBA', icon: <Shield className="h-4 w-4" /> },
  dadosFinanceiros: { title: 'Dados Financeiros', icon: <Wallet className="h-4 w-4" /> },
  dadosBasicos: { title: 'Dados Básicos', icon: <Database className="h-4 w-4" /> },
  telefones: { title: 'Telefones', icon: <Phone className="h-4 w-4" /> },
  emails: { title: 'Emails', icon: <Mail className="h-4 w-4" /> },
  enderecos: { title: 'Endereços', icon: <MapPin className="h-4 w-4" /> },
  tituloEleitor: { title: 'Título de Eleitor', icon: <FileText className="h-4 w-4" /> },
  parentes: { title: 'Parentes', icon: <Heart className="h-4 w-4" /> },
  certidaoNascimento: { title: 'Certidão de Nascimento', icon: <FileText className="h-4 w-4" /> },
  documento: { title: 'Documento', icon: <IdCard className="h-4 w-4" /> },
  cns: { title: 'CNS', icon: <Pill className="h-4 w-4" /> },
  pis: { title: 'PIS', icon: <Briefcase className="h-4 w-4" /> },
  vacinas: { title: 'Vacinas', icon: <Pill className="h-4 w-4" /> },
  empresasSocio: { title: 'Empresas Associadas (SÓCIO)', icon: <Building2 className="h-4 w-4" /> },
  cnpjMei: { title: 'CNPJ MEI', icon: <Building2 className="h-4 w-4" /> },
  dividasAtivas: { title: 'Dívidas Ativas (SIDA)', icon: <AlertTriangle className="h-4 w-4" /> },
  auxilioEmergencial: { title: 'Auxílio Emergencial', icon: <Wallet className="h-4 w-4" /> },
  rais: { title: 'Rais - Histórico de Emprego', icon: <Briefcase className="h-4 w-4" /> },
  inss: { title: 'INSS', icon: <Landmark className="h-4 w-4" /> },
  operadoraClaro: { title: 'Operadora Claro', icon: <Smartphone className="h-4 w-4" /> },
  operadoraVivo: { title: 'Operadora Vivo', icon: <Smartphone className="h-4 w-4" /> },
  operadoraTim: { title: 'Operadora TIM', icon: <Smartphone className="h-4 w-4" /> },
  operadoraOi: { title: 'Operadora OI', icon: <Smartphone className="h-4 w-4" /> },
  senhasEmail: { title: 'Senhas de Email', icon: <KeyRound className="h-4 w-4" /> },
  senhasCpf: { title: 'Senhas de CPF', icon: <KeyRound className="h-4 w-4" /> },
  gestaoCadastral: { title: 'Gestão Cadastral', icon: <Database className="h-4 w-4" /> },
};

const sectionAnchorByKey: Record<StructuredSectionKey, string> = {
  fotos: '#fotos-section',
  score: '#score-section',
  csb8: '#csb8-section',
  csba: '#csba-section',
  dadosFinanceiros: '#dados-financeiros-section',
  dadosBasicos: '#dados-basicos-section',
  telefones: '#telefones-section',
  emails: '#emails-section',
  enderecos: '#enderecos-section',
  tituloEleitor: '#titulo-eleitor-section',
  parentes: '#parentes-section',
  certidaoNascimento: '#certidao-nascimento-section',
  documento: '#documento-section',
  cns: '#cns-section',
  pis: '#pis-section',
  vacinas: '#vacinas-section',
  empresasSocio: '#empresas-socio-section',
  cnpjMei: '#cnpj-mei-section',
  dividasAtivas: '#dividas-ativas-section',
  auxilioEmergencial: '#auxilio-emergencial-section',
  rais: '#rais-section',
  inss: '#inss-section',
  operadoraClaro: '#operadora-claro-section',
  operadoraVivo: '#operadora-vivo-section',
  operadoraTim: '#operadora-tim-section',
  operadoraOi: '#operadora-oi-section',
  senhasEmail: '#senhas-email-section',
  senhasCpf: '#senhas-cpf-section',
  gestaoCadastral: '#gestao-cadastral-section',
};

const sectionOrderByModuleProfile: Record<'puxaTudo' | 'completo' | 'basico', StructuredSectionKey[]> = {
  puxaTudo: [
    'fotos', 'score', 'csb8', 'csba', 'dadosFinanceiros', 'dadosBasicos', 'telefones', 'emails', 'enderecos',
    'tituloEleitor', 'parentes', 'certidaoNascimento', 'documento', 'cns', 'pis', 'vacinas', 'empresasSocio', 'cnpjMei',
    'dividasAtivas', 'auxilioEmergencial', 'rais', 'inss', 'operadoraClaro', 'operadoraVivo', 'operadoraTim', 'operadoraOi',
    'senhasEmail', 'senhasCpf', 'gestaoCadastral',
  ],
  completo: [
    'fotos', 'csb8', 'csba', 'dadosFinanceiros', 'dadosBasicos', 'telefones', 'emails', 'enderecos',
    'tituloEleitor', 'parentes', 'certidaoNascimento', 'documento', 'cns', 'pis', 'vacinas', 'empresasSocio', 'cnpjMei',
    'auxilioEmergencial', 'rais',
  ],
  basico: ['dadosBasicos', 'telefones', 'emails', 'enderecos'],
};

const normalizeTitleText = (value?: string | null) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const resolveModuleProfile = (params: { id?: number; route?: string; title?: string; slug?: string }): 'puxaTudo' | 'completo' | 'basico' => {
  const route = normalizeModuleRoute(params.route || '').toLowerCase();
  const title = normalizeTitleText(params.title);
  const slug = normalizeTitleText(params.slug);
  const merged = `${route} ${title} ${slug}`;

  if (params.id === 154 || merged.includes('puxa tudo') || merged.includes('puxa-tudo') || merged.includes('puxatudo')) return 'puxaTudo';
  if (params.id === 83 || merged.includes('completo')) return 'completo';
  return 'basico';
};

const ControlePessoalClientesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { modules } = useApiModules();
  const { panels } = useApiPanels();
  const { hasActiveSubscription, calculateDiscountedPrice } = useUserSubscription();
  const modulesSectionRef = useRef<HTMLDivElement | null>(null);
  const resultSectionRef = useRef<HTMLDivElement | null>(null);

  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [consultations, setConsultations] = useState<ConsultaCpf[]>([]);
  const [selectedLookupModuleId, setSelectedLookupModuleId] = useState<number | null>(null);
  const [lookupDocument, setLookupDocument] = useState('');
  const [lookupResult, setLookupResult] = useState<CpfLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [latestConsultationId, setLatestConsultationId] = useState<number | null>(null);
  const [isLookupSubmitting, setIsLookupSubmitting] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isLoadingSavedClients, setIsLoadingSavedClients] = useState(false);
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(false);
  const [selectedSavedClientId, setSelectedSavedClientId] = useState<string | null>(null);
  const [editingSavedClientId, setEditingSavedClientId] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: '',
    document: '',
    phone: '',
    email: '',
    notes: '',
    status: 'prioridade-media' as ClientStatus,
  });
  const [isBuscaNomeModalOpen, setIsBuscaNomeModalOpen] = useState(false);
  const [nomeBuscaInput, setNomeBuscaInput] = useState('');
  const [isBuscaNomeSubmitting, setIsBuscaNomeSubmitting] = useState(false);
  const [nomeBuscaResultados, setNomeBuscaResultados] = useState<NomeConsultaResultado[]>([]);
  const [nomeBuscaTotal, setNomeBuscaTotal] = useState(0);
  const [nomeBuscaLog, setNomeBuscaLog] = useState<string[]>([]);
  const [selectedNomeBuscaResult, setSelectedNomeBuscaResult] = useState<NomeConsultaResultado | null>(null);

  const selectedModuleCards = useMemo(() => {
    const normalizeRoute = (rawValue?: string | null) => {
      if (!rawValue) return '';
      const cleaned = rawValue.trim();
      if (!cleaned) return '';
      if (cleaned.startsWith('/dashboard/')) return cleaned;
      if (cleaned.startsWith('dashboard/')) return `/${cleaned}`;
      if (cleaned.startsWith('/')) return `/dashboard${cleaned}`;
      return `/dashboard/${cleaned}`;
    };

    const selectedModules = modules
      .filter((module) => allowedLookupModuleIds.has(Number(module.id)))
      .sort((a, b) => (Number(a.sort_order || 0) - Number(b.sort_order || 0)));

    const baseList = selectedModules.length
      ? selectedModules
      : Array.from(allowedLookupModuleIds).map((moduleId) => ({ id: moduleId } as (typeof modules)[number]));

    return baseList.map((moduleLike) => {
      const module = modules.find((item) => Number(item.id) === Number(moduleLike.id));
      const moduleRoute = [module?.path, module?.slug, module?.api_endpoint]
        .map((value) => normalizeRoute(String(value || '')))
        .find((route) => relevantLookupRoutes.includes(route));

      const fallback = (moduleRoute ? moduleFallbackByRoute[moduleRoute] : undefined) || moduleFallbackById[Number(moduleLike.id)] || moduleFallbackByRoute['/dashboard/consultar-cpf-basico'];
      const originalPrice = Number(module?.price ?? fallback.price);
      const panelId = Number(module?.panel_id ?? fallback.panelId);
      const panelTemplate = panels.find((panel) => Number(panel.id) === panelId)?.template;
      const discountResult = hasActiveSubscription && originalPrice > 0
        ? calculateDiscountedPrice(originalPrice, panelId)
        : { discountedPrice: originalPrice, hasDiscount: false };
      const finalPrice = Number(discountResult.discountedPrice ?? originalPrice);
      const discountPercentage = originalPrice > 0 && discountResult.hasDiscount
        ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
        : undefined;
      const operationalStatus: 'on' | 'off' | 'manutencao' =
        module?.operational_status === 'maintenance' ? 'manutencao' : module?.operational_status === 'off' ? 'off' : 'on';

      return {
        id: Number(moduleLike.id),
        title: module?.title || fallback.title,
        description: module?.description || fallback.description,
        price: finalPrice,
        originalPrice,
        priceDisplay: formatModulePrice(finalPrice),
        originalPriceDisplay: discountPercentage ? formatModulePrice(originalPrice) : undefined,
        discountPercentage,
        icon: module?.icon || fallback.icon,
        color: module?.color || fallback.color,
        template: resolveModuleTemplate(panelTemplate),
        operationalStatus,
        route: moduleRoute || '',
        profile: 'puxaTudo' as const,
      };
    });
  }, [calculateDiscountedPrice, hasActiveSubscription, modules, panels]);

  useEffect(() => {
    if (!selectedModuleCards.length) return;
    if (selectedLookupModuleId === null || !selectedModuleCards.some((module) => module.id === selectedLookupModuleId)) {
      setSelectedLookupModuleId(selectedModuleCards[0].id);
    }
  }, [selectedLookupModuleId, selectedModuleCards]);

  const selectedLookupModule = useMemo(
    () => selectedModuleCards.find((module) => module.id === selectedLookupModuleId) || selectedModuleCards[0],
    [selectedLookupModuleId, selectedModuleCards]
  );

  const selectedLookupPrice = useMemo(() => {
    const rawPrice = Number(selectedLookupModule?.price ?? 0);
    return Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;
  }, [selectedLookupModule?.price]);

  const selectedLookupTitle = selectedLookupModule?.title || 'Consulta CPF';
  const isBuscaNomeModuleSelected = selectedLookupModule?.id === 156;
  const cpfLookupModules = useMemo(
    () => selectedModuleCards.filter((module) => module.id !== 156),
    [selectedModuleCards]
  );

  const resultDocument = useMemo(() => extractDocument(lookupResult, lookupDocument), [lookupResult, lookupDocument]);
  const resultName = useMemo(() => extractName(lookupResult), [lookupResult]);
  const resultPhoto = useMemo(() => resolvePhoto(lookupResult), [lookupResult]);

  const topScores = useMemo(() => {
    if (!lookupResult) {
      return {
        csb8: '-',
        csba: '-',
      };
    }

    return {
      csb8: formatValue(lookupResult.csb8),
      csba: formatValue(lookupResult.csba),
    };
  }, [lookupResult]);

  const enrichLookupResultByCpfId = useCallback(async (baseData: CpfLookupResult, documentDigits: string): Promise<CpfLookupResult> => {
    const cpfId = Number((baseData as Record<string, unknown>).id);
    if (!Number.isFinite(cpfId) || cpfId <= 0) return baseData;

    const [
      fotosResponse,
      telefonesResponse,
      emailsResponse,
      enderecosResponse,
      parentesResponse,
      certidaoResponse,
      documentoResponse,
      cnsResponse,
      vacinasResponse,
      empresasSocioResponse,
      cnpjMeiResponse,
      dividasAtivasResponse,
      auxilioResponse,
      raisResponse,
      inssResponse,
      claroResponse,
      vivoResponse,
      timResponse,
      oiResponse,
      senhaEmailResponse,
      senhaCpfResponse,
      gestaoResponse,
    ] = await Promise.allSettled([
      baseFotoService.getByCpfId(cpfId),
      baseTelefoneService.getByCpfId(cpfId),
      baseEmailService.getByCpfId(cpfId),
      baseEnderecoService.getByCpfId(cpfId),
      baseParenteService.getByCpfId(cpfId),
      baseCertidaoService.getByCpfId(cpfId),
      baseDocumentoService.getByCpfId(cpfId),
      baseCnsService.getByCpfId(cpfId),
      baseVacinaService.getByCpfId(cpfId),
      baseEmpresaSocioService.getByCpfId(cpfId),
      baseCnpjMeiService.getByCpfId(cpfId),
      baseDividasAtivasService.getByCpf(documentDigits),
      baseAuxilioEmergencialService.getByCpfId(cpfId),
      baseRaisService.getByCpfId(cpfId),
      baseInssService.getByCpfId(cpfId),
      baseClaroService.getByCpfId(cpfId),
      baseVivoService.getByCpfId(cpfId),
      baseTimService.getByCpfId(cpfId),
      baseOperadoraOiService.getByCpfId(cpfId),
      baseSenhaEmailService.getByCpfId(cpfId),
      baseSenhaCpfService.getByCpfId(cpfId),
      baseGestaoService.getByCpfId(cpfId),
    ]);

    const fotosRows = (fotosResponse.status === 'fulfilled' ? extractListData(fotosResponse.value) : [])
      .map((row) => ({ ...row, foto: row.foto || row.photo }))
      .filter((row) => typeof row.foto === 'string' && row.foto.trim().length > 0);

    return {
      ...baseData,
      fotos: fotosRows,
      telefones: telefonesResponse.status === 'fulfilled' ? extractListData(telefonesResponse.value) : normalizeCollection((baseData as Record<string, unknown>).telefones),
      emails: emailsResponse.status === 'fulfilled' ? extractListData(emailsResponse.value) : normalizeCollection((baseData as Record<string, unknown>).emails),
      enderecos: enderecosResponse.status === 'fulfilled' ? extractListData(enderecosResponse.value) : normalizeCollection((baseData as Record<string, unknown>).enderecos),
      parentes: parentesResponse.status === 'fulfilled' ? extractListData(parentesResponse.value) : normalizeCollection((baseData as Record<string, unknown>).parentes),
      certidao_nascimento: certidaoResponse.status === 'fulfilled' ? extractListData(certidaoResponse.value) : normalizeCollection((baseData as Record<string, unknown>).certidao_nascimento),
      documentos: documentoResponse.status === 'fulfilled' ? extractListData(documentoResponse.value) : normalizeCollection((baseData as Record<string, unknown>).documentos),
      cns_dados: cnsResponse.status === 'fulfilled' ? extractListData(cnsResponse.value) : normalizeCollection((baseData as Record<string, unknown>).cns_dados),
      vacinas_covid: vacinasResponse.status === 'fulfilled' ? extractListData(vacinasResponse.value) : normalizeCollection((baseData as Record<string, unknown>).vacinas_covid),
      empresas_socio: empresasSocioResponse.status === 'fulfilled' ? extractListData(empresasSocioResponse.value) : normalizeCollection((baseData as Record<string, unknown>).empresas_socio),
      cnpj_mei: cnpjMeiResponse.status === 'fulfilled' ? extractListData(cnpjMeiResponse.value) : normalizeCollection((baseData as Record<string, unknown>).cnpj_mei),
      dividas_ativas: dividasAtivasResponse.status === 'fulfilled' ? extractListData(dividasAtivasResponse.value) : normalizeCollection((baseData as Record<string, unknown>).dividas_ativas),
      auxilio_emergencial: auxilioResponse.status === 'fulfilled' ? extractListData(auxilioResponse.value) : normalizeCollection((baseData as Record<string, unknown>).auxilio_emergencial),
      rais_historico: raisResponse.status === 'fulfilled' ? extractListData(raisResponse.value) : normalizeCollection((baseData as Record<string, unknown>).rais_historico),
      inss_dados: inssResponse.status === 'fulfilled' ? extractListData(inssResponse.value) : normalizeCollection((baseData as Record<string, unknown>).inss_dados),
      operadora_claro: claroResponse.status === 'fulfilled' ? extractListData(claroResponse.value) : normalizeCollection((baseData as Record<string, unknown>).operadora_claro),
      operadora_vivo: vivoResponse.status === 'fulfilled' ? extractListData(vivoResponse.value) : normalizeCollection((baseData as Record<string, unknown>).operadora_vivo),
      operadora_tim: timResponse.status === 'fulfilled' ? extractListData(timResponse.value) : normalizeCollection((baseData as Record<string, unknown>).operadora_tim),
      operadora_oi: oiResponse.status === 'fulfilled' ? extractListData(oiResponse.value) : normalizeCollection((baseData as Record<string, unknown>).operadora_oi),
      senhas_vazadas_email: senhaEmailResponse.status === 'fulfilled' ? extractListData(senhaEmailResponse.value) : normalizeCollection((baseData as Record<string, unknown>).senhas_vazadas_email),
      senhas_vazadas_cpf: senhaCpfResponse.status === 'fulfilled' ? extractListData(senhaCpfResponse.value) : normalizeCollection((baseData as Record<string, unknown>).senhas_vazadas_cpf),
      gestao_cadastral: gestaoResponse.status === 'fulfilled' ? extractListData(gestaoResponse.value) : normalizeCollection((baseData as Record<string, unknown>).gestao_cadastral),
    };
  }, []);

  const structuredSections = useMemo(() => {
    if (!lookupResult) {
      return {
        fotos: [],
        score: [],
        csb8: [],
        csba: [],
        dadosFinanceiros: [],
        dadosBasicos: [],
        telefones: [],
        emails: [],
        enderecos: [],
        tituloEleitor: [],
        parentes: [],
        certidaoNascimento: [],
        documento: [],
        cns: [],
        pis: [],
        vacinas: [],
        empresasSocio: [],
        cnpjMei: [],
        dividasAtivas: [],
        auxilioEmergencial: [],
        rais: [],
        inss: [],
        operadoraClaro: [],
        operadoraVivo: [],
        operadoraTim: [],
        operadoraOi: [],
        senhasEmail: [],
        senhasCpf: [],
        gestaoCadastral: [],
      };
    }

    const dadosFinanceiros = [
      {
        poder_aquisitivo: lookupResult.poder_aquisitivo,
        renda: lookupResult.renda,
        fx_poder_aquisitivo: lookupResult.fx_poder_aquisitivo,
        csb8: lookupResult.csb8,
        csba: lookupResult.csba,
        csb8_faixa: lookupResult.csb8_faixa,
        csba_faixa: lookupResult.csba_faixa,
      },
    ].filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && value !== ''));

    const dadosBasicos = [
      {
        nome: lookupResult.nome,
        cpf: formatCpf(resultDocument),
        data_nascimento: lookupResult.data_nascimento,
        sexo: lookupResult.sexo,
        situacao_cpf: lookupResult.situacao_cpf,
        mae: lookupResult.mae,
        pai: lookupResult.pai,
        estado_civil: lookupResult.estado_civil,
        escolaridade: lookupResult.escolaridade,
      },
    ].filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && value !== ''));

      const fotos = normalizeCollection((lookupResult as Record<string, unknown>).fotos);
      if (!fotos.length) {
        const singlePhoto = resolvePhoto(lookupResult);
        if (singlePhoto) fotos.push({ foto: singlePhoto });
      }

      const score = [
        {
          score: lookupResult.score,
          poder_aquisitivo: lookupResult.poder_aquisitivo,
          renda: lookupResult.renda,
        },
      ].filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && value !== ''));

      const csb8 = [
        {
          csb8: lookupResult.csb8,
          csb8_faixa: lookupResult.csb8_faixa,
        },
      ].filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && value !== ''));

      const csba = [
        {
          csba: lookupResult.csba,
          csba_faixa: lookupResult.csba_faixa,
        },
      ].filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && value !== ''));

      const tituloEleitor = [
        {
          titulo_eleitor: lookupResult.titulo_eleitor,
          zona: lookupResult.zona,
          secao: lookupResult.secao,
        },
      ].filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && value !== ''));

      const certidaoNascimento = normalizeCollection((lookupResult as Record<string, unknown>).certidao_nascimento);

      const documentoFromService = normalizeCollection((lookupResult as Record<string, unknown>).documentos);
      const documento = documentoFromService.length
        ? documentoFromService
        : [
            {
              rg: lookupResult.rg,
              orgao_emissor: lookupResult.orgao_emissor,
              uf_emissao: lookupResult.uf_emissao,
              cnh: lookupResult.cnh,
              dt_expedicao_cnh: lookupResult.dt_expedicao_cnh,
              passaporte: lookupResult.passaporte,
              nit: lookupResult.nit,
              ctps: lookupResult.ctps,
            },
          ].filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && value !== ''));

      const cns = normalizeCollection((lookupResult as Record<string, unknown>).cns_dados ?? lookupResult.cns);
      const pis = normalizeCollection(lookupResult.pis);
      const vacinas = normalizeCollection((lookupResult as Record<string, unknown>).vacinas_covid ?? lookupResult.vacinas);
      const empresasSocio = normalizeCollection((lookupResult as Record<string, unknown>).empresas_socio);
      const cnpjMei = normalizeCollection((lookupResult as Record<string, unknown>).cnpj_mei);
      const auxilioEmergencial = normalizeCollection((lookupResult as Record<string, unknown>).auxilio_emergencial);
      const rais = normalizeCollection((lookupResult as Record<string, unknown>).rais_historico);
      const inss = normalizeCollection((lookupResult as Record<string, unknown>).inss_dados);
      const senhasEmail = normalizeCollection((lookupResult as Record<string, unknown>).senhas_vazadas_email);
      const senhasCpf = normalizeCollection((lookupResult as Record<string, unknown>).senhas_vazadas_cpf);
      const gestaoCadastral = normalizeCollection((lookupResult as Record<string, unknown>).gestao_cadastral ?? (lookupResult as Record<string, unknown>).cloud_cpf ?? (lookupResult as Record<string, unknown>).cloud_email);

      return {
        fotos,
        score,
        csb8,
        csba,
      dadosFinanceiros,
      dadosBasicos,
      telefones: normalizeCollection(lookupResult.telefones ?? lookupResult.telefone),
      emails: normalizeCollection(lookupResult.emails ?? lookupResult.email),
      enderecos: normalizeCollection(lookupResult.enderecos ?? lookupResult.endereco),
        tituloEleitor,
      parentes: normalizeCollection(lookupResult.parentes),
        certidaoNascimento,
        documento,
        cns,
        pis,
        vacinas,
        empresasSocio,
        cnpjMei,
      dividasAtivas: normalizeCollection(lookupResult.dividas_ativas),
        auxilioEmergencial,
        rais,
        inss,
      operadoraClaro: normalizeCollection(lookupResult.operadora_claro),
      operadoraVivo: normalizeCollection(lookupResult.operadora_vivo),
      operadoraTim: normalizeCollection(lookupResult.operadora_tim),
      operadoraOi: normalizeCollection((lookupResult as Record<string, unknown>).operadora_oi),
        senhasEmail,
        senhasCpf,
        gestaoCadastral,
    };
  }, [lookupResult, resultDocument]);

  const selectedLookupProfile: 'puxaTudo' = 'puxaTudo';

  const loadSavedClients = useCallback(async () => {
    if (!user?.id) {
      setSavedClients([]);
      return;
    }

    setIsLoadingSavedClients(true);
    try {
      const response = await apiRequest<any>('/controlepessoal-novocliente?limit=200&offset=0', { method: 'GET' });
      const items = Array.isArray(response?.data?.items) ? (response.data.items as ControlePessoalApiItem[]) : [];

      const mapped = items.map((item) => {
        const metadata = (item.metadata || {}) as Record<string, unknown>;
        return {
          id: String(item.id),
          title: item.titulo || item.cliente_nome || 'Cliente sem nome',
          createdAt: item.created_at,
          document: typeof metadata.document === 'string' ? metadata.document : undefined,
          moduleTitle: typeof metadata.module_title === 'string' ? metadata.module_title : undefined,
          consultationId: typeof metadata.consultation_id === 'number' ? metadata.consultation_id : undefined,
          manual: metadata.manual === true,
          phone: typeof metadata.phone === 'string' ? metadata.phone : undefined,
          email: typeof metadata.email === 'string' ? metadata.email : undefined,
          notes: item.descricao || undefined,
          status: ((item.status as ClientStatus) || 'prioridade-media'),
        } satisfies SavedClient;
      });

      setSavedClients(mapped);
    } catch (error) {
      console.error('Erro ao carregar clientes salvos:', error);
      toast.error('Não foi possível carregar a lista de clientes salvos.');
    } finally {
      setIsLoadingSavedClients(false);
    }
  }, [user?.id]);

  const loadConsultations = useCallback(async () => {
    if (!user?.id) {
      setConsultations([]);
      return;
    }

    setIsLoadingConsultations(true);
    try {
      const response = await consultasCpfService.getByUserId(Number(user.id), 1, 300);
      const history = Array.isArray(response?.data) ? (response.data as ConsultaCpf[]) : [];
      setConsultations(history);
    } catch (error) {
      console.error('Erro ao carregar histórico de consultas:', error);
      setConsultations([]);
    } finally {
      setIsLoadingConsultations(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void Promise.all([loadSavedClients(), loadConsultations()]);
  }, [loadSavedClients, loadConsultations]);

  useEffect(() => {
    if (!lookupResult || !resultSectionRef.current) return;
    const elementTop = resultSectionRef.current.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, elementTop), behavior: 'smooth' });
  }, [lookupResult]);

  const handleRunLookup = useCallback(async () => {
    const documentDigits = lookupDocument.replace(/\D/g, '').slice(0, 11);

    if (documentDigits.length !== 11) {
      toast.error('Informe um CPF válido com 11 dígitos.');
      return;
    }

    setIsLookupSubmitting(true);
    setLookupError(null);
    setShowManualForm(false);
    setLookupResult(null);
    setSelectedSavedClientId(null);

    try {
      const lookupResponse = await baseCpfService.getByCpf(documentDigits);

      if (!lookupResponse?.success || !lookupResponse?.data) {
        throw new Error(lookupResponse?.error || 'Nenhum dado encontrado para este CPF.');
      }

      const enrichedResult = await enrichLookupResultByCpfId(lookupResponse.data as unknown as CpfLookupResult, documentDigits);
      setLookupResult(enrichedResult);

      if (user?.id) {
        try {
          const consumptionResponse = await consultasCpfService.create({
            user_id: Number(user.id),
            module_type: selectedLookupTitle.toUpperCase(),
            document: documentDigits,
            cost: selectedLookupPrice,
            status: 'completed',
            result_data: enrichedResult,
            metadata: {
              source: 'controlepessoal-clientes',
              page_route: '/dashboard/controlepessoal-novocliente',
              module_title: selectedLookupTitle,
            },
          });

          const createdId = Number((consumptionResponse as any)?.data?.id);
          setLatestConsultationId(Number.isFinite(createdId) ? createdId : null);
          await loadConsultations();
        } catch (registerError) {
          console.error('Erro ao registrar consumo da consulta CPF:', registerError);
          toast.warning('Consulta realizada, mas não foi possível registrar o consumo automaticamente.');
        }
      }

      toast.success('Consulta finalizada com sucesso.');
    } catch (error) {
      console.error('Erro ao consultar CPF em Clientes:', error);
      const message = error instanceof Error ? error.message : 'Não foi possível consultar este CPF.';
      setLookupError(message);
      setShowManualForm(true);
      setManualForm((prev) => ({
        ...prev,
        document: formatCpf(documentDigits),
      }));
      toast.error(message);
    } finally {
      setIsLookupSubmitting(false);
    }
  }, [enrichLookupResultByCpfId, lookupDocument, loadConsultations, selectedLookupPrice, selectedLookupTitle, user?.id]);

  const handleSaveLookupClient = useCallback(async () => {
    if (!lookupResult) return;

    const name = extractName(lookupResult);
    const document = extractDocument(lookupResult, lookupDocument);

    if (!name) {
      toast.error('A consulta não retornou um nome válido para salvar.');
      return;
    }

    setIsSavingClient(true);

    try {
      const payload = {
        titulo: name,
        data_referencia: todayBrasilia(),
        descricao: `Cliente salvo via ${selectedLookupTitle}`,
        cliente_nome: name,
        valor: selectedLookupPrice,
        status: 'prioridade-media',
        metadata: {
          document: document ? formatCpf(document) : undefined,
          module_title: selectedLookupTitle,
          consultation_id: latestConsultationId,
          manual: false,
          source: 'consulta-cpf',
          saved_at: new Date().toISOString(),
          status: 'prioridade-media',
        },
      };

      const response = await apiRequest<any>('/controlepessoal-novocliente', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Não foi possível salvar o cliente na lista.');
      }

      await loadSavedClients();
      toast.success('Cliente salvo na lista de clientes consultados.');
    } catch (error) {
      console.error('Erro ao salvar cliente da consulta:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar este cliente.');
    } finally {
      setIsSavingClient(false);
    }
  }, [latestConsultationId, loadSavedClients, lookupDocument, lookupResult, selectedLookupPrice, selectedLookupTitle]);

  const handleSaveManualClient = useCallback(async () => {
    const name = manualForm.name.trim();
    const documentDigits = manualForm.document.replace(/\D/g, '').slice(0, 11);

    if (!name) {
      toast.error('Informe ao menos o nome para cadastro manual.');
      return;
    }

    setIsSavingClient(true);

    try {
      const payload = {
        titulo: name,
        data_referencia: todayBrasilia(),
        descricao: manualForm.notes || 'Cadastro manual após consulta sem retorno.',
        cliente_nome: name,
        valor: 0,
        status: manualForm.status,
        metadata: {
          document: documentDigits ? formatCpf(documentDigits) : undefined,
          phone: manualForm.phone ? formatPhone(manualForm.phone) : undefined,
          email: manualForm.email || undefined,
          module_title: 'Cadastro Manual',
          manual: true,
          source: 'cadastro-manual',
          saved_at: new Date().toISOString(),
          status: manualForm.status,
        },
      };

      const response = await apiRequest<any>(editingSavedClientId ? `/controlepessoal-novocliente/${editingSavedClientId}` : '/controlepessoal-novocliente', {
        method: editingSavedClientId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Não foi possível salvar o cadastro manual.');
      }

      await loadSavedClients();
      toast.success(editingSavedClientId ? 'Cliente atualizado com sucesso.' : 'Cliente salvo manualmente.');
      setManualForm({ name: '', document: '', phone: '', email: '', notes: '', status: 'prioridade-media' });
      setEditingSavedClientId(null);
      setShowManualForm(false);
    } catch (error) {
      console.error('Erro ao salvar cadastro manual:', error);
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar cadastro manual.');
    } finally {
      setIsSavingClient(false);
    }
  }, [editingSavedClientId, loadSavedClients, manualForm]);

  const handleDeleteSavedClient = useCallback(async (client: SavedClient) => {
    if (!window.confirm(`Excluir o cliente "${client.title}"?`)) return;

    try {
      const response = await apiRequest<any>(`/controlepessoal-novocliente/${client.id}`, { method: 'DELETE' });
      if (!response?.success) throw new Error(response?.error || 'Falha ao excluir cliente.');
      await loadSavedClients();
      if (selectedSavedClientId === client.id) {
        setSelectedSavedClientId(null);
      }
      toast.success('Cliente excluído com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir este cliente.');
    }
  }, [loadSavedClients, selectedSavedClientId]);

  const handleEditSavedClient = useCallback((client: SavedClient) => {
    setEditingSavedClientId(client.id);
    setSelectedSavedClientId(client.id);
    setShowManualForm(true);
    setLookupResult(null);
    setLookupDocument(client.document || '');
    setManualForm({
      name: client.title,
      document: client.document || '',
      phone: client.phone || '',
      email: client.email || '',
      notes: client.notes || '',
      status: client.status || 'prioridade-media',
    });
  }, []);

  const handleOpenSavedClient = useCallback(
    async (client: SavedClient) => {
      setSelectedSavedClientId(client.id);
      setLookupError(null);

      if (client.manual) {
        setLookupResult(null);
        setLookupDocument(client.document || '');
        setShowManualForm(true);
        setManualForm((prev) => ({
          ...prev,
          name: client.title,
          document: client.document || '',
          phone: client.phone || '',
          email: client.email || '',
          notes: client.notes || '',
          status: client.status || 'prioridade-media',
        }));
        return;
      }

      const consultation = consultations.find((item) => {
        if (client.consultationId && Number(item.id) === client.consultationId) return true;

        const itemDocument = String(item.document || '').replace(/\D/g, '');
        const clientDocument = String(client.document || '').replace(/\D/g, '');
        return Boolean(itemDocument && clientDocument && itemDocument === clientDocument);
      });

      const resultData = consultation?.result_data;

      if (resultData && typeof resultData === 'object') {
        const savedResult = resultData as CpfLookupResult;
        const savedDocumentDigits = String(client.document || consultation?.document || '').replace(/\D/g, '').slice(0, 11);
        const enrichedSavedResult = await enrichLookupResultByCpfId(savedResult, savedDocumentDigits);
        setLookupResult(enrichedSavedResult);
        setLookupDocument(client.document || String(consultation?.document || ''));
        setShowManualForm(false);
      } else {
        setLookupResult(null);
        setLookupDocument(client.document || '');
        setShowManualForm(true);
        toast.warning('Não encontramos os dados completos da consulta para este cliente.');
      }
    },
    [consultations, enrichLookupResultByCpfId]
  );

  const formatFieldLabel = useCallback((field: string) => {
    return field
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }, []);

  const getExtraFields = useCallback((resultado: NomeConsultaResultado) => {
    const hiddenFields = new Set(['nome', 'cpf', 'nascimento']);

    return Object.entries(resultado)
      .filter(([key, value]) => {
        if (hiddenFields.has(key)) return false;
        if (typeof value !== 'string') return false;
        const normalized = value.trim().toLowerCase();
        return normalized !== '' && normalized !== '-' && normalized !== 'null' && normalized !== 'undefined';
      })
      .map(([key, value]) => ({
        key,
        label: formatFieldLabel(key),
        value: (value as string).trim(),
      }));
  }, [formatFieldLabel]);

  const handleBuscaNomeInModal = useCallback(async () => {
    const inputValue = nomeBuscaInput.trim();
    const isManualLink = inputValue.includes('pastebin.sbs') || inputValue.includes('api.fdxapis.us');

    if (!isManualLink && inputValue.length < 5) {
      toast.error('Digite um nome válido (mínimo 5 caracteres) ou cole um link.');
      return;
    }

    setIsBuscaNomeSubmitting(true);
    setNomeBuscaResultados([]);
    setNomeBuscaTotal(0);
    setNomeBuscaLog(['Iniciando consulta por nome...']);
    setSelectedNomeBuscaResult(null);

    try {
      const response = await buscaNomeService.consultarNome(
        isManualLink ? '' : inputValue,
        isManualLink ? inputValue : undefined
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Não foi possível buscar por nome.');
      }

      const data = response.data;
      let finalResultados: NomeConsultaResultado[] = Array.isArray(data.resultados) ? data.resultados : [];
      let finalTotal = Number(data.total_encontrados || 0);
      const finalLink = data.link || null;

      setNomeBuscaLog(data.log || []);

      if (finalLink && (finalResultados.length === 0 || finalTotal === 0)) {
        setNomeBuscaLog((prev) => [...prev, 'Carregando resultados do link...']);

        try {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 45000);
          const linkResp = await fetch(finalLink, {
            method: 'GET',
            signal: controller.signal,
          });
          const html = await linkResp.text();
          window.clearTimeout(timeoutId);

          const parsed = parseFdxHtmlResults(html);
          if (parsed.length > 0) {
            finalResultados = parsed;
            finalTotal = parsed.length;
            setNomeBuscaLog((prev) => [...prev, `${parsed.length} registro(s) carregado(s) do link.`]);
          }
        } catch {
          setNomeBuscaLog((prev) => [...prev, 'Não foi possível carregar o link automaticamente.']);
        }
      }

      setNomeBuscaResultados(finalResultados);
      setNomeBuscaTotal(finalTotal);

      if (finalTotal === 0) {
        toast.warning('Nenhum registro encontrado para este nome.');
      } else {
        toast.success(`${finalTotal} registro(s) encontrado(s).`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao consultar nome.';
      setNomeBuscaLog((prev) => [...prev, `ERRO: ${message}`]);
      toast.error(message);
    } finally {
      setIsBuscaNomeSubmitting(false);
    }
  }, [nomeBuscaInput]);

  const handleSelectNomeBuscaResult = useCallback((resultado: NomeConsultaResultado) => {
    const cpfDigits = String(resultado.cpf || '').replace(/\D/g, '').slice(0, 11);

    if (cpfDigits.length !== 11) {
      toast.error('Este registro não possui CPF válido para consulta.');
      return;
    }

    setSelectedNomeBuscaResult(resultado);
    setLookupDocument(formatCpf(cpfDigits));
    setLookupError(null);
    setLookupResult(null);
    setShowManualForm(false);
  }, []);

  const handleChooseCpfModuleFromNomeModal = useCallback((moduleId: number) => {
    if (!selectedNomeBuscaResult) {
      toast.error('Selecione um registro da lista antes de escolher o tipo de consulta.');
      return;
    }

    setSelectedLookupModuleId(moduleId);
    setIsBuscaNomeModalOpen(false);
    toast.success('CPF carregado. Agora clique em "Consultar" para executar a consulta de CPF.');
  }, [selectedNomeBuscaResult]);

  useEffect(() => {
    if (!isBuscaNomeModalOpen) {
      setNomeBuscaResultados([]);
      setNomeBuscaTotal(0);
      setNomeBuscaLog([]);
      setSelectedNomeBuscaResult(null);
    }
  }, [isBuscaNomeModalOpen]);


  const resultHasSections = useMemo(
    () => {
      if (!lookupResult) return false;
      const orderedKeys = sectionOrderByModuleProfile[selectedLookupProfile];
      return orderedKeys.some((key) => structuredSections[key].length > 0);
    },
    [lookupResult, selectedLookupProfile, structuredSections]
  );

  const orderedVisibleSections = useMemo(() => {
    const orderedKeys = sectionOrderByModuleProfile[selectedLookupProfile];
    return orderedKeys
      .filter((key) => structuredSections[key].length > 0)
      .map((key) => ({
        key,
        href: sectionAnchorByKey[key],
        title: sectionMetaByKey[key].title,
        icon: sectionMetaByKey[key].icon,
        data: structuredSections[key],
        count: structuredSections[key].length,
      }));
  }, [selectedLookupProfile, structuredSections]);

  const savedClientsWithProfile = useMemo(() => {
    return savedClients.map((client) => {
      const consultation = consultations.find((item) => {
        if (client.consultationId && Number(item.id) === client.consultationId) return true;
        const itemDocument = String(item.document || '').replace(/\D/g, '');
        const clientDocument = String(client.document || '').replace(/\D/g, '');
        return Boolean(itemDocument && clientDocument && itemDocument === clientDocument);
      });

      const resultData = consultation?.result_data;
      const resultObj = resultData && typeof resultData === 'object' ? (resultData as CpfLookupResult) : null;
      const profilePhoto = resolvePhoto(resultObj);
      const resultContact = extractResultContact(resultObj);

      return {
        ...client,
        profilePhoto,
        profilePhone: client.phone || resultContact.phone || '-',
        profileEmail: client.email || resultContact.email || '-',
      };
    });
  }, [consultations, savedClients]);

  return (
    <div className={getDashboardPageClassName('standard')}>
      <SimpleTitleBar
        title="Controle Pessoal • Clientes"
        subtitle="Consulte CPF, salve clientes pagos e use cadastro manual somente quando não houver retorno"
        icon={<Users className="h-5 w-5" />}
        leftActions={(
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full h-8 w-8"
            aria-label="Nova consulta de cliente"
            onClick={() => modulesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
        leftActionsTooltip="Nova consulta"
        onBack={() => navigate('/dashboard')}
      />

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          <Card ref={modulesSectionRef}>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Escolha o módulo de consulta</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Primeiro consulte por CPF (simples ou puxa tudo), depois decida se deseja salvar na sua lista de clientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ModuleGridWrapper className="gap-y-3">
                {selectedModuleCards.map((moduleCard) => {
                  const selected = selectedLookupModuleId === moduleCard.id;

                  return (
                    <div
                      key={moduleCard.id}
                      onClick={() => setSelectedLookupModuleId(moduleCard.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedLookupModuleId(moduleCard.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selected}
                      aria-label={`Selecionar módulo ${moduleCard.title}`}
                      className="relative cursor-pointer"
                    >
                      <div
                        className={cn(
                          'rounded-xl transition-all',
                          selected
                            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                            : 'hover:opacity-100 opacity-95'
                        )}
                      >
                        <ModuleCardTemplates
                          module={{
                            title: moduleCard.title,
                            description: moduleCard.description,
                            price: moduleCard.priceDisplay,
                            originalPrice: moduleCard.originalPriceDisplay,
                            discountPercentage: moduleCard.discountPercentage,
                            status: moduleCard.operationalStatus === 'off' ? 'inativo' : 'ativo',
                            operationalStatus: moduleCard.operationalStatus,
                            iconSize: 'medium',
                            showDescription: true,
                            icon: moduleCard.icon,
                            color: moduleCard.color,
                          }}
                          template={moduleCard.template}
                        />
                        <Badge variant={selected ? 'default' : 'secondary'} className="absolute left-2 top-2 z-10 text-[10px]">
                          {selected ? 'Selecionado' : `ID ${moduleCard.id}`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </ModuleGridWrapper>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <Label htmlFor="clients-lookup-cpf">
                    {isBuscaNomeModuleSelected ? 'CPF para consulta (definido pela Busca Nome)' : 'CPF para consulta'}
                  </Label>
                  <Input
                    id="clients-lookup-cpf"
                    placeholder={isBuscaNomeModuleSelected ? 'Abra o modal para selecionar um CPF' : '000.000.000-00'}
                    inputMode="numeric"
                    maxLength={14}
                    value={lookupDocument}
                    onChange={(event) => setLookupDocument(formatCpf(event.target.value))}
                    disabled={isBuscaNomeModuleSelected}
                  />
                </div>
                <Button
                  type="button"
                  className="sm:self-end"
                  onClick={() => {
                    if (isBuscaNomeModuleSelected) {
                      setIsBuscaNomeModalOpen(true);
                      return;
                    }
                    void handleRunLookup();
                  }}
                  disabled={isLookupSubmitting || isBuscaNomeSubmitting}
                >
                  {isLookupSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Consultando...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      {isBuscaNomeModuleSelected ? 'Buscar por nome' : 'Consultar'}
                    </>
                  )}
                </Button>
              </div>

              {isBuscaNomeModuleSelected ? (
                <p className="text-xs text-muted-foreground">
                  No módulo Busca Nome, clique em "Buscar por nome" para abrir o modal, selecionar um CPF e depois escolher o tipo de consulta.
                </p>
              ) : null}

              <div className="rounded-md border border-border bg-muted/20 p-3 text-sm md:text-base">
                <p>
                  <span className="font-semibold">Módulo selecionado:</span> {selectedLookupTitle}
                </p>
                <p>
                  <span className="font-semibold">Valor da consulta:</span> {formatCurrency(selectedLookupPrice)}
                </p>
              </div>

              {lookupError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Consulta sem retorno
                  </div>
                  <p className="mt-1">{lookupError}</p>
                  <p className="mt-1">Você pode cadastrar manualmente logo abaixo.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {lookupResult ? (
            <Card ref={resultSectionRef}>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Cliente encontrado</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Revise os dados retornados e escolha salvar ou fazer uma nova busca.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
                    <div className="flex items-center justify-center">
                      {resultPhoto ? (
                        <img
                          src={resultPhoto}
                          alt={`Foto de ${resultName || 'cliente consultado'}`}
                          className="h-20 w-20 rounded-full border border-border object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-border bg-muted/40">
                          <UserCircle className="h-10 w-10 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Nome</p>
                      <p className="text-sm font-semibold sm:text-base">{resultName || 'Não informado'}</p>
                      <p className="text-xs text-muted-foreground sm:text-sm">CPF: {resultDocument ? formatCpf(resultDocument) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">CSB8</p>
                      <p className="text-base font-semibold sm:text-lg">{topScores.csb8}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">CSBA</p>
                      <p className="text-base font-semibold sm:text-lg">{topScores.csba}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={() => void handleSaveLookupClient()} disabled={isSavingClient} className="w-full sm:w-auto">
                    {isSavingClient ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Salvar cliente
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setLookupResult(null);
                      setLookupError(null);
                      setShowManualForm(false);
                    }}
                    disabled={isSavingClient}
                  >
                    Nova busca
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Dialog open={isBuscaNomeModalOpen} onOpenChange={setIsBuscaNomeModalOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
              <DialogHeader>
                <DialogTitle>Busca Nome</DialogTitle>
                <DialogDescription>
                  Mesmo fluxo da consulta por nome: busque, selecione um resultado e escolha o tipo de consulta CPF.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    value={nomeBuscaInput}
                    placeholder="Ex: Maria da Silva ou cole um link..."
                    onChange={(event) => setNomeBuscaInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !isBuscaNomeSubmitting) {
                        event.preventDefault();
                        void handleBuscaNomeInModal();
                      }
                    }}
                  />
                  <Button type="button" onClick={() => void handleBuscaNomeInModal()} disabled={isBuscaNomeSubmitting}>
                    {isBuscaNomeSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Consultar Nome
                      </>
                    )}
                  </Button>
                </div>

                {nomeBuscaLog.length > 0 ? (
                  <div className="rounded-md border border-border bg-muted/30 p-2">
                    <pre className="max-h-28 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
                      {nomeBuscaLog.join('\n')}
                    </pre>
                  </div>
                ) : null}

                {nomeBuscaResultados.length > 0 ? (
                  <>
                    <div className="rounded-md border border-border bg-muted/20 p-2 text-sm">
                      <span className="font-semibold">Resultados encontrados:</span> {nomeBuscaTotal}
                    </div>

                    <div className="hidden sm:block overflow-x-auto rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>CPF</TableHead>
                            <TableHead>Nascimento</TableHead>
                            <TableHead>Demais Dados</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {nomeBuscaResultados.map((resultado, index) => {
                            const extraFields = getExtraFields(resultado);
                            const isSelected = selectedNomeBuscaResult?.cpf === resultado.cpf && selectedNomeBuscaResult?.nome === resultado.nome;

                            return (
                              <TableRow key={`${resultado.cpf || 'registro'}-${index}`}>
                                <TableCell className="font-medium">{resultado.nome || '—'}</TableCell>
                                <TableCell className="font-mono text-sm">{resultado.cpf || '—'}</TableCell>
                                <TableCell>{resultado.nascimento || '—'}</TableCell>
                                <TableCell>
                                  {extraFields.length > 0 ? (
                                    <div className="space-y-1">
                                      {extraFields.map((field) => (
                                        <div key={field.key} className="text-xs leading-relaxed">
                                          <span className="text-muted-foreground">{field.label}: </span>
                                          <span>{field.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    variant={isSelected ? 'secondary' : 'outline'}
                                    size="sm"
                                    onClick={() => handleSelectNomeBuscaResult(resultado)}
                                  >
                                    {isSelected ? 'Selecionado' : 'Selecionar'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="space-y-2 sm:hidden">
                      {nomeBuscaResultados.map((resultado, index) => {
                        const extraFields = getExtraFields(resultado);
                        const isSelected = selectedNomeBuscaResult?.cpf === resultado.cpf && selectedNomeBuscaResult?.nome === resultado.nome;

                        return (
                          <div key={`${resultado.cpf || 'registro-mobile'}-${index}`} className="rounded-md border border-border p-3">
                            <p className="text-sm font-medium">{resultado.nome || '—'}</p>
                            <p className="text-xs text-muted-foreground">CPF: {resultado.cpf || '—'}</p>
                            <p className="text-xs text-muted-foreground">Nascimento: {resultado.nascimento || '—'}</p>
                            {extraFields.length > 0 ? (
                              <div className="mt-2 space-y-1 border-t border-border pt-2">
                                {extraFields.map((field) => (
                                  <div key={field.key} className="text-xs">
                                    <span className="text-muted-foreground">{field.label}: </span>
                                    <span>{field.value}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            <Button
                              type="button"
                              variant={isSelected ? 'secondary' : 'outline'}
                              size="sm"
                              className="mt-3 w-full"
                              onClick={() => handleSelectNomeBuscaResult(resultado)}
                            >
                              {isSelected ? 'Selecionado' : 'Selecionar'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : null}

                {selectedNomeBuscaResult ? (
                  <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                    <p className="text-sm">
                      <span className="font-semibold">CPF selecionado:</span> {selectedNomeBuscaResult.cpf || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">Escolha o tipo de consulta CPF para continuar:</p>
                    <div className="flex flex-wrap gap-2">
                      {cpfLookupModules.map((module) => (
                        <Button
                          key={module.id}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleChooseCpfModuleFromNomeModal(module.id)}
                        >
                          {module.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>

          {orderedVisibleSections.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg text-success">Sucesso</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Clique nas sessões abaixo para navegar pelo resultado encontrado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {orderedVisibleSections.map((section) => (
                    <a
                      key={section.key}
                      href={section.href}
                      className="no-underline"
                      onClick={(event) => {
                        event.preventDefault();
                        smoothScrollToHash(section.href, { duration: 250, offsetTop: 96 });
                      }}
                    >
                      <span className="relative inline-flex">
                        <Badge variant="secondary" className="bg-success text-success-foreground hover:bg-success/80 cursor-pointer transition-colors text-xs">
                          {section.title}
                        </Badge>
                        {section.count > 0 ? (
                          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground ring-1 ring-background">
                            {section.count}
                          </span>
                        ) : null}
                      </span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {resultHasSections ? (
            <div className="space-y-4">
              {orderedVisibleSections.map((section) => (
                section.key === 'fotos' && Number((lookupResult as Record<string, unknown>)?.id || 0) > 0 ? (
                  <Card key={section.key} id={section.href.replace('#', '')}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        {section.icon}
                        {section.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FotosSection
                        cpfId={Number((lookupResult as Record<string, unknown>).id)}
                        cpfNumber={resultDocument}
                        canManage={false}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <SectionGrid key={section.key} sectionId={section.href.replace('#', '')} title={section.title} icon={section.icon} data={section.data} />
                )
              ))}
            </div>
          ) : null}

          {showManualForm ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Cadastro manual (fallback)</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Use apenas quando a consulta não retornar dados para o CPF pesquisado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="manual-name">Nome do cliente</Label>
                    <Input
                      id="manual-name"
                      placeholder="Ex.: Maria da Silva"
                      value={manualForm.name}
                      onChange={(event) => setManualForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-cpf">CPF</Label>
                    <Input
                      id="manual-cpf"
                      placeholder="000.000.000-00"
                      value={manualForm.document}
                      onChange={(event) => setManualForm((prev) => ({ ...prev, document: formatCpf(event.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-phone">Telefone</Label>
                    <Input
                      id="manual-phone"
                      placeholder="(11) 99999-9999"
                      value={manualForm.phone}
                      onChange={(event) => setManualForm((prev) => ({ ...prev, phone: formatPhone(event.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="manual-email">Email</Label>
                    <Input
                      id="manual-email"
                      type="email"
                      placeholder="cliente@email.com"
                      value={manualForm.email}
                      onChange={(event) => setManualForm((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-notes">Observações</Label>
                  <Textarea
                    id="manual-notes"
                    placeholder="Ex.: Não encontrado na base, cadastro feito manualmente para follow-up"
                    value={manualForm.notes}
                    onChange={(event) => setManualForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </div>
                <Button type="button" className="w-full sm:w-auto" onClick={() => void handleSaveManualClient()} disabled={isSavingClient}>
                  {isSavingClient ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar cadastro manual'
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Clientes salvos</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Lista dos clientes que você consultou e decidiu manter no painel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingSavedClients || isLoadingConsultations ? (
              <p className="text-sm text-muted-foreground">Carregando clientes...</p>
            ) : savedClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente salvo até o momento.</p>
            ) : (
              savedClientsWithProfile.map((client) => (
                <div
                  key={client.id}
                  className={`w-full rounded-xl border p-4 transition-colors ${selectedSavedClientId === client.id ? 'border-primary bg-accent/30' : 'border-border hover:bg-accent/20'}`}
                >
                  <div className="flex items-start gap-3">
                    <button type="button" onClick={() => handleOpenSavedClient(client)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                      <div className="shrink-0">
                        {client.profilePhoto ? (
                          <img
                            src={client.profilePhoto}
                            alt={`Foto de ${client.title}`}
                            className="h-16 w-16 rounded-full border border-border object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/40">
                            <UserCircle className="h-8 w-8 text-muted-foreground" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold sm:text-base truncate">{client.title}</p>
                          <Badge variant="secondary">{formatDateTime(client.createdAt)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground sm:text-sm">CPF: {client.document || 'Não informado'}</p>
                        <p className="text-xs text-muted-foreground sm:text-sm">Telefone: {client.profilePhone}</p>
                        <p className="text-xs text-muted-foreground sm:text-sm">Email: {client.profileEmail}</p>
                        <p className="text-xs text-muted-foreground sm:text-sm">Módulo: {client.moduleTitle || (client.manual ? 'Cadastro Manual' : 'Consulta CPF')}</p>
                      </div>
                    </button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 shrink-0"
                      aria-label={`Excluir cliente ${client.title}`}
                      onClick={() => void handleDeleteSavedClient(client)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ControlePessoalClientesPage;
