import { render } from "@react-email/render";
import WeeklyDigestEmail from "../emails/WeeklyDigestEmail";

(async () => {
  const html = await render(
    <WeeklyDigestEmail
      cafeName="Luna Espresso"
      weekOf="Week of Mar 3"
      focusLine="Prompt reviews this week to maintain momentum."
      focusReason="Based on your last 7 days of reviews."
      focusLink="https://localpulsehq.com/dashboard?focus=1"
      ctaUrl="https://localpulsehq.com/dashboard"
      summaryItems={[
        {
          label: "Customers love your coffee",
          value: "Mentioned in 7 recent reviews.",
          tone: "good",
          href: "https://localpulsehq.com/dashboard?insight=praise",
        },
        {
          label: "Review velocity",
          value: "Down 35% vs last week.",
          tone: "warn",
          href: "https://localpulsehq.com/dashboard?insight=velocity",
        },
        {
          label: "Competitor delta",
          value: "Rated higher (4.6 vs 4.3).",
          tone: "info",
          href: "https://localpulsehq.com/dashboard?insight=competitor",
        },
      ]}
    />
  );

  console.log(html);
})();
