const currencyFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR"
});

const dateFormatter = new Intl.DateTimeFormat("en-IE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric"
});

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return dateFormatter.format(date);
}
