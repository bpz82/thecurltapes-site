/* Site configuration — edit these values, no build step needed. */
window.CT_CONFIG = {
  // Shown in every "it didn't work" fallback and used for mailto links.
  email: 'thecurltapes@gmail.com',

  // Form endpoints. Posts go to the Netlify functions (pages are on GitHub
  // Pages). If a request fails, the page falls back to a mailto link.
  endpoints: {
    subscribe: 'https://thecurltapes.netlify.app/api/subscribe',
    contact: 'https://thecurltapes.netlify.app/api/contact',
    order: 'https://thecurltapes.netlify.app/api/order'
  },

  store: {
    // Optional Stripe Payment Links, keyed by product id (the last part of the product URL).
    // When a link is set, "Checkout" sends the buyer to Stripe. When empty, checkout sends an
    // order request (names, email, quantity) to Blake & Coleman instead — no card is charged.
    paymentLinks: {
      'the-curl-tapes-and-friends-sparrow-nest-theater': ''
    }
  },

  // Google Tag Manager container that the live Squarespace site loads on every page.
  // Set to '' to turn analytics/tracking off.
  gtmId: 'GTM-PMH3HDKV'
};
