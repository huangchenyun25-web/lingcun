/* 用户信息只有这一份。事实只表示用户自己说了，不是外部核实。
   连续原文是必要的，不能单独证明类别对。这里的分类是句子形式上的整理，不是模型理解。 */
var LingcunUserState = (function () {
  function splitClauses(text) {
    var src = String(text || "");
    var re = /[^，。！？、；,.\n!?;:：]+/g;
    var m, out = [];
    while ((m = re.exec(src))) {
      var lead = m[0].match(/^\s*/)[0].length;
      var raw = m[0].trim();
      if (raw.length < 2) continue;
      out.push({ text: raw, start: m.index + lead, end: m.index + lead + raw.length });
    }
    return out;
  }
  function frameOf(text) {
    var t = String(text || "").replace(/^(也|还|而且|并且|就)/, "");
    if (/^(如果|假如|要是|万一|倘若)/.test(t)) return "hypothesis";
    if (/(他说|她说|他们说|人家说|大家都说|有人说|听说|据说)/.test(t) && !/我说|我想|我希望|我愿意/.test(t)) return "reported";
    if (/上次|以前说|原本|当时说/.test(t)) return "earlier";
    if (/现在发现|其实只|其实是|^现在/.test(t)) return "now";
    if (/不是我|并非我|并不是|没有做过|不是做过|别把/.test(t)) return "negation";
    if (/不想|不愿|不要|别再|^别/.test(t)) return "dont";
    if (/不确定|不知道要不要/.test(t)) return "unsure";
    if (/想|希望|愿意|喜欢|只想|都要/.test(t)) return "want";
    if (/不能|没法|没有|只剩|为0|预算|够/.test(t)) return "constraint";
    return "fact";
  }
  function stem(text) {
    return String(text || "").replace(/^(也|还|但是|但|而且|并且|就|我|你)/, "").replace(/确认|真的|其实/g, "").replace(/不想|不愿|不要|别再|别|想|希望|愿意|喜欢|只想/g, "").replace(/[了的吗呢啊吧]/g, "");
  }
  function item(partial) {
    return {
      id: partial.id,
      rev: partial.rev,
      sourceId: partial.sourceId,
      text: partial.text,
      start: partial.start,
      end: partial.end,
      bucket: partial.bucket,
      polarity: partial.polarity || "",
      status: partial.status || "current",
      confirmed: !!partial.confirmed
    };
  }
  function classify(clause, rev, sourceId, n) {
    var frame = frameOf(clause.text);
    var base = { id: "r" + rev + "-" + n, rev: rev, sourceId: sourceId, text: clause.text, start: clause.start, end: clause.end };
    if (frame === "hypothesis" || frame === "reported") {
      return item(Object.assign(base, { bucket: "inference", polarity: frame, status: "unconfirmed" }));
    }
    if (frame === "dont") return item(Object.assign(base, { bucket: "intent", polarity: "dont" }));
    if (frame === "unsure") return item(Object.assign(base, { bucket: "intent", polarity: "unsure" }));
    if (frame === "want" || frame === "now") return item(Object.assign(base, { bucket: "intent", polarity: "want" }));
    if (frame === "earlier") return item(Object.assign(base, { bucket: "intent", polarity: "want", status: "earlier" }));
    if (frame === "negation") return item(Object.assign(base, { bucket: "constraint", polarity: "stated" }));
    if (frame === "constraint") return item(Object.assign(base, { bucket: "constraint", polarity: "stated" }));
    return item(Object.assign(base, { bucket: "fact", polarity: "stated" }));
  }
  function contradictions(intents) {
    var out = [], i, j;
    for (i = 0; i < intents.length; i++) for (j = i + 1; j < intents.length; j++) {
      var a = intents[i], b = intents[j];
      if (a.polarity === b.polarity) continue;
      var sa = stem(a.text), sb = stem(b.text);
      if (sa && sb && (sa.indexOf(sb) >= 0 || sb.indexOf(sa) >= 0) && sa.length >= 2 && sb.length >= 2) out.push({ ids: [a.id, b.id], note: "两边都还在，没有替你选" });
    }
    return out;
  }
  function blankHistory() { return { facts: [], constraints: [], intents: [], inferences: [] }; }
  function ingest(text, sourceId) {
    var clauses = splitClauses(text);
    var made = clauses.map(function (c, i) { return classify(c, 1, sourceId || "idea", i + 1); });
    var hasNow = made.some(function (x) { return frameOf(x.text) === "now"; });
    var current = blankHistory();
    var history = [];
    made.forEach(function (x) {
      if (x.status === "earlier" && hasNow) {
        x.status = "superseded";
        x.supersededAtRev = 1;
        history.push(x);
        return;
      }
      if (x.status === "earlier") x.status = "current";
      if (x.bucket === "inference") current.inferences.push(x);
      else if (x.bucket === "intent") current.intents.push(x);
      else if (x.bucket === "constraint") current.constraints.push(x);
      else current.facts.push(x);
    });
    var state = {
      inputRev: 1,
      sourceId: sourceId || "idea",
      text: String(text || ""),
      current: current,
      history: history,
      contradictions: contradictions(current.intents),
      unknowns: [],
      lateRejected: []
    };
    return state;
  }
  function snapshotCurrent(state, rev) {
    ["facts", "constraints", "intents", "inferences"].forEach(function (k) {
      (state.current[k] || []).forEach(function (x) {
        var copy = {};
        for (var p in x) copy[p] = x[p];
        copy.status = "superseded";
        copy.supersededAtRev = rev;
        state.history.push(copy);
      });
    });
  }
  function retag(x, rev) {
    x.rev = rev;
    x.id = "r" + rev + "-" + String(x.id).split("-").pop();
    if (x.supersededAtRev) x.supersededAtRev = rev;
  }
  function replaceSource(state, text, sourceId) {
    var next = ingest(text, sourceId || state.sourceId || "idea");
    var rev = (state.inputRev || 1) + 1;
    snapshotCurrent(state, rev);
    next.inputRev = rev;
    ["facts", "constraints", "intents", "inferences"].forEach(function (k) { next.current[k].forEach(function (x) { retag(x, rev); }); });
    next.history.forEach(function (x) { retag(x, rev); });
    next.history = state.history.concat(next.history);
    next.lateRejected = (state.lateRejected || []).slice();
    next.contradictions = contradictions(next.current.intents);
    return next;
  }
  function addUtterance(state, text, sourceId) {
    var t = String(text || "").trim();
    if (!t) return state;
    var rev = state.inputRev;
    var exists = allCurrent(state).some(function (x) { return x.text === t; });
    if (exists) return state;
    var made = classify({ text: t, start: -1, end: -1 }, rev, sourceId || "added", allCurrent(state).length + 1);
    made.start = -1;
    made.end = -1;
    made.evidence = t;
    if (made.bucket === "inference") state.current.inferences.push(made);
    else if (made.bucket === "intent") state.current.intents.push(made);
    else if (made.bucket === "constraint") state.current.constraints.push(made);
    else state.current.facts.push(made);
    state.contradictions = contradictions(state.current.intents);
    return state;
  }
  function allCurrent(state) {
    var c = state.current;
    return c.facts.concat(c.constraints, c.intents, c.inferences);
  }
  function findCurrent(state, id) {
    var keys = ["facts", "constraints", "intents", "inferences"], i, j;
    for (i = 0; i < keys.length; i++) for (j = 0; j < state.current[keys[i]].length; j++) if (state.current[keys[i]][j].id === id) return { key: keys[i], index: j, item: state.current[keys[i]][j] };
    return null;
  }
  function confirm(state, id) {
    var found = findCurrent(state, id);
    if (!found || found.key !== "inferences") return state;
    var it = found.item;
    state.current.inferences.splice(found.index, 1);
    it.confirmed = true;
    it.status = "current";
    var again = frameOf(it.text);
    if (again === "want" || again === "dont" || again === "unsure" || again === "now") {
      it.bucket = "intent";
      it.polarity = again === "dont" ? "dont" : again === "unsure" ? "unsure" : "want";
      state.current.intents.push(it);
    } else if (again === "constraint" || again === "negation") {
      it.bucket = "constraint";
      state.current.constraints.push(it);
    } else {
      it.bucket = "fact";
      state.current.facts.push(it);
    }
    state.contradictions = contradictions(state.current.intents);
    return state;
  }
  function withdraw(state, id) {
    var found = findCurrent(state, id);
    if (!found) return state;
    var it = state.current[found.key].splice(found.index, 1)[0];
    it.status = "withdrawn";
    it.withdrawnAtRev = state.inputRev;
    state.history.push(it);
    state.contradictions = contradictions(state.current.intents);
    return state;
  }
  function acceptLate(state, rev, items) {
    if (rev !== state.inputRev) {
      state.lateRejected.push({ rev: rev, at: state.inputRev, items: items || [] });
      return false;
    }
    return true;
  }
  function stickers(state) {
    return state.current.facts.concat(state.current.constraints, state.current.intents).slice().sort(function (a, b) {
      var pa = a.start < 0 ? 1000000 : a.start, pb = b.start < 0 ? 1000000 : b.start;
      return pa - pb;
    }).map(function (x) { return x.text; });
  }
  function view(state) {
    return {
      inputRev: state.inputRev,
      facts: state.current.facts.map(copyItem),
      constraints: state.current.constraints.map(copyItem),
      intents: state.current.intents.map(copyItem),
      inferences: state.current.inferences.map(copyItem),
      history: state.history.map(copyItem),
      contradictions: state.contradictions.map(function (c) { return { ids: c.ids.slice(), note: c.note }; }),
      unknowns: []
    };
  }
  function copyItem(x) {
    var o = {};
    for (var k in x) o[k] = x[k];
    return o;
  }
  function migrate(project) {
    var idea = project && project.idea || "";
    return ingest(idea, "idea");
  }
  function refuseExternal(state) { return state; }
  return {
    ingest: ingest,
    replaceSource: replaceSource,
    addUtterance: addUtterance,
    confirm: confirm,
    withdraw: withdraw,
    acceptLate: acceptLate,
    stickers: stickers,
    view: view,
    migrate: migrate,
    refuseExternal: refuseExternal,
    frameOf: frameOf
  };
})();
