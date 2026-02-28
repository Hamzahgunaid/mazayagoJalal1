# Rateverse — Public Service Page & Write‑a‑Review (Final Design Proposal)
**Version:** 2025-09-23 13:58:34 UTC

## Goals
- تجربة حديثة وموثوقة مستلهمة من أفضل الممارسات، متوافقة مع قاعدة بيانات Rateverse الحالية.
- دعم قنوات التحقق (QR/Invite/Organic)، وشفافية واضحة (R‑Score، قنوات المصدر، آخر 30/365).
- أداء/SEO/وصولية ممتازة، مع قابلية التوسّع لاحقًا (AI summaries، helpful sorting).

## Information Architecture
- `/s/[slug]` صفحة الخدمة (Tabs: Reviews | About | Locations | Media)
- `/s/[slug]/review` كتابة مراجعة (organic)
- `/r?token=…&n={node_uuid}&s={service_uuid}&o=qr|invite` دخول عبر QR/Invite
- APIs (ملخص): `/api/service/[slug]`, `/api/service/[slug]/reviews`, `/api/reviews` (POST), `/api/reviews/[id]/reply`, `/api/reviews/[id]/vote`, `/api/reviews/[id]/flag`, `/api/upload`

## Public Service Page
### Hero
- شعار + اسم + Verified badge + فئات + موقع/سوشيال.
- بطاقة Trust: متوسط النجوم، عدد المراجعات، R‑Score، histogram، channel mix.
- CTA: **Write a review** (+ تمرير token إن وجد).

### Filters
- نجوم، بميديا، ردّ المالك، المصدر (QR/Invite/Organic)، بلد/مدينة، والفرز (أحدث/أعلى/أدنى/الأكثر فائدة).

### Reviews Feed
- ReviewCard: نجوم، عنوان/نص، تاريخ الزيارة/النشر، شارات Verified، ميديا، Owner reply، أزرار Helpful/Report.

### Transparency Panel
- من `service_transparency_v`: R‑Score، d30/d365، qr_share/invite_share، flagged_ratio.
- نافذة "كيف نحسب R‑Score" (صيغة Bayesian + انحلال زمني).

### About / Locations / Media
- About: bio من `services.meta_json.about_html`, روابط, cover.
- Locations: Grid للفروع + خريطة مصغّرة.
- Media: معرض `review_media` وصور الخدمة (لاحقًا).

## Write a Review
- الخطوات: Rating → Content → Media → Submit.
- يدعم QR/Invite عبر `session_token` الذي يُربط بـ `review_verifications.session_id`.
- إدراج في `reviews` (pending) و`review_media`، ثم إعادة توجيه إلى صفحة الخدمة.

## Owner Replies / Helpful / Reporting
- `review_replies` لردّ واحد قابل للتحديث من مالك/مدير الخدمة.
- `review_votes` helpful/not_helpful (فريد لكل مستخدم).
- الإبلاغ عبر `review_flags` مع أسباب قياسية.

## SEO & Performance & A11y
- JSON‑LD `AggregateRating`, SSR/Streaming, صور محسّنة, `dir="auto"` للنص المختلط.

## Phased Plan
1) SQL patches (اختياري)
2) APIs
3) صفحة الخدمة (Hero + Transparency + Reviews)
4) كتابة المراجعة
5) الردود + التصويت
6) تحسينات SEO/Histogram/Channel mix/Media
