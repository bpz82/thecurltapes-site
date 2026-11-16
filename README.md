# thecurltapes-site
Public site for thecurltapes.com, served with GitHub Pages and HTTPS.
Contact, newsletter, and order forms POST to the Netlify functions at
https://thecurltapes.netlify.app/api/contact, /api/order, and /api/subscribe;
if a request fails, the page falls back to a mailto link. See DOMAIN.md for rollback.
