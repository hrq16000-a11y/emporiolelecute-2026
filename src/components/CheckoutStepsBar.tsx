import CheckoutSteps from "./CheckoutSteps";

interface Props {
  current?: 1 | 2 | 3;
  sectionIds?: [string, string, string];
}

/** Barra sticky em fluxo: sem troca de altura, spacer ou animação de layout. */
const CheckoutStepsBar = ({ current = 1, sectionIds }: Props) => (
  <div className="sticky top-16 md:top-24 z-40 mb-6 rounded-lg border border-border bg-card p-2 md:p-3 shadow-sm">
    <CheckoutSteps current={current} sectionIds={sectionIds} />
  </div>
);

export default CheckoutStepsBar;
