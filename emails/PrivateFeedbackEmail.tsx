import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type PrivateFeedbackEmailProps = {
  cafeName: string;
  rating: number;
  message?: string | null;
  contact?: string | null;
  dashboardUrl: string;
};

const previewText = "New private feedback received.";

export default function PrivateFeedbackEmail({
  cafeName = "LocalPulse Cafe",
  rating = 2,
  message,
  contact,
  dashboardUrl = "https://localpulsehq.com/dashboard/feedback",
}: PrivateFeedbackEmailProps) {
  const stars = "\u2605".repeat(Math.max(1, Math.min(5, rating)));
  const safeMessage = (message ?? "").trim();
  const safeContact = (contact ?? "").trim();

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            <Text style={styles.kicker}>LocalPulse feedback gate</Text>
            <Heading style={styles.heading}>
              New private feedback ({rating}\u2605)
            </Heading>
            <Text style={styles.subheading}>
              {cafeName}
            </Text>

            <Text style={styles.label}>Rating</Text>
            <Text style={styles.value}>
              {stars} ({rating} out of 5)
            </Text>

            {safeMessage ? (
              <>
                <Text style={styles.label}>Message</Text>
                <Text style={styles.value}>{safeMessage}</Text>
              </>
            ) : null}

            {safeContact ? (
              <>
                <Text style={styles.label}>Contact</Text>
                <Text style={styles.value}>{safeContact}</Text>
              </>
            ) : null}

            <Link href={dashboardUrl} style={styles.cta}>
              View in LocalPulse
            </Link>
          </Section>

          <Hr style={styles.divider} />
          <Text style={styles.footer}>
            You are receiving this because your feedback gate is enabled.
          </Text>
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
    maxWidth: "560px",
    margin: "0 auto",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #E5EDF2",
  },
  kicker: {
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    fontSize: "11px",
    color: "#94A3B8",
    margin: "0 0 6px",
  },
  heading: {
    fontSize: "22px",
    lineHeight: "1.2",
    margin: "0 0 6px",
    color: "#0B1220",
  },
  subheading: {
    fontSize: "13px",
    color: "#64748B",
    margin: "0 0 16px",
  },
  label: {
    fontSize: "12px",
    color: "#94A3B8",
    margin: "12px 0 4px",
  },
  value: {
    fontSize: "14px",
    color: "#0B1220",
    margin: "0",
  },
  cta: {
    display: "inline-block",
    marginTop: "18px",
    backgroundColor: "#22C3A6",
    color: "#0B1220",
    fontSize: "13px",
    fontWeight: "600",
    borderRadius: "999px",
    padding: "10px 18px",
    textDecoration: "none",
  },
  divider: {
    borderColor: "#E5EDF2",
    margin: "18px 0 8px",
  },
  footer: {
    fontSize: "11px",
    color: "#94A3B8",
    margin: "0 4px",
  },
};
