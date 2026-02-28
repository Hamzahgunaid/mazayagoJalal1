# API Contracts (Public)

GET /api/service/[slug]
  -> { service, aggregates, categories, nodes_sample }

GET /api/service/[slug]/reviews?q=&stars=&has_media=&has_owner_reply=&origin=&country=&city=&sort=&cursor=
  -> { items:[...], nextCursor }

POST /api/reviews
  Body: { service_node_id, rating, title, body, visit_date?, session_token? }
  -> { ok:true, review_id }

POST /api/reviews/[id]/reply
  Body: { body }
  -> { ok:true }

POST /api/reviews/[id]/vote
  Body: { kind: 'helpful'|'not_helpful' }
  -> { ok:true, helpful_count, not_helpful_count }

POST /api/reviews/[id]/flag
  Body: { reason }
  -> { ok:true }

POST /api/upload (multipart/form-data)
  Fields: file, scope=review|service|user
  -> { url }
