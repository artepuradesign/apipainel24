export type DashboardSpacingVariant = 'standard' | 'compact';

const dashboardSpacingByVariant: Record<DashboardSpacingVariant, string> = {
  standard: 'space-y-2 md:space-y-3',
  compact: 'space-y-2 md:space-y-3',
};

const dashboardHeaderGapByVariant: Record<DashboardSpacingVariant, string> = {
  standard: 'mt-2 md:mt-3',
  compact: 'mt-2 md:mt-3',
};

const dashboardTitleWrapperClassName = '-mb-2 md:-mb-2';

export const getDashboardPageClassName = (variant: DashboardSpacingVariant = 'standard') =>
  `${dashboardSpacingByVariant[variant]} relative z-10`;

export const getDashboardHeaderContentGapClassName = (variant: DashboardSpacingVariant = 'standard') =>
  dashboardHeaderGapByVariant[variant];

export const getDashboardTitleWrapperClassName = () => dashboardTitleWrapperClassName;