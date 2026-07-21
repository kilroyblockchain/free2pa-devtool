#!/usr/bin/env bash
# generate-cert.sh — Generate a self-signed ECDSA P-256 cert for Free2PA signing.
#
# A single self-signed cert is sufficient for Dev/Classroom trust profile.
# For Org/Public trust, replace with a cert issued by a shared CA.
#
# Usage:
#   bash certs/generate-cert.sh
#
# Environment variables (all optional):
#   ORG_NAME      Organization name   (default: "Free2PA Group")
#   COMMON_NAME   Certificate CN      (default: "Free2PA Dev Signing")
#   VALIDITY_DAYS Lifetime in days    (default: 1095 = 3 years)
#
# Outputs:
#   certs/signing.key  — ECDSA P-256 private key  (keep secret, never commit)
#   certs/signing.crt  — Self-signed X.509 cert   (share with verifiers)

set -euo pipefail

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ORG_NAME="${ORG_NAME:-Free2PA Group}"
COMMON_NAME="${COMMON_NAME:-Free2PA Dev Signing}"
VALIDITY_DAYS="${VALIDITY_DAYS:-1095}"

KEY="$CERT_DIR/signing.key"
CRT="$CERT_DIR/signing.crt"
CONF="$CERT_DIR/tmp_cert.conf"
trap 'rm -f "$CONF"' EXIT

echo "=== Free2PA Certificate Generator ==="
echo "Org         : $ORG_NAME"
echo "Common Name : $COMMON_NAME"
echo "Validity    : $VALIDITY_DAYS days"
echo ""

cat > "$CONF" <<EOF
[req]
distinguished_name = dn
x509_extensions    = v3
prompt             = no

[dn]
O  = $ORG_NAME
CN = $COMMON_NAME

[v3]
basicConstraints     = critical, CA:FALSE
keyUsage             = critical, digitalSignature
subjectKeyIdentifier = hash
EOF

echo "[1/2] Generating ECDSA P-256 private key..."
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$KEY"
chmod 600 "$KEY"

echo "[2/2] Generating self-signed certificate..."
openssl req -new -x509 \
  -key "$KEY" \
  -out "$CRT" \
  -days "$VALIDITY_DAYS" \
  -config "$CONF"

echo ""
openssl x509 -in "$CRT" -noout -subject -dates
echo ""
echo "Files written:"
echo "  Key  : $KEY"
echo "  Cert : $CRT"
echo ""
echo "Next: copy .env.example to .env, then npm start"
