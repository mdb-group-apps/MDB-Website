// Search field of the page «Countries»: hides the rows whose country name (English or German) or code does not match.
(function () {
  function run() {
    var input = document.getElementById("csearch"), count = document.getElementById("ccount");
    if (!input) return;
    var rows = [].slice.call(document.querySelectorAll(".ctab tbody tr"));
    function filter() {
      var q = input.value.trim().toLowerCase(), shown = 0;
      rows.forEach(function (r) {
        var hit = !q || r.firstElementChild.textContent.toLowerCase().indexOf(q) >= 0;
        r.hidden = !hit;
        if (hit) shown++;
      });
      count.textContent = q ? shown + " / " + rows.length : "";
    }
    input.addEventListener("input", filter);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
