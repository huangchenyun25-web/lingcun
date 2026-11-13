/* 行动前提。只核对声明过的条件能不能在当前自述里对上。
   对得上原句也不等于读懂了整句话。未知既不是有，也不是没有。 */
var LingcunPremises = (function () {
  var VAGUE = { "有": 1, "的": 1, "了": 1, "我": 1, "你": 1, "要": 1, "用": 1, "把": 1, "在": 1, "和": 1, "或": 1, "是": 1, "这": 1, "那": 1 };
  function viewOf(state) { return LingcunUserState.view(state); }
  function isDenial(text) {
    var t = String(text || "").replace(/^(也|还|又|而且|并且|但是|但|就)/, "");
    return /^(我|你)?(没有|没法|不能|不用|别|不要|不想|不愿|并非|不是|没)/.test(t) || /为0|是0/.test(t);
  }
  function denialCore(text) {
    var t = String(text || "").replace(/^(也|还|又|而且|并且|但是|但|就)/, "");
    var m = t.match(/^(?:我|你)?(?:真的|其实|确认)?(?:没有|没法|不能用|不能|不用|别用|别|不要|不想|不愿|并非|不是|没)(.+)$/);
    if (m) return m[1].replace(/[了的吗呢啊吧]/g, "").trim();
    var z = t.match(/^(.+?)(?:为0|是0)$/);
    return z ? z[1].replace(/[了的吗呢啊吧]/g, "").trim() : "";
  }
  function usable(resource) {
    var r = String(resource || "").trim();
    if (!r || VAGUE[r]) return "";
    return r;
  }
  function bucketOf(view, id) {
    var keys = ["facts", "constraints", "intents", "inferences"], i, j;
    for (i = 0; i < keys.length; i++) for (j = 0; j < view[keys[i]].length; j++) if (view[keys[i]][j].id === id) return { key: keys[i], item: view[keys[i]][j] };
    for (i = 0; i < view.history.length; i++) if (view.history[i].id === id) return { key: "history", item: view.history[i] };
    return null;
  }
  function external(item) {
    if (!item) return false;
    var s = item.sourceId || "";
    return s === "research" || s === "ref" || s === "pool" || item.external === true || item.bucket === "research";
  }
  function affirms(item, resource) {
    if (!item || external(item)) return false;
    if (item.bucket !== "fact" && item.bucket !== "constraint") return false;
    if (item.status && item.status !== "current") return false;
    if (String(item.text || "").indexOf(resource) < 0) return false;
    if (isDenial(item.text)) return false;
    return true;
  }
  function denies(item, resource) {
    if (!item || external(item)) return false;
    if (item.status && item.status !== "current") return false;
    if ((item.bucket !== "constraint" && !(item.bucket === "intent" && item.polarity === "dont")) ) return false;
    if (!isDenial(item.text)) return false;
    if (String(item.text).indexOf(resource) < 0) return false;
    var core = denialCore(item.text);
    return !core || core.indexOf(resource) >= 0 || resource.indexOf(core) >= 0;
  }
  function citeOf(view, id) {
    if (!id) return { id: "", ok: false, reason: "没有指向当前原话" };
    var found = bucketOf(view, id);
    if (!found) return { id: id, ok: false, reason: "当前记录里没有这条" };
    if (found.key === "history") return { id: id, ok: false, text: found.item.text, bucket: "history", reason: "这是旧版本，不能当作现在的条件" };
    if (found.key === "inferences" || found.item.status === "unconfirmed") return { id: id, ok: false, text: found.item.text, bucket: "inference", reason: "这还是待确认推测，不是自述" };
    if (external(found.item)) return { id: id, ok: false, text: found.item.text, bucket: "research", reason: "研究或案例不是这个人的条件" };
    if (found.key !== "facts" && found.key !== "constraints" && found.key !== "intents") return { id: id, ok: false, text: found.item.text, reason: "不是当前自述" };
    return { id: id, ok: true, text: found.item.text, bucket: found.key, rev: found.item.rev };
  }
  function checkNeed(view, need) {
    var resource = usable(need && need.resource);
    var key = !need || need.key !== false;
    var claim = need && need.claim || "";
    var base = { resource: resource || String(need && need.resource || ""), key: key, claim: claim, evidenceId: "", evidenceText: "", evidenceBucket: "", evidenceRev: 0 };
    if (!resource) {
      base.status = "unknown";
      base.reason = "这个前提太笼统，对不上具体原话";
      return base;
    }
    var cited = need && need.evidenceId ? citeOf(view, need.evidenceId) : null;
    var i, affirmed = null, denied = null;
    var pool = view.facts.concat(view.constraints, view.intents);
    for (i = 0; i < pool.length; i++) {
      if (!denied && denies(pool[i], resource)) denied = pool[i];
      if (!affirmed && affirms(pool[i], resource)) affirmed = pool[i];
    }
    if (affirmed && denied) {
      base.status = "conflict";
      base.evidenceId = affirmed.id;
      base.evidenceText = affirmed.text;
      base.evidenceBucket = affirmed.bucket;
      base.evidenceRev = affirmed.rev;
      base.reason = "原话里既有「" + affirmed.text + "」，也有「" + denied.text + "」，没有替你选";
      return base;
    }
    if (denied) {
      base.status = "denied";
      base.evidenceId = denied.id;
      base.evidenceText = denied.text;
      base.evidenceBucket = denied.bucket;
      base.evidenceRev = denied.rev;
      base.reason = "当前原话限制了「" + resource + "」";
      return base;
    }
    if (affirmed) {
      base.status = "met";
      base.evidenceId = affirmed.id;
      base.evidenceText = affirmed.text;
      base.evidenceBucket = affirmed.bucket;
      base.evidenceRev = affirmed.rev;
      base.reason = cited && cited.id !== affirmed.id ? "声称的那条对不上，改对上了当前自述「" + affirmed.text + "」" : "对上当前自述「" + affirmed.text + "」";
      return base;
    }
    if (cited && !cited.ok) {
      base.status = "invalid";
      base.evidenceId = need.evidenceId;
      base.evidenceText = cited.text || "";
      base.evidenceBucket = cited.bucket || "";
      base.reason = cited.reason;
      return base;
    }
    if (cited && cited.ok) {
      base.status = "invalid";
      base.evidenceId = need.evidenceId;
      base.evidenceText = cited.text || "";
      base.evidenceBucket = cited.bucket || "";
      base.reason = "指向的原话没有说有「" + resource + "」";
      return base;
    }
    var weak = view.inferences.concat(view.history).filter(function (item) { return String(item.text || "").indexOf(resource) >= 0; })[0];
    base.status = "unknown";
    if (weak) {
      base.status = "invalid";
      base.evidenceId = weak.id || "";
      base.evidenceText = weak.text;
      base.evidenceBucket = weak.status === "current" ? "inference" : (weak.status || "history");
      base.reason = weak.status === "current" ? "只有待确认推测提到「" + resource + "」，不能当成已经有" : "只有旧版本提到「" + resource + "」，不能当成现在有";
      return base;
    }
    base.reason = claim === "have" ? "声称已有「" + resource + "」，但当前原话里没有" : "当前原话没说有没有「" + resource + "」";
    return base;
  }
  function implicitDenials(view, text) {
    var out = [], seen = {};
    view.constraints.concat(view.intents).forEach(function (item) {
      if (!isDenial(item.text) || external(item)) return;
      var core = usable(denialCore(item.text));
      if (!core || seen[core]) return;
      if (String(text || "").indexOf(core) < 0) return;
      seen[core] = 1;
      out.push({ resource: core, key: true, from: item.id, evidenceText: item.text });
    });
    return out;
  }
  function uncheckedLimits(view, text, needs) {
    var named = {};
    (needs || []).forEach(function (n) { if (n.resource) named[n.resource] = 1; });
    var out = [];
    view.constraints.concat(view.intents).forEach(function (item) {
      if (!isDenial(item.text)) return;
      var core = denialCore(item.text);
      if (!core) return;
      if (String(text || "").indexOf(core) >= 0) return;
      if (named[core]) return;
      out.push(item.text);
    });
    return out;
  }
  function quoteFrom(view) {
    var i;
    for (i = 0; i < view.intents.length; i++) if (view.intents[i].polarity === "want" && !isDenial(view.intents[i].text)) return view.intents[i].text;
    for (i = 0; i < view.facts.length; i++) if (!isDenial(view.facts[i].text)) return view.facts[i].text;
    return "";
  }
  function alternativeFor(view, resource) {
    var quote = quoteFrom(view);
    var text = quote ? ("先不做还要额外条件的那一步。只留下原话「" + quote + "」，改成你确定做得到的事。") : "先不做还要额外条件的那一步。改成你确定做得到的事。";
    return {
      text: text,
      action: text,
      author: "premise-alt",
      needs: [],
      avoids: resource,
      verdict: "show",
      verified: false,
      note: "这条替代不依赖还没确认的条件。程序没有把它核对成已经可行。"
    };
  }
  function review(state, candidate) {
    var view = viewOf(state);
    var action = String(candidate && candidate.text || "");
    var author = candidate && candidate.author || "candidate";
    var declared = (candidate && candidate.needs || []).map(function (n) { return checkNeed(view, n); });
    var declaredName = {};
    declared.forEach(function (n) { declaredName[n.resource] = 1; });
    if (!candidate || !candidate.exempt) {
      implicitDenials(view, action).forEach(function (imp) {
        if (declaredName[imp.resource]) return;
        var row = checkNeed(view, { resource: imp.resource, key: true });
        if (row.status !== "denied" && row.status !== "conflict") {
          row.status = "denied";
          row.evidenceText = imp.evidenceText;
          row.evidenceId = imp.from;
          row.reason = "做法里用到了你限制过的「" + imp.resource + "」";
        }
        declared.push(row);
      });
    }
    var cites = (candidate && candidate.uses || []).map(function (id) { return citeOf(view, id); });
    (candidate && candidate.research || []).forEach(function (r) {
      cites.push({ id: r && (r.id || r) || "research", ok: false, bucket: "research", text: r && r.text || "", reason: "研究或案例不是这个人的条件" });
    });
    var limits = uncheckedLimits(view, action, declared);
    var denied = declared.filter(function (n) { return n.key && (n.status === "denied" || n.status === "conflict"); });
    var unknown = declared.filter(function (n) { return n.key && (n.status === "unknown" || n.status === "invalid"); });
    var badCites = cites.length && cites.every(function (c) { return !c.ok; });
    var verdict = "show";
    var question = "";
    var alternative = null;
    var note = "";
    if (author === "user") {
      note = "这是你写的，没有改写。";
      if (denied.length) note += "它碰到了你写过的限制，还不能当成已经可行。";
      else if (unknown.length) note += "有条件还没在当前原话里确认。";
      else note += "程序没有把它核对成已经可行。";
      verdict = denied.length ? "revise" : (unknown.length ? "clarify" : "show");
      if (unknown.length) question = "你写的这一步要有「" + unknown[0].resource + "」。你现在有吗？没有就可以改一句。";
      alternative = (denied.length || unknown.length) ? alternativeFor(view, (denied[0] || unknown[0]).resource) : null;
    } else if (denied.length || badCites) {
      verdict = "revise";
      var why = denied[0] ? denied[0].reason : "依据的不是当前自述";
      note = "这条先不拿来做。" + why;
      alternative = alternativeFor(view, denied[0] ? denied[0].resource : "");
    } else if (unknown.length) {
      verdict = "clarify";
      question = "这一步要有「" + unknown[0].resource + "」。你现在的原话里还没有。你有，还是先换一条不靠它的做法？";
      note = "只问这一处。其他没写进原话的生活细节没有追问。";
      alternative = alternativeFor(view, unknown[0].resource);
    } else if (!declared.length) {
      note = "这条没有声明要额外的东西。程序只核对了声明和你已经写明的限制，没有读懂整句话。";
      if (limits.length) note += "还没能确定它是否碰到「" + limits[0] + "」。";
    } else {
      note = "声明的前提都能对上当前自述。这只说明这些条件有原话，不是整句都读懂了。";
    }
    var verified = author !== "user" && verdict === "show" && declared.length > 0 && declared.every(function (n) { return !n.key || n.status === "met"; }) && !badCites;
    return {
      action: action,
      author: author,
      needs: declared,
      cites: cites,
      uncheckedLimits: limits,
      verdict: verdict,
      question: author === "user" ? question : question,
      alternative: alternative,
      verified: !!verified,
      userOwned: author === "user",
      note: note,
      inputRev: state.inputRev
    };
  }
  function settle(state, candidates) {
    var results = (candidates || []).map(function (c) { return review(state, c); });
    var shown = results.filter(function (r) { return r.verdict === "show" && r.author !== "user"; });
    var clarify = results.filter(function (r) { return r.verdict === "clarify"; })[0] || null;
    var revise = results.filter(function (r) { return r.verdict === "revise"; })[0] || null;
    var verdict = "show", display = null, question = "", alternative = null;
    if (shown.length) {
      display = shown[0];
      verdict = "show";
    } else if (clarify) {
      display = clarify.alternative;
      verdict = "clarify";
      question = clarify.question;
      alternative = clarify.alternative;
    } else if (revise) {
      display = revise.alternative;
      verdict = "revise";
      alternative = revise.alternative;
    }
    return {
      inputRev: state.inputRev,
      results: results,
      verdict: verdict,
      display: display,
      question: question,
      alternative: alternative,
      verified: !!(display && display.verified),
      pending: verdict !== "show",
      skipped: false
    };
  }
  function answer(state, candidates, text) {
    LingcunUserState.addUtterance(state, text, "premise");
    return settle(state, candidates);
  }
  return { review: review, settle: settle, answer: answer, isDenial: isDenial };
})();
