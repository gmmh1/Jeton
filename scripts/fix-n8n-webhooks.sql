-- Backfill published workflow versions required by activeVersionId FK.
INSERT INTO workflow_history (
  "versionId",
  "workflowId",
  authors,
  "createdAt",
  "updatedAt",
  nodes,
  connections,
  name,
  autosaved,
  description
)
SELECT
  we."versionId",
  we.id,
  'system',
  NOW(),
  NOW(),
  we.nodes,
  we.connections,
  we.name,
  FALSE,
  we.description
FROM workflow_entity we
LEFT JOIN workflow_history wh ON wh."versionId" = we."versionId"
WHERE wh."versionId" IS NULL;

-- Ensure active workflows point to a valid published version.
UPDATE workflow_entity
SET "activeVersionId" = "versionId"
WHERE active = TRUE
  AND ("activeVersionId" IS NULL OR "activeVersionId" <> "versionId");

-- Register production webhook routes from active workflow webhook nodes.
INSERT INTO webhook_entity (
  "webhookPath",
  method,
  node,
  "workflowId",
  "pathLength"
)
SELECT DISTINCT
  TRIM(BOTH '/' FROM node_elem->'parameters'->>'path') AS "webhookPath",
  UPPER(COALESCE(node_elem->'parameters'->>'httpMethod', 'POST')) AS method,
  node_elem->>'name' AS node,
  we.id AS "workflowId",
  ARRAY_LENGTH(REGEXP_SPLIT_TO_ARRAY(TRIM(BOTH '/' FROM node_elem->'parameters'->>'path'), '/'), 1) AS "pathLength"
FROM workflow_entity we
CROSS JOIN LATERAL JSON_ARRAY_ELEMENTS(
  CASE
    WHEN JSON_TYPEOF(we.nodes::json) = 'array' THEN we.nodes::json
    ELSE '[]'::json
  END
) AS node_elem
WHERE we.active = TRUE
  AND node_elem->>'type' = 'n8n-nodes-base.webhook'
  AND COALESCE(node_elem->'parameters'->>'path', '') <> ''
ON CONFLICT ("webhookPath", method) DO UPDATE
SET
  node = EXCLUDED.node,
  "workflowId" = EXCLUDED."workflowId",
  "pathLength" = EXCLUDED."pathLength";
