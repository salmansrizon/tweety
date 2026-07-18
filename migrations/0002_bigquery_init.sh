#!/usr/bin/env bash
# Provision the BigQuery Sandbox dataset for Tweety's raw archive.
# Requires: `gcloud auth login` (or GCP_SA_KEY loaded) and `gcloud config set project <PROJECT_ID>`.
set -euo pipefail

DATASET="archive"
LOCATION="${BQ_LOCATION:-US}"

bq mk --dataset --location="$LOCATION" --description="Tweety raw post archive (Sandbox mode)" "${DATASET}"

bq query --use_legacy_sql=false < "$(dirname "$0")/0002_bigquery_init.sql"

echo "Created dataset '${DATASET}' and table '${DATASET}.posts' in project $(gcloud config get-value project)."
