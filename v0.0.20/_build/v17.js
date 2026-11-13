  /* ================= v0.0.17（#56，refs #23）：宽屏入口两栏（手机不变）；去掉重复副标题 ================= */
  /* 说想法这一屏：把「打字 / 例子 / 说明 / 更多 / 回去」收进右栏，问句和按住说话留在左栏。
     手机上两栏容器是 display: contents，顺序和原来一样 */
  function splitIdea() {
    var s = $("s-pick"), B = $("b-pick");
    if (!s || !B || !s.classList.contains("idea") || B.querySelector(".pk-l")) return;
    var right = [$("vz-type"), $("pk-exchips"), B.querySelector(".netline"), $("pk-more"), $("pk-back")].filter(Boolean);
    var L = document.createElement("div"), R = document.createElement("div");
    L.className = "pk-l"; R.className = "pk-r";
    [].slice.call(B.childNodes).forEach(function (n) { if (right.indexOf(n) < 0) L.appendChild(n); });
    right.forEach(function (n) { R.appendChild(n); });
    B.appendChild(L); B.appendChild(R);
  }
  renderPick = (function (orig) {
    return function () { var r = orig.apply(this, arguments); splitIdea(); return r; };
  })(renderPick);
