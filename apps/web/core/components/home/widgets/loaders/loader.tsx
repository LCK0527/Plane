// components
import { QuickLinksWidgetLoader } from "./quick-links";
import { RecentActivityWidgetLoader } from "./recent-activity";
import { UnassignedWorkWidgetLoader } from "./unassigned-work";

// types

type Props = {
  widgetKey: EWidgetKeys;
};

export enum EWidgetKeys {
  RECENT_ACTIVITY = "recent_activity",
  QUICK_LINKS = "quick_links",
  UNASSIGNED_WORK = "unassigned_work",
}

export const WidgetLoader: React.FC<Props> = (props) => {
  const { widgetKey } = props;

  const loaders = {
    [EWidgetKeys.RECENT_ACTIVITY]: <RecentActivityWidgetLoader />,
    [EWidgetKeys.QUICK_LINKS]: <QuickLinksWidgetLoader />,
    [EWidgetKeys.UNASSIGNED_WORK]: <UnassignedWorkWidgetLoader />,
  };

  return loaders[widgetKey];
};
