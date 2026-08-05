import { IntegrityPage } from "./ui/pages/IntegrityPage";
import { IntegrityOverviewWidget } from "./ui/widgets/IntegrityOverviewWidget";
import { IntegrityField } from "./ui/fields/IntegrityField";

export const pages = { "/integrity": IntegrityPage };
export const widgets = { "integrity-overview": IntegrityOverviewWidget };
export const fields = { integrity: IntegrityField };
export default { pages, widgets, fields };
