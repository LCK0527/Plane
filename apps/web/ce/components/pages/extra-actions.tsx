// store
import type { EPageStoreType } from "@/plane-web/hooks/store";
import type { TPageInstance } from "@/store/pages/base-page";
// components
import { PageAIModularizeButton } from "@/components/pages/ai-modularize/button";

export type TPageHeaderExtraActionsProps = {
  page: TPageInstance;
  storeType: EPageStoreType;
};

export const PageDetailsHeaderExtraActions: React.FC<TPageHeaderExtraActionsProps> = (props) => {
  const { page, storeType } = props;
  return <PageAIModularizeButton page={page} storeType={storeType} />;
};
