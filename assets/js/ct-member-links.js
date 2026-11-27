/* The Curl Tapes — member links: two fixed corner buttons. Isolated; never throws. */
(function () {
  try {
    var LINKS = [
      { label: "Blake's Website", href: "https://blakezuniga.com", title: "Blake Zuniga's website" },
      { label: "Coleman's Website", href: "https://www.facebook.com/colemanmartinmusic/" }
    ];
    function init() {
      try {
        if (document.getElementById("ct-member-links")) return;
        var nav = document.createElement("nav");
        nav.id = "ct-member-links";
        nav.className = "ct-member-links";
        nav.setAttribute("aria-label", "Member websites");
        LINKS.forEach(function (l) {
          var a = document.createElement("a");
          a.href = l.href;
          a.textContent = l.label;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          if (l.title) a.title = l.title;
          nav.appendChild(a);
        });
        document.body.appendChild(nav);
      } catch (e) { /* ignore */ }
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  } catch (e) { /* never break the page */ }
})();
