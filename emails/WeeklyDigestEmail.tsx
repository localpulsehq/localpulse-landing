import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

type SummaryItem = {
  label: string;
  value: string;
  tone?: "good" | "warn" | "info";
  href?: string;
};

type WeeklyDigestEmailProps = {
  cafeName: string;
  weekOf: string;
  summaryItems: SummaryItem[];
  focusLine: string;
  focusReason?: string;
  focusLink?: string;
  ctaUrl: string;
  logoUrl?: string;
  unsubscribeUrl?: string;
  heroGifUrl?: string;
};

const previewText = "Your LocalPulse weekly insights are ready.";

export default function WeeklyDigestEmail({
  cafeName = "Luna Espresso",
  weekOf = "Week of Mar 3",
  summaryItems = [
    { label: "Customers love", value: "Coffee quality", tone: "good" },
    { label: "Review velocity", value: "Down 35%", tone: "warn" },
    { label: "Competitor delta", value: "Rated higher (4.6 vs 4.3)", tone: "info" },
  ],
  focusLine = "Prompt reviews this week to maintain momentum.",
  focusReason = "Based on your last 7 days of reviews.",
  focusLink,
  ctaUrl = "https://localpulsehq.com/dashboard",
  logoUrl,
  unsubscribeUrl,
  heroGifUrl,
}: WeeklyDigestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.topBand}>
            <Row>
              <Column>
                {logoUrl ? (
                  <Img src={logoUrl} alt="LocalPulse" width="120" style={styles.logo} />
                ) : (
                  <Text style={styles.logoText}>LocalPulse</Text>
                )}
              </Column>
              <Column align="right">
                <Text style={styles.weekLabel}>{weekOf}</Text>
              </Column>
            </Row>
            <Heading style={styles.heading}>Weekly Digest</Heading>
            <Text style={styles.subheading}>
              Deliver value without logging in. A quick pulse on what matters this week.
            </Text>
          </Section>

          {heroGifUrl ? (
            <Section style={styles.heroCard}>
              <Img
                src={heroGifUrl}
                alt="Weekly pulse"
                width="520"
                style={styles.heroImg}
              />
              <Text style={styles.heroNote}>
                Animation support varies by email client.
              </Text>
            </Section>
          ) : null}

          <Section style={styles.card}>
            <Text style={styles.sectionKicker}>This week at</Text>
            <Heading style={styles.cafeName}>{cafeName}</Heading>

            <Section style={styles.summaryWrap}>
              {summaryItems.map((item, index) => (
                <Row key={`${item.label}-${index}`} style={styles.summaryRow}>
                  <Column style={styles.summaryIconCol}>
                    <span style={{ ...styles.toneDot, ...toneDot(item.tone) }} />
                  </Column>
                  <Column>
                    {item.href ? (
                      <Link href={item.href} style={styles.summaryLink}>
                        <Text style={styles.summaryLabel}>{item.label}</Text>
                        <Text style={styles.summaryValue}>{item.value}</Text>
                      </Link>
                    ) : (
                      <>
                        <Text style={styles.summaryLabel}>{item.label}</Text>
                        <Text style={styles.summaryValue}>{item.value}</Text>
                      </>
                    )}
                  </Column>
                </Row>
              ))}
            </Section>
          </Section>

          <Section style={styles.card}>
            <Text style={styles.sectionKicker}>Suggested focus</Text>
            <Text style={styles.focusText}>{focusLine}</Text>
            <Text style={styles.focusReason}>{focusReason}</Text>
            <Button href={focusLink ?? ctaUrl} style={styles.ctaButton}>
              View focus insight
            </Button>
            <Button href={ctaUrl} style={styles.secondaryButton}>
              Open this week's insights
            </Button>
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              You are receiving this email because you have a LocalPulse account.
            </Text>
            {unsubscribeUrl ? (
              <Link href={unsubscribeUrl} style={styles.footerLink}>
                Unsubscribe
              </Link>
            ) : null}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#F6F9FA",
    fontFamily: "\"Inter\", \"Helvetica Neue\", Arial, sans-serif",
    margin: "0",
    padding: "24px 12px",
  },
  container: {
    maxWidth: "640px",
    margin: "0 auto",
    backgroundColor: "#F6F9FA",
  },
  topBand: {
    padding: "24px 24px 16px",
    backgroundColor: "#0B1220",
    color: "#FFFFFF",
    borderRadius: "16px",
  },
  logo: {
    display: "block",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: "18px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    margin: "0",
  },
  weekLabel: {
    color: "#94A3B8",
    fontSize: "12px",
    margin: "0",
  },
  heading: {
    fontSize: "28px",
    lineHeight: "1.2",
    margin: "16px 0 8px",
  },
  subheading: {
    color: "#D6DEE8",
    fontSize: "14px",
    margin: "0",
  },
  heroCard: {
    marginTop: "16px",
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    padding: "16px",
  },
  heroImg: {
    width: "100%",
    borderRadius: "12px",
    display: "block",
  },
  heroNote: {
    fontSize: "11px",
    color: "#94A3B8",
    margin: "8px 0 0",
  },
  card: {
    marginTop: "16px",
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #E5EDF2",
  },
  sectionKicker: {
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    fontSize: "11px",
    color: "#94A3B8",
    margin: "0 0 6px",
  },
  cafeName: {
    fontSize: "22px",
    margin: "0 0 16px",
    color: "#0B1220",
  },
  summaryWrap: {
    padding: "0",
  },
  summaryRow: {
    paddingBottom: "12px",
  },
  summaryIconCol: {
    width: "20px",
    verticalAlign: "top" as const,
  },
  toneDot: {
    display: "inline-block",
    width: "10px",
    height: "10px",
    borderRadius: "999px",
  },
  summaryLabel: {
    fontSize: "12px",
    color: "#94A3B8",
    margin: "0 0 2px",
  },
  summaryValue: {
    fontSize: "15px",
    color: "#0B1220",
    margin: "0",
    fontWeight: "600",
  },
  focusText: {
    fontSize: "15px",
    color: "#0B1220",
    margin: "0 0 16px",
  },
  focusReason: {
    fontSize: "12px",
    color: "#94A3B8",
    margin: "0 0 16px",
  },
  ctaButton: {
    backgroundColor: "#22C3A6",
    color: "#0B1220",
    fontSize: "14px",
    fontWeight: "600",
    borderRadius: "999px",
    padding: "12px 22px",
    textDecoration: "none",
    display: "inline-block",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    color: "#0B1220",
    fontSize: "13px",
    fontWeight: "600",
    borderRadius: "999px",
    padding: "10px 20px",
    textDecoration: "none",
    display: "inline-block",
    border: "1px solid #E2E8F0",
    marginLeft: "10px",
  },
  divider: {
    borderColor: "#E5EDF2",
    margin: "24px 0 8px",
  },
  footer: {
    padding: "0 8px 16px",
  },
  footerText: {
    fontSize: "11px",
    color: "#94A3B8",
    margin: "0 0 6px",
  },
  footerLink: {
    fontSize: "11px",
    color: "#64748B",
  },
  summaryLink: {
    textDecoration: "none",
    color: "inherit",
    display: "block",
  },
};

function toneDot(tone?: SummaryItem["tone"]) {
  switch (tone) {
    case "good":
      return { backgroundColor: "#22C3A6" };
    case "warn":
      return { backgroundColor: "#F59E0B" };
    default:
      return { backgroundColor: "#38BDF8" };
  }
}
