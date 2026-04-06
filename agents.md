# WIKI-PULSE Project Constraints & Aiven Kafka Limits

## Aiven Free Kafka Plan
- **Service Type**: Apache Kafka® (Free Tier)
- **Throughput**: 250 KiB/s Ingress / 250 KiB/s Egress.
- **Topics**: Max 5 topics.
- **Partitions**: Max 2 partitions per topic.
- **Data Retention**: Up to 3 days (Project target: 1 minute).
- **Schema Registry**: Karapace (Confluent compatibility).
- **Inactivity**: Powers off after 24 hours of zero activity.

## Connection Strategy
- **Auth**: Service SSL Certificates (CA, Access Cert, Access Key).
- **Schema Registry**: HTTPS with Username/Password authentication.

## Backend Rules
- **Slimming**: All Wikipedia events MUST be slimmed to the absolute minimum required for the dashboard.
- **Windowing**: Calculations at 5s intervals to keep data fresh but controlled.
