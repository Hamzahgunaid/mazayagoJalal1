# Policies Module

## Apply the migration
- Run: `psql "$DATABASE_URL" -f sql/20260110_create_data_deletion_requests.sql`
- Verify: `SELECT * FROM public.data_deletion_requests LIMIT 1;`

## Meta App Review links
- Policies hub: https://www.mazayago.com/policies
- Privacy: https://www.mazayago.com/privacy
- Terms: https://www.mazayago.com/terms
- Data deletion: https://www.mazayago.com/data-deletion
- Cookie policy: https://www.mazayago.com/cookie-policy
- Contact: https://www.mazayago.com/contact
