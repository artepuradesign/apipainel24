import React from "react";
import { useNavigate } from "react-router-dom";
import SimpleTitleBar from "@/components/dashboard/SimpleTitleBar";
import { getDashboardTitleWrapperClassName } from "@/components/dashboard/layout/dashboardPageTemplate";

interface DashboardTitleCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Por padrão volta para /dashboard (como solicitado) */
  backTo?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

const DashboardTitleCard = ({
  title,
  subtitle,
  icon,
  backTo = "/dashboard",
  onBack,
  right,
}: DashboardTitleCardProps) => {
  const navigate = useNavigate();

  return (
    <div className={getDashboardTitleWrapperClassName()}>
      <SimpleTitleBar
        title={title}
        subtitle={subtitle}
        icon={icon}
        right={right}
        onBack={onBack ?? (() => navigate(backTo))}
        useModuleMetadata={false}
      />
    </div>
  );
};

export default DashboardTitleCard;
