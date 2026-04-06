
import React from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleTitleBar from '@/components/dashboard/SimpleTitleBar';
import { getDashboardTitleWrapperClassName } from '@/components/dashboard/layout/dashboardPageTemplate';

export interface PageHeaderCardProps {
  title: string;
  subtitle: string;
  isControlPanel?: boolean;
  extra?: React.ReactElement;
  currentPlan?: string;
  badgeText?: string;
  value?: string;
  valueDetails?: string;
  showAddButton?: boolean;
  isCompact?: boolean;
}

const PageHeaderCard: React.FC<PageHeaderCardProps> = ({ 
  title, 
  subtitle, 
  isControlPanel = false,
  extra,
  currentPlan,
  badgeText,
  value,
  valueDetails,
  showAddButton,
  isCompact
}) => {
  const navigate = useNavigate();

  const subtitleParts = [subtitle, currentPlan ? `Plano: ${currentPlan}` : null, valueDetails || null].filter(Boolean);
  const computedSubtitle = subtitleParts.join(' • ');

  const computedTitle = badgeText ? `${title} • ${badgeText}` : title;

  const extraNode = extra ? (
    <div className="flex items-center gap-2">
      {extra}
    </div>
  ) : undefined;

  return (
    <div className={getDashboardTitleWrapperClassName()}>
      <SimpleTitleBar
        title={computedTitle}
        subtitle={computedSubtitle}
        right={extraNode}
        onBack={() => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'))}
        useModuleMetadata={false}
      />
    </div>
  );
};

export default PageHeaderCard;
