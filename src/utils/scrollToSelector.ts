export const SEDE_SELECTOR_ID = 'selector-de-sede';

export const scrollToSelector = () => {
  const el = document.getElementById(SEDE_SELECTOR_ID);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};